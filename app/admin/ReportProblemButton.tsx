'use client'

import { useState } from 'react'

export default function ReportProblemButton() {
    const [open, setOpen] = useState(false)
    const [message, setMessage] = useState('')
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
    const [error, setError] = useState('')

    function close() {
        setOpen(false)
        setStatus('idle')
        setMessage('')
        setError('')
    }

    async function submit() {
        setStatus('submitting')
        setError('')

        try {
            const res = await fetch('/api/report-problem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, pageUrl: window.location.href }),
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Something went wrong — please try again.')
                setStatus('error')
                return
            }

            setStatus('success')
        } catch {
            setError('Something went wrong — please try again.')
            setStatus('error')
        }
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                title="Report a problem"
                className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg transition-transform hover:scale-105 hover:bg-slate-800"
            >
                <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                Report a problem
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
                        {status === 'success' ? (
                            <>
                                <h3 className="text-lg font-bold text-slate-900">Thanks — got it</h3>
                                <p className="mt-2 text-sm text-slate-600">
                                    A member of the team will look into this within 4 hours and follow up by email.
                                </p>
                                <div className="mt-6 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={close}
                                        className="rounded-xl bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800"
                                    >
                                        Done
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 className="text-lg font-bold text-slate-900">Report a problem</h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Describe what went wrong — we'll get back to you by email.
                                </p>

                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    rows={4}
                                    placeholder="What happened?"
                                    className="mt-4 w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-slate-500 focus:outline-none"
                                />

                                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

                                <div className="mt-6 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={close}
                                        className="rounded-xl border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={submit}
                                        disabled={status === 'submitting' || message.trim().length < 10}
                                        className="rounded-xl bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {status === 'submitting' ? 'Sending…' : 'Send'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
