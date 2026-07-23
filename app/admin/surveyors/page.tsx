'use client'

import { useEffect, useState } from 'react'

interface Surveyor {
    id: string
    name: string
    email: string | null
    token: string
    active: boolean
    created_at: string
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://portal.relode.io'

export default function SurveyorsPage() {
    const [surveyors, setSurveyors] = useState<Surveyor[]>([])
    const [loading, setLoading] = useState(true)
    const [adding, setAdding] = useState(false)
    const [newName, setNewName] = useState('')
    const [newEmail, setNewEmail] = useState('')
    const [copied, setCopied] = useState<string | null>(null)

    useEffect(() => {
        const load = async () => {
            const res = await fetch('/api/surveyor/surveyors')
            if (res.ok) {
                setSurveyors(await res.json())
            }
            setLoading(false)
        }
        load()
    }, [])

    async function addSurveyor() {
        if (!newName.trim()) return
        setAdding(true)

        const res = await fetch('/api/surveyor/surveyors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName.trim(), email: newEmail.trim() || null }),
        })

        if (res.ok) {
            const data = await res.json()
            setSurveyors((prev) => [data, ...prev])
            setNewName('')
            setNewEmail('')
        }
        setAdding(false)
    }

    async function toggleActive(id: string, current: boolean) {
        const res = await fetch(`/api/surveyor/surveyors/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: !current }),
        })
        if (res.ok) {
            setSurveyors((prev) => prev.map((s) => s.id === id ? { ...s, active: !current } : s))
        }
    }

    async function deleteSurveyor(id: string) {
        if (!confirm('Remove this surveyor? Their link will stop working immediately.')) return
        const res = await fetch(`/api/surveyor/surveyors/${id}`, { method: 'DELETE' })
        if (res.ok) {
            setSurveyors((prev) => prev.filter((s) => s.id !== id))
        }
    }

    function surveyLink(token: string) {
        return `${BASE_URL}/survey/${token}`
    }

    function copyLink(token: string) {
        navigator.clipboard.writeText(surveyLink(token))
        setCopied(token)
        setTimeout(() => setCopied(null), 2000)
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <div>
                <h1 className="text-xl font-semibold text-slate-900">Surveyors</h1>
                <p className="mt-0.5 text-sm text-slate-500">
                    Each surveyor gets a unique link they can open on any device — no portal login needed. Quotes they submit are tagged to their name so you can track conversion rates.
                </p>
            </div>

            {/* Add surveyor */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6">
                <h2 className="text-sm font-semibold text-slate-900">Add Surveyor</h2>
                <div className="mt-4 flex flex-wrap gap-3">
                    <input
                        type="text"
                        placeholder="Full name"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addSurveyor()}
                        className="flex-1 min-w-40 rounded-xl border border-slate-200 px-4 py-2.5 text-sm placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                    <input
                        type="email"
                        placeholder="Email (optional)"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addSurveyor()}
                        className="flex-1 min-w-40 rounded-xl border border-slate-200 px-4 py-2.5 text-sm placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                    <button
                        onClick={addSurveyor}
                        disabled={adding || !newName.trim()}
                        className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {adding ? 'Adding…' : 'Add'}
                    </button>
                </div>
            </div>

            {/* Surveyors list */}
            <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden">
                <div className="border-b border-slate-100 px-6 py-4">
                    <h2 className="text-sm font-semibold text-slate-900">Your Surveyors</h2>
                </div>

                {loading && (
                    <div className="px-6 py-10 text-center text-sm text-slate-400">Loading…</div>
                )}

                {!loading && surveyors.length === 0 && (
                    <div className="px-6 py-10 text-center">
                        <p className="text-sm text-slate-400">No surveyors yet. Add one above.</p>
                    </div>
                )}

                {!loading && surveyors.length > 0 && (
                    <div className="divide-y divide-slate-50">
                        {surveyors.map((s) => (
                            <div key={s.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-slate-900 text-sm">{s.name}</span>
                                        {!s.active && (
                                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-400">Inactive</span>
                                        )}
                                    </div>
                                    {s.email && <p className="text-xs text-slate-400 mt-0.5">{s.email}</p>}
                                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                                        <span className="flex-1 truncate font-mono text-xs text-slate-500">
                                            {surveyLink(s.token)}
                                        </span>
                                        <button
                                            onClick={() => copyLink(s.token)}
                                            className="shrink-0 rounded-md bg-white border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                                        >
                                            {copied === s.token ? '✓ Copied' : 'Copy'}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => toggleActive(s.id, s.active)}
                                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                                            s.active
                                                ? 'border-slate-200 text-slate-500 hover:border-amber-200 hover:text-amber-600 hover:bg-amber-50'
                                                : 'border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                                        }`}
                                    >
                                        {s.active ? 'Deactivate' : 'Reactivate'}
                                    </button>
                                    <button
                                        onClick={() => deleteSurveyor(s.id)}
                                        className="rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-100 transition-colors"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Info card */}
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <p className="text-sm font-semibold text-blue-800">How surveyor links work</p>
                <ul className="mt-2 space-y-1 text-sm text-blue-700">
                    <li>· Each surveyor gets their own private link — share it via WhatsApp, email, or bookmark.</li>
                    <li>· They open it on any device (phone, tablet, laptop) with no login required.</li>
                    <li>· Every quote they submit is automatically tagged to their name.</li>
                    <li>· Deactivating a surveyor's link immediately blocks access.</li>
                    <li>· Conversion rates by surveyor will appear in the Analytics page.</li>
                </ul>
            </div>
        </div>
    )
}
