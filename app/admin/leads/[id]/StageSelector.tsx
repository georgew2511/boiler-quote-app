'use client'

import { useState, useTransition } from 'react'
import { ALL_STAGES, getStageDefinition } from '@/lib/pipelineStages'
import { updateLeadStage } from '../actions'
import DisqualifyModal from '../DisqualifyModal'

export default function StageSelector({
    leadId,
    currentStage,
}: {
    leadId: number
    currentStage: string | null
}) {
    const [isPending, startTransition] = useTransition()
    const [showLostModal, setShowLostModal] = useState(false)
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

    function confirmLost(reason: string, note: string) {
        startTransition(() => {
            updateLeadStage(leadId, 'Lost', reason, note)
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
                <DisqualifyModal
                    onCancel={() => setShowLostModal(false)}
                    onConfirm={confirmLost}
                />
            )}
        </>
    )
}
