// File: client/src/components/Square/SquareConnect.jsx - Square Connect Integration
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import squareService from '../../services/squareService'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'

const SquareConnect = ({ sharedLocationSquareLinked = false }) => {
  const { currentUser } = useSelector((state) => state.user)
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [accountStatus, setAccountStatus] = useState(null)
  const [handledSquareParams, setHandledSquareParams] = useState(false)
  const isSharedLinkedWithoutOwnAccount =
    sharedLocationSquareLinked && !accountStatus?.connected

  const steps = useMemo(
    () => [
      {
        title: 'Connect Square account',
        description: 'Authorize your Square merchant account for payouts.',
        done: (accountStatus?.connected ?? false) || isSharedLinkedWithoutOwnAccount,
      },
      {
        title: 'Merchant verified',
        description: 'Square confirms merchant profile access permissions.',
        done:
          isSharedLinkedWithoutOwnAccount ||
          Boolean(accountStatus?.account?.merchantId),
      },
      {
        title: 'Accept payments',
        description: 'You can now route payments to your Square merchant account.',
        done:
          isSharedLinkedWithoutOwnAccount ||
          Boolean(accountStatus?.connected && accountStatus?.account?.merchantId),
      },
    ],
    [accountStatus, isSharedLinkedWithoutOwnAccount]
  )

  useEffect(() => {
    fetchAccountStatus()
  }, [])

  useEffect(() => {
    if (handledSquareParams) return

    const squareParam = searchParams.get('square')
    if (!squareParam) return

    setHandledSquareParams(true)

    const handleSquareReturn = async () => {
      if (squareParam === 'success') {
        toast.success('Square connected successfully.')
      } else if (squareParam === 'error') {
        const reason = searchParams.get('reason')
        toast.error(
          reason
            ? `Square connection failed (${reason.replaceAll('_', ' ')})`
            : 'Square connection failed'
        )
      }

      await fetchAccountStatus()

      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('square')
      nextParams.delete('reason')
      setSearchParams(nextParams, { replace: true })
    }

    handleSquareReturn()
  }, [handledSquareParams, searchParams, setSearchParams])

  const fetchAccountStatus = async () => {
    try {
      setChecking(true)
      const data = await squareService.getAccountStatus()
      setAccountStatus(data)
      return data
    } catch (error) {
      console.error('Error fetching Square account status:', error)
      toast.error('Failed to load Square account status')
      return null
    } finally {
      setChecking(false)
    }
  }

  const handleStartConnect = async () => {
    try {
      setLoading(true)
      const data = await squareService.getAuthorizationUrl()
      if (!data?.url) {
        toast.error('Could not start Square onboarding')
        return
      }
      window.location.assign(data.url)
    } catch (error) {
      console.error('Error starting Square connect:', error)
      toast.error(
        error.response?.data?.message || 'Failed to start Square onboarding'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (
      !confirm(
        'Are you sure you want to disconnect your Square account? You will not be able to receive Square payments.'
      )
    ) {
      return
    }

    try {
      setLoading(true)
      await squareService.disconnectAccount()
      toast.success('Square account disconnected')
      await fetchAccountStatus()
    } catch (error) {
      console.error('Error disconnecting Square account:', error)
      toast.error(error.response?.data?.message || 'Failed to disconnect account')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDashboard = async () => {
    try {
      setLoading(true)
      const data = await squareService.getAccountDashboard()
      window.open(data.url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      console.error('Error opening Square dashboard:', error)
      toast.error(error.response?.data?.message || 'Failed to open dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (currentUser?.role !== 'spa') {
    return null
  }

  if (checking) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const renderStatusBadge = () => {
    if (!accountStatus?.connected && !isSharedLinkedWithoutOwnAccount) return null

    if (isSharedLinkedWithoutOwnAccount) {
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Active
        </Badge>
      )
    }

    if (accountStatus?.connected) {
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Active
        </Badge>
      )
    }

    if (accountStatus?.account?.merchantId) {
      return (
        <Badge variant="secondary" className="bg-yellow-500 hover:bg-yellow-600">
          <AlertCircle className="mr-1 h-3 w-3" />
          Pending
        </Badge>
      )
    }

    return (
      <Badge variant="destructive">
        <XCircle className="mr-1 h-3 w-3" />
        Incomplete
      </Badge>
    )
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color:var(--brand-primary)/10]">
              <Building2 className="h-5 w-5 text-[color:var(--brand-primary)]" />
            </div>
            <div>
              <CardTitle className="text-lg">Square Merchant</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Connect Square to receive payments through your merchant account.
              </CardDescription>
            </div>
          </div>
          {renderStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="text-xs text-muted-foreground">
          {isSharedLinkedWithoutOwnAccount
            ? 'Square is already linked for this location by another assigned teammate.'
            : 'Square handles merchant verification and secure payment credentials.'}
        </div>

        <div className="space-y-2">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="flex items-start gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--popover)] px-3 py-2"
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[0.7rem] font-semibold uppercase ${
                  step.done
                    ? 'bg-green-500 text-white'
                    : 'border border-[color:var(--border)] text-muted-foreground'
                }`}
              >
                {step.done ? <CheckCircle2 className="h-3 w-3" /> : index + 1}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                <p className="text-[0.65rem] text-gray-500">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          {!accountStatus?.connected && !isSharedLinkedWithoutOwnAccount && (
            <Button
              onClick={handleStartConnect}
              disabled={loading}
              size="sm"
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Connect Square
            </Button>
          )}

          {(accountStatus?.connected || isSharedLinkedWithoutOwnAccount) && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={handleOpenDashboard}
                className="flex-1 min-w-[140px]"
                size="sm"
              >
                <ExternalLink className="mr-2 h-3 w-3" />
                Dashboard
              </Button>
              <Button
                variant="ghost"
                onClick={fetchAccountStatus}
                disabled={loading}
                className="flex-1 min-w-[140px]"
                size="sm"
              >
                <RefreshCw className="mr-2 h-3 w-3" />
                Refresh status
              </Button>
              {!isSharedLinkedWithoutOwnAccount && (
                <Button
                  variant="ghost"
                  onClick={handleDisconnect}
                  className="flex-1 min-w-[140px] text-red-500"
                  size="sm"
                >
                  Disconnect
                </Button>
              )}
            </div>
          )}

          {accountStatus?.account?.businessName && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              Connected merchant: {accountStatus.account.businessName}
            </div>
          )}
          {isSharedLinkedWithoutOwnAccount && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
              Payments are enabled for this location through a teammate&apos;s Square connection.
            </div>
          )}
        </div>
        <div className="text-[0.65rem] text-gray-500">
          Square connection controls whether payouts can route to your Square merchant profile.
        </div>
      </CardContent>
    </Card>
  )
}

export default SquareConnect
