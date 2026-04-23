import express from 'express'
import {
  deleteSnapshot,
  getSnapshotDownload,
  getSnapshots,
  postSnapshot,
} from '../controller/backup.js'
import { restrictTo, verifyToken } from '../middleware/authMiddleware.js'

const router = express.Router()

router.use(verifyToken, restrictTo('super-admin'))

router.post('/snapshots', postSnapshot)
router.get('/snapshots', getSnapshots)
router.get('/snapshots/:id/download', getSnapshotDownload)
router.delete('/snapshots/:id', deleteSnapshot)

export default router
