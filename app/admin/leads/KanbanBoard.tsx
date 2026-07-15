'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
    ALL_STAGES,
    STALE_AFTER_DAYS,
    isLeadStale,
} from '@/lib/pipelineStages'
import { updateLeadStage } from './actions'
import DisqualifyModal from './DisqualifyModal'

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

    function moveLead(leadId: number, stage: string) {
        if (stage === 'Lost') {
            setLostModalLeadId(leadId)
            return
        }

        startTransition(() => {
            updateLeadStage(leadId, stage)
        })
    }

    function confirmLost(reason: string, note: string) {
        if (lostModalLeadId === null) return

        const leadId = lostModalLeadId
        startTransition(() => {
            updateLeadStage(leadId, 'Lost', reason, note)
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

                                            <div className="mt-3 flex items-center gap-2">
                                                <select
                                                    value={lead.pipeline_stage || 'New Lead'}
                                                    onChange={(e) => moveLead(lead.id, e.target.value)}
                                                    disabled={isPending}
                                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-xs"
                                                >
                                                    {ALL_STAGES.map((s) => (
                                                        <option key={s.key} value={s.key}>
                                                            {s.label}
                                                        </option>
                                                    ))}
                                                </select>

                                                {stage.key !== 'Lost' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setLostModalLeadId(lead.id)}
                                                        disabled={isPending}
                                                        title="Disqualify"
                                                        className="flex-shrink-0 rounded-lg border border-rose-200 bg-rose-50 px-2 py-2 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-100"
                                                    >
                                                        Disqualify
                                                    </button>
                                                )}
                                            </div>
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
                <DisqualifyModal
                    onCancel={() => setLostModalLeadId(null)}
                    onConfirm={confirmLost}
                />
            )}
        </>
    )
}
