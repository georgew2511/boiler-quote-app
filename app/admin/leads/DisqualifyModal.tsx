'use client'

import { useState } from 'react'
import { LOST_REASONS } from '@/lib/pipelineStages'

export default function DisqualifyModal({
    onCancel,
    onConfirm,
}: {
    onCancel: () => void
    onConfirm: (reason: string, note: string) => void
}) {
    const [reason, setReason] = useState('')
    const [note, setNote] = useState('')

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Mark as lost</h3>
                        <p className="mt-1 text-sm text-slate-500">
                            Please provide a reason for this lost opportunity.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="text-slate-400 hover:text-slate-600"
                        title="Close"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="mt-5">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Reason
                    </label>
                    <select
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                    >
                        <option value="" disabled>Select reason...</option>
                        {LOST_REASONS.map((r) => (
                            <option key={r} value={r}>{r}</option>
                        ))}
                    </select>
                </div>

                <div className="mt-4">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Note (optional)
                    </label>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={3}
                        placeholder="Add a note for your records..."
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                    />
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-xl border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={!reason}
                        onClick={() => onConfirm(reason, note)}
                        className="rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Disqualify
                    </button>
                </div>
            </div>
        </div>
    )
}
