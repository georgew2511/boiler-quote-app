'use client'

import { useState, useTransition } from 'react'
import { ALL_STAGES, LOST_REASONS, getStageDefinition } from '@/lib/pipelineStages'
import { updateLeadStage } from '../actions'

export default function StageSelector({
    leadId,
    currentStage,
}: {
    leadId: number
    currentStage: string | null
}) {
    const [isPending, startTransition] = useTransition()
    const [showLostModal, setShowLostModal] = useState(false)
    const [lostReason, setLostReason] = useState(LOST_REASONS[0])
    const stageDef = getStageDefinition(currentStage)

    function handleChange(stage: string) {
        if (stage === 'Lost') {
            setShowLostModal(true)
            return
        }

        startTransition(() => {
            updateLeadStage(leadId, stage)
        })
    }

    function confirmLost() {
        startTransition(() => {
            updateLeadStage(leadId, 'Lost', lostReason)
        })
        setShowLostModal(false)
    }

    return (
        <>
            <select
                value={currentStage || 'New Lead'}
                onChange={(e) => handleChange(e.target.value)}
                disabled={isPending}
                className={`rounded-full border-0 px-4 py-2 text-sm font-medium ${stageDef.color}`}
            >
                {ALL_STAGES.map((s) => (
                    <option key={s.key} value={s.key}>
                        {s.label}
                    </option>
                ))}
            </select>

            {showLostModal && (
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
                                onClick={() => setShowLostModal(false)}
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
