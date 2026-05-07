import { axiosInstance } from '@/config'

export const backupService = {
  listSnapshots: async () => {
    const response = await axiosInstance.get('/backup/snapshots')
    return response.data
  },

  createSnapshot: async () => {
    const response = await axiosInstance.post('/backup/snapshots')
    return response.data
  },

  deleteSnapshot: async (id) => {
    const response = await axiosInstance.delete(
      `/backup/snapshots/${encodeURIComponent(id)}`
    )
    return response.data
  },

  /** Returns axios response with blob data for manual save */
  downloadSnapshotBlob: async (id) => {
    return axiosInstance.get(
      `/backup/snapshots/${encodeURIComponent(id)}/download`,
      { responseType: 'blob' }
    )
  },
}
