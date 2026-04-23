import { createReadStream } from 'fs'
import { createError } from '../error.js'
import {
  createMongoSnapshot,
  deleteMongoSnapshot,
  listMongoSnapshots,
  resolveSnapshotPath,
} from '../utils/mongoBackup.js'

export const postSnapshot = async (req, res, next) => {
  try {
    const result = await createMongoSnapshot()
    const { path: _path, ...safe } = result
    return res.status(201).json({
      success: true,
      data: safe,
    })
  } catch (error) {
    if (error.status) return next(createError(error.status, error.message))
    console.error('Backup snapshot error:', error)
    return next(createError(500, 'Failed to create database snapshot'))
  }
}

export const getSnapshots = async (req, res, next) => {
  try {
    const snapshots = await listMongoSnapshots()
    return res.json({
      success: true,
      data: { snapshots },
    })
  } catch (error) {
    console.error('List backups error:', error)
    return next(createError(500, 'Failed to list snapshots'))
  }
}

export const getSnapshotDownload = async (req, res, next) => {
  try {
    const { id } = req.params
    const fullPath = await resolveSnapshotPath(id)
    const filename = `${id}.ndjson.gz`
    res.setHeader('Content-Type', 'application/gzip')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    const stream = createReadStream(fullPath)
    stream.on('error', () => next(createError(500, 'Failed to read snapshot file')))
    stream.pipe(res)
  } catch (error) {
    if (error.status) return next(createError(error.status, error.message))
    return next(createError(500, 'Failed to download snapshot'))
  }
}

export const deleteSnapshot = async (req, res, next) => {
  try {
    const { id } = req.params
    await deleteMongoSnapshot(id)
    return res.json({ success: true, message: 'Snapshot deleted' })
  } catch (error) {
    if (error.status) return next(createError(error.status, error.message))
    return next(createError(500, 'Failed to delete snapshot'))
  }
}
