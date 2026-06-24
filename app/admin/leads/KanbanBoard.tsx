'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
    ALL_STAGES,
    LOST_REASONS,
    STALE_AFTER_DAYS,
    isLeadStale,
} from '@/lib/pipelineStages'
import { updateLeadStage } from './actions'

interface KanbanLead {
    id: number
    name: string | null
    email: string | null
    phone: string | null
    postcode: string | null
    boiler_name: string | null
    pipeline_stage: string | null
    status: string | null
    source: string | null
    created_at: string | null
    last_updated: string | null
    value: number
}

export default function KanbanBoard({ leads }: { leads: KanbanLead[] }) {
    const [isPending, startTransition] = useTransition()
    const [draggingId, setDraggingId] = useState<number | null>(null)
    const [lostModalLeadId, setLostModalLeadId] = useState<number | null>(null)
    const [lostReason, setLostReason] = useState(LOST_REASONS[0])

    function moveLead(leadId: number, stage: string) {
        if (stage === 'Lost') {
            setLostModalLeadId(leadId)
            setLostReason(LOST_REASONS[0])
            return
        }

        startTransition(() => {
            updateLeadStage(leadId, stage)
        })
    }

    function confirmLost() {
        if (lostModalLeadId === null) return

        const leadId = lostModalLeadId
        startTransition(() => {
            updateLeadStage(leadId, 'Lost', lostReason)
        })
        setLostModalLeadId(null)
    }

    const leadsByStage = ALL_STAGES.map((stage) => ({
        stage,
        leads: leads.filter((l) => (l.pipeline_stage || 'New Lead') === stage.key),
    }))

    return (
        <>
            <div className="flex gap-4 overflow-x-auto pb-4">
                {leadsByStage.map(({ stage, leads: stageLeads }) => {
                    const totalValue = stageLeads.reduce((sum, l) => sum + l.value, 0)

                    return (
                        <div
                            key={stage.key}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault()
                                const id = Number(e.dataTransfer.getData('text/lead-id'))
                                if (id) moveLead(id, stage.key)
                                setDraggingId(null)
                            }}
                            className="flex w-72 flex-shrink-0 flex-col rounded-2xl bg-slate-100/70 p-3"
                        >
                            <div className="mb-3 flex items-center justify-between px-1">
                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${stage.color}`}>
                                    {stage.label}
                                </span>
                                <span className="text-xs font-medium text-slate-500">
                                    {stageLeads.length}
                                </span>
                            </div>

                            {stage.key !== 'Lost' && (
                                <p className="mb-3 px-1 text-xs text-slate-500">
                                    £{totalValue.toLocaleString()} in stage
                                </p>
                            )}

                            <div className="flex flex-col gap-3 min-h-[60px]">
                                {stageLeads.map((lead) => {
                                    const stale = isLeadStale(lead)

                                    return (
                                        <div
                                            key={lead.id}
                                            draggable
                                            onDragStart={(e) => {
                                                e.dataTransfer.setData('text/lead-id', String(lead.id))
                                                setDraggingId(lead.id)
                                            }}
                                            onDragEnd={() => setDraggingId(null)}
                                            className={`rounded-xl border-l-4 bg-white p-3 shadow-sm transition-opacity ${stage.border} ${draggingId === lead.id ? 'opacity-50' : ''
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <Link
                                                    href={`/admin/leads/${lead.id}`}
                                                    className="font-semibold text-slate-900 hover:text-blue-600"
                                                >
                                                    {lead.name || 'Unnamed lead'}
                                                </Link>
                                                {stale && (
                                                    <span
                                                        title={`No update in over ${STALE_AFTER_DAYS} days`}
                                                        className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700"
                                                    >
                                                        ⏰ stale
                                                    </span>
                                                )}
                                            </div>

                                            <p className="mt-1 text-sm text-slate-600">
                                                {lead.boiler_name || 'No boiler selected'}
                                            </p>
                                            {lead.value > 0 && (
                                                <p className="text-sm font-semibold text-slate-900">
                                                    £{lead.value.toLocaleString()}
                                                </p>
                                            )}
                                            {lead.postcode && (
                                                <p className="mt-1 text-xs text-slate-400">{lead.postcode}</p>
                                            )}

                                            <div className="mt-3 flex items-center gap-2">
                                                {lead.phone && (
                                                    <a
                                                        href={`tel:${lead.phone}`}
                                                        title="Call"
                                                        className="rounded-lg bg-slate-100 px-2 py-1 text-sm hover:bg-slate-200"
                                                    >
                                                        📞
                                                    </a>
                                                )}
                                                {lead.phone && (
                                                    <a
                                                        href={`sms:${lead.phone}`}
                                                        title="Text"
                                                        className="rounded-lg bg-slate-100 px-2 py-1 text-sm hover:bg-slate-200"
                                                    >
                                                        💬
                                                    </a>
                                                )}
                                                {lead.email && (
                                                    <a
                                                        href={`mailto:${lead.email}`}
                                                        title="Email"
                                                        className="rounded-lg bg-slate-100 px-2 py-1 text-sm hover:bg-slate-200"
                                                    >
                                                        ✉️
                                                    </a>
                                                )}
                                            </div>

                                            <select
                                                value={lead.pipeline_stage || 'New Lead'}
                                                onChange={(e) => moveLead(lead.id, e.target.value)}
                                                disabled={isPending}
                                                className="mt-3 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-xs"
                                            >
                                                {ALL_STAGES.map((s) => (
                                                    <option key={s.key} value={s.key}>
                                                        {s.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )
                                })}

                                {stageLeads.length === 0 && (
                                    <p className="px-1 text-xs text-slate-400">No leads here</p>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {lostModalLeadId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
                        <h3 className="text-lg font-bold text-slate-900">Mark lead as lost</h3>
                        <p className="mt-1 text-sm text-slate-500">
                            Why was this lead lost? This helps you spot patterns later.
                        </p>

                        <select
                            value={lostReason}
                            onChange={(e) => setLostReason(e.target.value)}
                            className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3"
                        >
                            {LOST_REASONS.map((reason) => (
                                <option key={reason} value={reason}>
                                    {reason}
                                </option>
                            ))}
                        </select>

                        <div className="mt-5 flex justify-end gap-3">
                            <button
                                onClick={() => setLostModalLeadId(null)}
                                className="rounded-xl border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmLost}
                                className="rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white hover:bg-rose-700"
                            >
                                Mark as Lost
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
