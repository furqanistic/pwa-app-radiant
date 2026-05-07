import { EJSON } from 'bson'
import { createGzip } from 'zlib'
import { createWriteStream, promises as fs } from 'fs'
import path from 'path'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SERVER_ROOT = path.join(__dirname, '..')

const SNAPSHOT_PREFIX = 'snapshot-'
const SNAPSHOT_SUFFIX = '.ndjson.gz'

let backupInFlight = false

const getBackupDir = () => {
  const configured = process.env.BACKUP_DIR
  if (configured && path.isAbsolute(configured)) return configured
  if (configured) return path.resolve(SERVER_ROOT, configured)
  return path.join(SERVER_ROOT, 'data', 'backups')
}

const safeSnapshotId = (id) => {
  if (!id || typeof id !== 'string') return null
  const trimmed = id.trim()
  if (trimmed.length > 200) return null
  if (!trimmed.startsWith(SNAPSHOT_PREFIX)) return null
  if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) return null
  if (trimmed.includes('..')) return null
  return trimmed
}

const toSnapshotFilename = (id) => `${id}${SNAPSHOT_SUFFIX}`

export const ensureBackupDir = async () => {
  const dir = getBackupDir()
  await fs.mkdir(dir, { recursive: true })
  return dir
}

const pruneOldBackups = async (dir) => {
  const raw = process.env.BACKUP_KEEP_COUNT
  const keep = raw ? parseInt(raw, 10) : 0
  if (!Number.isFinite(keep) || keep <= 0) return

  const entries = await fs.readdir(dir)
  const snapshots = []
  for (const name of entries) {
    if (!name.startsWith(SNAPSHOT_PREFIX) || !name.endsWith(SNAPSHOT_SUFFIX)) continue
    const full = path.join(dir, name)
    const stat = await fs.stat(full)
    if (!stat.isFile()) continue
    snapshots.push({ name, full, mtime: stat.mtimeMs })
  }
  snapshots.sort((a, b) => b.mtime - a.mtime)
  const toDelete = snapshots.slice(keep)
  for (const item of toDelete) {
    await fs.unlink(item.full).catch(() => {})
  }
}

/**
 * Full logical snapshot of the connected MongoDB database.
 * Format: gzip-compressed NDJSON; BSON types preserved via EJSON.
 */
export const createMongoSnapshot = async () => {
  if (mongoose.connection.readyState !== 1) {
    const err = new Error('Database is not connected')
    err.status = 503
    throw err
  }

  if (backupInFlight) {
    const err = new Error('A backup is already in progress')
    err.status = 409
    throw err
  }
  backupInFlight = true

  let fullPath = ''
  let collectionCount = 0
  let documentCount = 0

  async function* ndjsonLines() {
    const db = mongoose.connection.db
    const dbName = db.databaseName
    const collections = await db.listCollections().toArray()

    yield `${JSON.stringify({
      _backup: 'header',
      version: 1,
      createdAt: new Date().toISOString(),
      database: dbName,
      driver: 'mongoose/mongoBackup',
    })}\n`

    for (const meta of collections) {
      const collName = meta.name
      if (!collName || collName.startsWith('system.')) continue
      if (meta.type === 'view') continue

      collectionCount += 1
      yield `${JSON.stringify({ _backup: 'collection', name: collName })}\n`

      const coll = db.collection(collName)
      const cursor = coll.find({}, { batchSize: 500 })
      for await (const doc of cursor) {
        documentCount += 1
        yield `${JSON.stringify({
          _backup: 'document',
          collection: collName,
          payload: EJSON.serialize(doc),
        })}\n`
      }
    }
  }

  try {
    const dir = await ensureBackupDir()
    const id = `${SNAPSHOT_PREFIX}${new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-')}`
    const filename = toSnapshotFilename(id)
    fullPath = path.join(dir, filename)

    const gzip = createGzip({ level: 6 })
    const fileStream = createWriteStream(fullPath)
    await pipeline(Readable.from(ndjsonLines()), gzip, fileStream)

    const stat = await fs.stat(fullPath)
    await pruneOldBackups(dir)

    return {
      id,
      filename,
      path: fullPath,
      sizeBytes: stat.size,
      collectionCount,
      documentCount,
    }
  } catch (error) {
    if (fullPath) await fs.unlink(fullPath).catch(() => {})
    throw error
  } finally {
    backupInFlight = false
  }
}

export const listMongoSnapshots = async () => {
  const dir = await ensureBackupDir()
  const entries = await fs.readdir(dir)
  const out = []

  for (const name of entries) {
    if (!name.startsWith(SNAPSHOT_PREFIX) || !name.endsWith(SNAPSHOT_SUFFIX)) continue
    const id = name.slice(0, -SNAPSHOT_SUFFIX.length)
    if (!safeSnapshotId(id)) continue
    const full = path.join(dir, name)
    const stat = await fs.stat(full)
    if (!stat.isFile()) continue
    out.push({
      id,
      filename: name,
      sizeBytes: stat.size,
      createdAt: stat.mtime.toISOString(),
    })
  }

  out.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  return out
}

export const resolveSnapshotPath = async (id) => {
  const safeId = safeSnapshotId(id)
  if (!safeId) {
    const err = new Error('Invalid snapshot id')
    err.status = 400
    throw err
  }
  const dir = await ensureBackupDir()
  const fullPath = path.join(dir, toSnapshotFilename(safeId))
  const rel = path.relative(dir, fullPath)
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    const err = new Error('Invalid snapshot path')
    err.status = 400
    throw err
  }
  try {
    await fs.access(fullPath)
    return fullPath
  } catch {
    const err = new Error('Snapshot not found')
    err.status = 404
    throw err
  }
}

export const deleteMongoSnapshot = async (id) => {
  const fullPath = await resolveSnapshotPath(id)
  await fs.unlink(fullPath)
}

/**
 * Called from cron when BACKUP_CRON is set.
 */
export const runScheduledMongoSnapshot = async () => {
  if (mongoose.connection.readyState !== 1) {
    console.warn('[backup] Skipped scheduled snapshot: database not connected')
    return
  }
  const result = await createMongoSnapshot()
  console.log(
    `[backup] Scheduled snapshot ${result.filename} (${result.documentCount} documents, ${result.collectionCount} collections, ${result.sizeBytes} bytes)`
  )
}
