export interface PipelineStage {
    key: string
    label: string
    // Tailwind classes for the column header/badge and the card's left border
    color: string
    border: string
}

// The active pipeline a lead moves through. "Lost" is tracked separately —
// it's an exit from the pipeline, not a step in it, so it's rendered as its
// own column off to the side rather than between active stages.
export const PIPELINE_STAGES: PipelineStage[] = [
    { key: 'New Lead', label: 'New Lead', color: 'bg-slate-100 text-slate-700', border: 'border-slate-400' },
    { key: 'Survey Booked', label: 'Survey Booked', color: 'bg-blue-100 text-blue-700', border: 'border-blue-400' },
    { key: 'Survey Complete', label: 'Survey Complete', color: 'bg-indigo-100 text-indigo-700', border: 'border-indigo-400' },
    { key: 'Quote Accepted', label: 'Quote Accepted', color: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-400' },
    { key: 'Installation Scheduled', label: 'Installation Scheduled', color: 'bg-amber-100 text-amber-700', border: 'border-amber-400' },
    { key: 'Installed', label: 'Installed', color: 'bg-teal-100 text-teal-700', border: 'border-teal-400' },
    { key: 'Invoiced & Paid', label: 'Invoiced & Paid', color: 'bg-green-100 text-green-700', border: 'border-green-400' },
]

export const LOST_STAGE: PipelineStage = {
    key: 'Lost',
    label: 'Lost',
    color: 'bg-rose-100 text-rose-700',
    border: 'border-rose-400',
}

export const ALL_STAGES: PipelineStage[] = [...PIPELINE_STAGES, LOST_STAGE]

export const LOST_REASONS = [
    'Availability',
    'Repaired boiler',
    'Brand',
    'Cancelled by customer',
    'Duplicate',
    'Fake Details',
    'Failed Finance',
    'Guarantee period length',
    'Out of area',
    'Poor service',
    'Price',
    'Supply Only',
    'Unable to reach',
    'Research',
    'No reason given',
]

export function getStageDefinition(stageKey: string | null | undefined): PipelineStage {
    return ALL_STAGES.find((s) => s.key === stageKey) || PIPELINE_STAGES[0]
}

// A lead is "stale" if it's been sitting in an active (non-terminal) stage
// without an update for this many days — the single biggest failure mode
// for sole traders running their own pipeline is forgetting to chase up.
export const STALE_AFTER_DAYS = 5

export function isLeadStale(lead: {
    pipeline_stage?: string | null
    last_updated?: string | null
    created_at?: string | null
}): boolean {
    if (lead.pipeline_stage === 'Lost' || lead.pipeline_stage === 'Invoiced & Paid') return false

    const reference = lead.last_updated || lead.created_at
    if (!reference) return false

    const daysSince = (Date.now() - new Date(reference).getTime()) / (1000 * 60 * 60 * 24)
    return daysSince > STALE_AFTER_DAYS
}
