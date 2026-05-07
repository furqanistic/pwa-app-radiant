// client/src/pages/Management/SessionTrackerPage.jsx
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import Layout from '@/pages/Layout/Layout'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Edit3,
  Minus,
  Package,
  Plus,
  Save,
  Search,
  Star,
  Users,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

// Mock data - replace with actual API calls
const mockSessionData = [
  {
    id: '1',
    clientId: 'user1',
    clientName: 'Sarah Johnson',
    clientEmail: 'sarah.johnson@email.com',
    packageName: 'Microneedling Package',
    totalSessions: 6,
    usedSessions: 2,
    remainingSessions: 4,
    packageType: 'facial',
    purchaseDate: '2024-01-15',
    expiryDate: '2024-07-15',
    lastVisit: '2024-02-10',
    status: 'active',
    bonusPoints: 0,
  },
  {
    id: '2',
    clientId: 'user2',
    clientName: 'Emma Davis',
    clientEmail: 'emma.davis@email.com',
    packageName: 'HydraFacial Deluxe',
    totalSessions: 4,
    usedSessions: 4,
    remainingSessions: 0,
    packageType: 'facial',
    purchaseDate: '2024-01-20',
    expiryDate: '2024-06-20',
    lastVisit: '2024-03-01',
    status: 'completed',
    bonusPoints: 150,
  },
  {
    id: '3',
    clientId: 'user3',
    clientName: 'Rachel Green',
    clientEmail: 'rachel.green@email.com',
    packageName: 'Laser Hair Removal',
    totalSessions: 8,
    usedSessions: 3,
    remainingSessions: 5,
    packageType: 'laser',
    purchaseDate: '2024-02-01',
    expiryDate: '2024-12-01',
    lastVisit: '2024-02-28',
    status: 'active',
    bonusPoints: 0,
  },
]

const packageTypes = [
  { value: 'facial', label: 'Facial Treatments' },
  { value: 'laser', label: 'Laser Treatments' },
  { value: 'injectables', label: 'Injectables' },
  { value: 'body', label: 'Body Treatments' },
  { value: 'wellness', label: 'Wellness' },
]

const UserAvatar = ({ name, className = '' }) => {
  const initials = name?.substring(0, 2)?.toUpperCase() || '??'

  return (
    <div
      className={`w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm ${className}`}
    >
      {initials}
    </div>
  )
}

const AddPackageDialog = ({ isOpen, onClose, users, onAdd }) => {
  const [formData, setFormData] = useState({
    clientId: '',
    packageName: '',
    totalSessions: '',
    packageType: '',
    expiryMonths: '6',
  })

  const handleSubmit = () => {
    if (!formData.clientId || !formData.packageName || !formData.totalSessions)
      return

    const selectedUser = users.find((u) => u._id === formData.clientId)
    const newPackage = {
      id: Date.now().toString(),
      clientId: formData.clientId,
      clientName: selectedUser?.name || '',
      clientEmail: selectedUser?.email || '',
      packageName: formData.packageName,
      totalSessions: parseInt(formData.totalSessions),
      usedSessions: 0,
      remainingSessions: parseInt(formData.totalSessions),
      packageType: formData.packageType,
      purchaseDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(
        Date.now() + parseInt(formData.expiryMonths) * 30 * 24 * 60 * 60 * 1000
      )
        .toISOString()
        .split('T')[0],
      lastVisit: null,
      status: 'active',
      bonusPoints: 0,
    }

    onAdd(newPackage)
    setFormData({
      clientId: '',
      packageName: '',
      totalSessions: '',
      packageType: '',
      expiryMonths: '6',
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='w-[95vw] max-w-md mx-auto'>
        <DialogHeader>
          <DialogTitle>Add New Package</DialogTitle>
          <DialogDescription>
            Create a new treatment package for a client
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-4'>
          <div className='space-y-2'>
            <Label>Select Client</Label>
            <Select
              value={formData.clientId}
              onValueChange={(value) =>
                setFormData({ ...formData, clientId: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder='Choose a client' />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user._id} value={user._id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-2'>
            <Label>Package Name</Label>
            <Input
              value={formData.packageName}
              onChange={(e) =>
                setFormData({ ...formData, packageName: e.target.value })
              }
              placeholder='e.g., Microneedling Package'
            />
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-2'>
              <Label>Total Sessions</Label>
              <Input
                type='number'
                value={formData.totalSessions}
                onChange={(e) =>
                  setFormData({ ...formData, totalSessions: e.target.value })
                }
                placeholder='6'
              />
            </div>
            <div className='space-y-2'>
              <Label>Expires In</Label>
              <Select
                value={formData.expiryMonths}
                onValueChange={(value) =>
                  setFormData({ ...formData, expiryMonths: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='3'>3 months</SelectItem>
                  <SelectItem value='6'>6 months</SelectItem>
                  <SelectItem value='12'>12 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='space-y-2'>
            <Label>Treatment Type</Label>
            <Select
              value={formData.packageType}
              onValueChange={(value) =>
                setFormData({ ...formData, packageType: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder='Select treatment type' />
              </SelectTrigger>
              <SelectContent>
                {packageTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className='flex flex-col sm:flex-row gap-2 justify-end'>
          <Button
            variant='outline'
            onClick={onClose}
            className='w-full sm:w-auto'
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className='w-full sm:w-auto bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700'
          >
            Add Package
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const SessionUpdateDialog = ({ session, isOpen, onClose, onUpdate }) => {
  const [action, setAction] = useState('use')
  const [sessionsToUpdate, setSessionsToUpdate] = useState(1)
  const [bonusPoints, setBonusPoints] = useState('')

  const handleSubmit = () => {
    const updateData = {
      action,
      sessions: parseInt(sessionsToUpdate),
      bonusPoints: parseInt(bonusPoints) || 0,
    }

    onUpdate(session.id, updateData)
    onClose()
    setSessionsToUpdate(1)
    setBonusPoints('')
  }

  if (!session) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='w-[95vw] max-w-lg mx-auto'>
        <DialogHeader>
          <DialogTitle className='text-base'>
            Update Sessions - {session.clientName}
          </DialogTitle>
          <DialogDescription>
            {session.packageName} • {session.remainingSessions} sessions
            remaining
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-4'>
          <div className='space-y-2'>
            <Label>Action</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='use'>Mark Session as Used</SelectItem>
                <SelectItem value='add'>Add Bonus Sessions</SelectItem>
                <SelectItem value='remove'>Remove Sessions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-2'>
            <Label>Number of Sessions</Label>
            <div className='flex items-center gap-2'>
              <Button
                size='sm'
                variant='outline'
                onClick={() =>
                  setSessionsToUpdate(Math.max(1, sessionsToUpdate - 1))
                }
                className='h-10 w-10'
              >
                <Minus className='w-4 h-4' />
              </Button>
              <Input
                type='number'
                value={sessionsToUpdate}
                onChange={(e) =>
                  setSessionsToUpdate(
                    Math.max(1, parseInt(e.target.value) || 1)
                  )
                }
                className='text-center h-10'
                min='1'
              />
              <Button
                size='sm'
                variant='outline'
                onClick={() => setSessionsToUpdate(sessionsToUpdate + 1)}
                className='h-10 w-10'
              >
                <Plus className='w-4 h-4' />
              </Button>
            </div>
          </div>

          {action === 'use' && (
            <div className='space-y-2'>
              <Label>Bonus Points (Optional)</Label>
              <Input
                type='number'
                value={bonusPoints}
                onChange={(e) => setBonusPoints(e.target.value)}
                placeholder='0'
              />
            </div>
          )}
        </div>

        <div className='flex flex-col sm:flex-row gap-2 justify-end'>
          <Button
            variant='outline'
            onClick={onClose}
            className='w-full sm:w-auto'
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className='w-full sm:w-auto bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700'
          >
            Update Sessions
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const SessionTrackerPage = ({ users = [] }) => {
  const [sessionData, setSessionData] = useState(mockSessionData)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showUpdateDialog, setShowUpdateDialog] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)

  const filteredSessions = sessionData.filter((session) => {
    const matchesSearch =
      session.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.packageName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus =
      filterStatus === 'all' || session.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const handleAddPackage = (newPackage) => {
    setSessionData((prev) => [...prev, newPackage])
  }

  const handleUpdateSession = (sessionId, updateData) => {
    setSessionData((prev) =>
      prev.map((session) => {
        if (session.id === sessionId) {
          let updatedSession = { ...session }

          if (updateData.action === 'use') {
            updatedSession.usedSessions += updateData.sessions
            updatedSession.remainingSessions = Math.max(
              0,
              updatedSession.remainingSessions - updateData.sessions
            )
            updatedSession.lastVisit = new Date().toISOString().split('T')[0]
            if (updatedSession.remainingSessions === 0) {
              updatedSession.status = 'completed'
            }
          } else if (updateData.action === 'add') {
            updatedSession.totalSessions += updateData.sessions
            updatedSession.remainingSessions += updateData.sessions
            if (updatedSession.status === 'completed') {
              updatedSession.status = 'active'
            }
          } else if (updateData.action === 'remove') {
            updatedSession.remainingSessions = Math.max(
              0,
              updatedSession.remainingSessions - updateData.sessions
            )
            if (updatedSession.remainingSessions === 0) {
              updatedSession.status = 'completed'
            }
          }

          if (updateData.bonusPoints) {
            updatedSession.bonusPoints += updateData.bonusPoints
          }

          return updatedSession
        }
        return session
      })
    )
  }

  const stats = {
    total: sessionData.length,
    active: sessionData.filter((s) => s.status === 'active').length,
    completed: sessionData.filter((s) => s.status === 'completed').length,
    totalSessions: sessionData.reduce((sum, s) => sum + s.totalSessions, 0),
  }

  return (
    <Layout>
      <div className='min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-white p-3 pb-20'>
        {/* Header */}
        <div className='mb-4'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4'>
            <div>
              <h1 className='text-2xl md:text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent'>
                Session Tracker
              </h1>
              <p className='text-gray-600 text-sm md:text-base'>
                Track client packages and treatment progress
              </p>
            </div>
            <Button
              onClick={() => setShowAddDialog(true)}
              className='w-full sm:w-auto bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 h-10'
            >
              <Plus className='w-4 h-4 mr-2' />
              Add Package
            </Button>
          </div>

          {/* Stats Cards - Compact */}
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4'>
            <Card className='border-0 shadow-sm bg-white'>
              <CardContent className='p-3'>
                <div className='flex items-center gap-2'>
                  <Package className='w-5 h-5 text-pink-500' />
                  <div>
                    <p className='text-lg font-bold text-gray-900'>
                      {stats.total}
                    </p>
                    <p className='text-xs text-gray-600'>Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className='border-0 shadow-sm bg-white'>
              <CardContent className='p-3'>
                <div className='flex items-center gap-2'>
                  <CheckCircle className='w-5 h-5 text-green-500' />
                  <div>
                    <p className='text-lg font-bold text-gray-900'>
                      {stats.active}
                    </p>
                    <p className='text-xs text-gray-600'>Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className='border-0 shadow-sm bg-white'>
              <CardContent className='p-3'>
                <div className='flex items-center gap-2'>
                  <AlertCircle className='w-5 h-5 text-gray-500' />
                  <div>
                    <p className='text-lg font-bold text-gray-900'>
                      {stats.completed}
                    </p>
                    <p className='text-xs text-gray-600'>Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className='border-0 shadow-sm bg-white'>
              <CardContent className='p-3'>
                <div className='flex items-center gap-2'>
                  <Calendar className='w-5 h-5 text-purple-500' />
                  <div>
                    <p className='text-lg font-bold text-gray-900'>
                      {stats.totalSessions}
                    </p>
                    <p className='text-xs text-gray-600'>Sessions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Filters - Mobile Responsive */}
        <Card className='border-0 shadow-sm bg-white mb-4'>
          <CardContent className='p-3'>
            <div className='flex flex-col sm:flex-row gap-2'>
              <div className='relative flex-1'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                <Input
                  placeholder='Search clients or packages...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='pl-10 h-10'
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className='w-full sm:w-32 h-10'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Status</SelectItem>
                  <SelectItem value='active'>Active</SelectItem>
                  <SelectItem value='completed'>Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Sessions List - Mobile First Design */}
        <div className='space-y-3'>
          {filteredSessions.map((session) => (
            <Card key={session.id} className='border-0 shadow-sm bg-white'>
              <CardContent className='p-4'>
                {/* Mobile Layout */}
                <div className='block md:hidden'>
                  <div className='flex items-center gap-3 mb-3'>
                    <UserAvatar name={session.clientName} />
                    <div className='flex-1'>
                      <h3 className='font-semibold text-gray-900 text-sm'>
                        {session.clientName}
                      </h3>
                      <p className='text-xs text-gray-600'>
                        {session.packageName}
                      </p>
                    </div>
                    <Badge
                      variant='outline'
                      className={
                        session.status === 'active'
                          ? 'bg-green-100 text-green-800 border-green-200'
                          : 'bg-gray-100 text-gray-800 border-gray-200'
                      }
                    >
                      {session.status}
                    </Badge>
                  </div>

                  <div className='grid grid-cols-2 gap-2 mb-3'>
                    <div className='text-center p-2 bg-purple-50 rounded-lg'>
                      <p className='text-base font-bold text-purple-600'>
                        {session.usedSessions} of {session.totalSessions}
                      </p>
                      <p className='text-xs text-gray-600'>used</p>
                    </div>
                    <div className='text-center p-2 bg-gray-50 rounded-lg'>
                      <p className='text-base font-bold text-gray-900'>
                        {session.remainingSessions}
                      </p>
                      <p className='text-xs text-gray-600'>remaining</p>
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      setSelectedSession(session)
                      setShowUpdateDialog(true)
                    }}
                    className='w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 h-10'
                  >
                    <Edit3 className='w-4 h-4 mr-2' />
                    Update Session
                  </Button>
                </div>

                {/* Desktop Layout */}
                <div className='hidden md:flex items-center justify-between'>
                  <div className='flex items-center gap-4'>
                    <UserAvatar name={session.clientName} />
                    <div>
                      <h3 className='font-semibold text-gray-900'>
                        {session.clientName}
                      </h3>
                      <p className='text-sm text-gray-600'>
                        {session.packageName}
                      </p>
                    </div>
                  </div>

                  <div className='flex items-center gap-6'>
                    <div className='text-center'>
                      <p className='text-base font-bold text-purple-600'>
                        {session.usedSessions} of {session.totalSessions}
                      </p>
                      <p className='text-xs text-gray-500'>sessions used</p>
                    </div>

                    <div className='text-center'>
                      <p className='text-base font-bold text-gray-900'>
                        {session.remainingSessions}
                      </p>
                      <p className='text-xs text-gray-500'>remaining</p>
                    </div>

                    <div className='text-center'>
                      <Badge
                        variant='outline'
                        className={
                          session.status === 'active'
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : 'bg-gray-100 text-gray-800 border-gray-200'
                        }
                      >
                        {session.status}
                      </Badge>
                    </div>

                    <Button
                      size='sm'
                      onClick={() => {
                        setSelectedSession(session)
                        setShowUpdateDialog(true)
                      }}
                      className='bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700'
                    >
                      <Edit3 className='w-4 h-4 mr-2' />
                      Update
                    </Button>
                  </div>
                </div>

                {session.remainingSessions <= 1 &&
                  session.status === 'active' && (
                    <div className='mt-3 p-2 bg-orange-50 border border-orange-200 rounded-lg'>
                      <div className='flex items-start gap-2'>
                        <AlertCircle className='w-4 h-4 text-orange-600 mt-0.5' />
                        <span className='text-xs text-orange-800'>
                          Package almost complete! Consider offering a renewal.
                        </span>
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredSessions.length === 0 && (
          <div className='text-center py-8'>
            <Package className='w-10 h-10 text-gray-400 mx-auto mb-3' />
            <h3 className='text-base font-medium text-gray-900 mb-2'>
              No packages found
            </h3>
            <p className='text-gray-600 mb-4 px-4 text-sm'>
              {searchTerm
                ? 'Try adjusting your search'
                : 'Start by adding a new treatment package'}
            </p>
            <Button
              onClick={() => setShowAddDialog(true)}
              className='w-full max-w-xs bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 h-10'
            >
              <Plus className='w-4 h-4 mr-2' />
              Add Your First Package
            </Button>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <AddPackageDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        users={users}
        onAdd={handleAddPackage}
      />

      <SessionUpdateDialog
        session={selectedSession}
        isOpen={showUpdateDialog}
        onClose={() => {
          setShowUpdateDialog(false)
          setSelectedSession(null)
        }}
        onUpdate={handleUpdateSession}
      />
    </Layout>
  )
}

export default SessionTrackerPage
