import { useBranding } from '@/context/BrandingContext'
import Layout from '@/pages/Layout/Layout'
import { backupService } from '@/services/backupService'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, ChevronLeft, Database, Download, HardDrive, RefreshCw, Trash2 } from 'lucide-react'
import React from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

const formatBytes = (n) => {
  if (n == null || !Number.isFinite(n)) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

const formatDate = (iso) => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

const adjustHex = (hex, amount) => {
  const cleaned = (hex || '').replace('#', '')
  if (cleaned.length !== 6) return '#be185d'
  const num = parseInt(cleaned, 16)
  const clamp = (value) => Math.max(0, Math.min(255, value))
  const r = clamp((num >> 16) + amount)
  const g = clamp(((num >> 8) & 0xff) + amount)
  const b = clamp((num & 0xff) + amount)
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

const DatabaseBackupsPage = () => {
  const { currentUser } = useSelector((state) => state.user)
  const { branding } = useBranding()
  const queryClient = useQueryClient()
  const brandColor = branding?.themeColor || '#ec4899'
  const brandColorDark = adjustHex(brandColor, -24)

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['database-backups'],
    queryFn: () => backupService.listSnapshots(),
    enabled: currentUser?.role === 'super-admin',
  })

  const snapshots = data?.data?.snapshots || []

  const createMutation = useMutation({
    mutationFn: () => backupService.createSnapshot(),
    onSuccess: (res) => {
      const d = res?.data
      toast.success(
        `Snapshot created (${d?.documentCount ?? 0} documents, ${formatBytes(d?.sizeBytes)})`
      )
      queryClient.invalidateQueries({ queryKey: ['database-backups'] })
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create snapshot')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => backupService.deleteSnapshot(id),
    onSuccess: () => {
      toast.success('Snapshot removed')
      queryClient.invalidateQueries({ queryKey: ['database-backups'] })
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete snapshot')
    },
  })

  const handleDownload = async (id) => {
    try {
      const response = await backupService.downloadSnapshotBlob(id)
      const raw = response.data
      const blob =
        raw instanceof Blob ? raw : new Blob([raw], { type: 'application/gzip' })
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${id}.ndjson.gz`
      anchor.click()
      window.URL.revokeObjectURL(url)
      toast.success('Download started')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Download failed')
    }
  }

  const confirmDelete = (id) => {
    if (!window.confirm(`Delete backup ${id}? This cannot be undone.`)) return
    deleteMutation.mutate(id)
  }

  if (currentUser?.role !== 'super-admin') {
    return (
      <Layout>
        <div className='max-w-3xl mx-auto px-4 py-10'>
          <div className='bg-white border border-red-100 rounded-2xl p-6'>
            <h1 className='text-xl font-bold text-gray-900'>Access denied</h1>
            <p className='text-sm text-gray-600 mt-2'>
              Database backups are only available to super-admin users.
            </p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div
        className='max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-6 space-y-4 md:space-y-6 pb-28 md:pb-6'
        style={{
          ['--brand-primary']: brandColor,
          ['--brand-primary-dark']: brandColorDark,
        }}
      >
        <div
          className='rounded-3xl p-4 md:p-6 text-white shadow-xl'
          style={{
            background: 'linear-gradient(140deg, var(--brand-primary), var(--brand-primary-dark))',
          }}
        >
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
            <div className='flex items-center gap-3'>
              <Link
                to='/management'
                className='h-10 w-10 rounded-xl bg-white/15 border border-white/30 flex items-center justify-center hover:bg-white/20 shrink-0'
                aria-label='Back to management'
              >
                <ChevronLeft className='w-5 h-5' />
              </Link>
              <div className='w-11 h-11 rounded-2xl bg-white/20 border border-white/25 flex items-center justify-center shrink-0'>
                <HardDrive className='w-5 h-5' />
              </div>
              <div>
                <h1 className='text-xl md:text-2xl font-black tracking-tight'>Database backups</h1>
                <p className='text-xs md:text-sm text-white/85'>
                  Full logical snapshots (gzip NDJSON). Super-admin only.
                </p>
              </div>
            </div>
            <div className='flex flex-wrap gap-2'>
              <button
                type='button'
                onClick={() => refetch()}
                className='h-10 px-3 md:px-4 rounded-xl text-xs md:text-sm font-bold bg-white/15 border border-white/30 hover:bg-white/20 flex items-center gap-2'
                disabled={isFetching}
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                type='button'
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className='h-10 px-3 md:px-4 rounded-xl text-xs md:text-sm font-bold bg-white text-gray-900 hover:bg-white/90 flex items-center gap-2 disabled:opacity-60'
              >
                <Archive className='w-4 h-4' />
                {createMutation.isPending ? 'Creating…' : 'Create snapshot'}
              </button>
            </div>
          </div>
        </div>

        <div className='bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 text-sm text-slate-700'>
          <p className='font-semibold text-slate-900 flex items-center gap-2'>
            <Database className='w-4 h-4' />
            How this works
          </p>
          <ul className='mt-2 space-y-1 list-disc list-inside text-slate-600'>
            <li>
              Each snapshot is a compressed export of every collection (MongoDB extended JSON), similar
              in spirit to logical dumps used with <code className='text-xs bg-white px-1 rounded'>mongodump</code>{' '}
              but portable in Node without extra binaries.
            </li>
            <li>
              Optional automation: set <code className='text-xs bg-white px-1 rounded'>BACKUP_CRON</code> and{' '}
              <code className='text-xs bg-white px-1 rounded'>BACKUP_KEEP_COUNT</code> in server environment (see{' '}
              <code className='text-xs bg-white px-1 rounded'>.env.example</code>).
            </li>
            <li>
              On disk, each backup is one <code className='text-xs bg-white px-1 rounded'>.ndjson.gz</code> file (not
              subfolders). By default the server writes under{' '}
              <code className='text-xs bg-white px-1 rounded'>server/data/backups</code>. Set{' '}
              <code className='text-xs bg-white px-1 rounded'>BACKUP_DIR</code> in server{' '}
              <code className='text-xs bg-white px-1 rounded'>.env</code> to use another folder.
            </li>
            <li>Store downloaded files off-server (S3, Drive, etc.) for disaster recovery.</li>
          </ul>
        </div>

        <div className='bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm'>
          <div className='px-4 py-3 border-b border-gray-100 flex items-center justify-between'>
            <span className='text-sm font-bold text-gray-900'>Snapshots on server</span>
            <span className='text-xs text-gray-500'>{snapshots.length} file(s)</span>
          </div>
          <div className='overflow-x-auto'>
            <table className='min-w-full text-sm'>
              <thead>
                <tr className='bg-gray-50 text-left text-xs font-bold uppercase tracking-wide text-gray-500'>
                  <th className='px-4 py-3'>Created</th>
                  <th className='px-4 py-3'>Size</th>
                  <th className='px-4 py-3 text-right'>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={3} className='px-4 py-10 text-center text-gray-500'>
                      Loading snapshots…
                    </td>
                  </tr>
                ) : snapshots.length === 0 ? (
                  <tr>
                    <td colSpan={3} className='px-4 py-10 text-center text-gray-500'>
                      No snapshots yet. Create one to back up your database.
                    </td>
                  </tr>
                ) : (
                  snapshots.map((row) => (
                    <tr key={row.id} className='border-t border-gray-100 hover:bg-gray-50/80'>
                      <td className='px-4 py-3'>
                        <div className='font-medium text-gray-900'>{formatDate(row.createdAt)}</div>
                        <div className='text-xs text-gray-500 font-mono mt-0.5 break-all'>{row.filename}</div>
                      </td>
                      <td className='px-4 py-3 text-gray-700 whitespace-nowrap'>{formatBytes(row.sizeBytes)}</td>
                      <td className='px-4 py-3 text-right whitespace-nowrap'>
                        <button
                          type='button'
                          onClick={() => handleDownload(row.id)}
                          className='inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-blue-700 hover:bg-blue-50 mr-1'
                        >
                          <Download className='w-3.5 h-3.5' />
                          Download
                        </button>
                        <button
                          type='button'
                          onClick={() => confirmDelete(row.id)}
                          disabled={deleteMutation.isPending}
                          className='inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50'
                        >
                          <Trash2 className='w-3.5 h-3.5' />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default DatabaseBackupsPage
