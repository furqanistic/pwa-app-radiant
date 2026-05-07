import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ExternalLink, FileText } from 'lucide-react'
import React from 'react'

const formatMoney = (amount = 0, currency = 'usd') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: `${currency || 'usd'}`.toUpperCase(),
  }).format((Number(amount) || 0) / 100)

const formatDate = (value) => {
  if (!value) return 'Not available'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const MembershipInvoicesDialog = ({ open, onOpenChange, invoices = [], loading = false }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-[2rem] border-slate-200 bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tight">
            Membership invoices
          </DialogTitle>
          <DialogDescription>
            Review your previous membership payments and open hosted invoices when
            needed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Loading invoices...
            </div>
          ) : invoices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              No membership invoices yet.
            </div>
          ) : (
            invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                      <FileText className="h-4 w-4 text-slate-500" />
                      {invoice.id}
                    </div>
                    <p className="text-sm text-slate-500">
                      Paid: {formatDate(invoice.paidAt || invoice.createdAt)}
                    </p>
                    <p className="text-sm text-slate-500">
                      Status: <span className="font-semibold text-slate-700">{invoice.status}</span>
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 md:items-end">
                    <div className="text-lg font-black text-slate-900">
                      {formatMoney(invoice.amountPaid || invoice.amountDue, invoice.currency)}
                    </div>
                    {invoice.hostedInvoiceUrl ? (
                      <Button variant="outline" asChild>
                        <a
                          href={invoice.hostedInvoiceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Open invoice
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default MembershipInvoicesDialog
