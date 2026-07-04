'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface SurveyorQuote {
    id: string
    created_at: string
    customer_name: string
    customer_email: string
    customer_phone: string
    postcode: string
    low_total: number
    mid_total: number
    high_total: number
    status: string
    email_sent_at: string | null
    accepted_tier: string | null
    accepted_at: string | null
    last_viewed_at: string | null
    view_count: number
    notes: string | null
}

function relativeTime(iso: string | null): string {
    if (!iso) return '—'
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d ago`
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function fmt(n: number) {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n)
}

function StatusBadge({ status }: { status: string }) {
    const cfg: Record<string, string> = {
        DRAFT: 'bg-slate-100 text-slate-600',
        SENT: 'bg-blue-100 text-blue-700',
        VIEWED: 'bg-amber-100 text-amber-700',
        ACCEPTED: 'bg-green-100 text-green-700',
    }
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg[status] ?? 'bg-slate-100 text-slate-600'}`}>
            {status}
        </span>
    )
}

export default function SurveyorQuotesPage() {
    const [quotes, setQuotes] = useState<SurveyorQuote[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetch('/api/surveyor/quotes')
            .then((r) => r.json())
            .then((data) => {
                if (Array.isArray(data)) {
                    setQuotes(data)
                } else {
                    setError(data.error ?? 'Failed to load quotes')
                }
            })
            .catch(() => setError('Failed to load quotes'))
            .finally(() => setLoading(false))
    }, [])

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Surveyor Quotes</h1>
                    <p className="text-sm text-slate-500 mt-1">Track survey quotes sent to customers</p>
                </div>
                <Link
                    href="/admin/survey"
                    className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
                >
                    + New Survey
                </Link>
            </div>

            {loading && (
                <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400">
                    Loading quotes…
                </div>
            )}

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                    {error}
                </div>
            )}

            {!loading && !error && quotes.length === 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
                    <p className="text-slate-500 mb-4">No surveyor quotes yet.</p>
                    <Link href="/admin/survey" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                        Create your first survey quote
                    </Link>
                </div>
            )}

            {!loading && quotes.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Postcode</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Good</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Better</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Best</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Sent</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Last viewed</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Views</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {quotes.map((q) => (
                                <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <p className="text-sm font-semibold text-slate-900">{q.customer_name}</p>
                                        <p className="text-xs text-slate-400">{q.customer_email}</p>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{q.postcode}</td>
                                    <td className="px-4 py-3 text-right text-sm text-slate-700">{fmt(q.low_total)}</td>
                                    <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{fmt(q.mid_total)}</td>
                                    <td className="px-4 py-3 text-right text-sm text-slate-700">{fmt(q.high_total)}</td>
                                    <td className="px-4 py-3 text-xs text-slate-500">{relativeTime(q.email_sent_at ?? q.created_at)}</td>
                                    <td className="px-4 py-3 text-xs text-slate-500">{relativeTime(q.last_viewed_at)}</td>
                                    <td className="px-4 py-3 text-center">
                                        {q.view_count > 0 ? (
                                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                                                {q.view_count}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-slate-300">0</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusBadge status={q.accepted_tier ? 'ACCEPTED' : q.view_count > 0 ? 'VIEWED' : q.status} />
                                        {q.accepted_tier && (
                                            <p className="mt-0.5 text-xs text-green-600">
                                                {q.accepted_tier === 'LOW' ? 'Good' : q.accepted_tier === 'MID' ? 'Better' : 'Best'}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <a
                                            href={`/q/${q.id}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs font-medium text-blue-600 hover:text-blue-800"
                                        >
                                            View →
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
