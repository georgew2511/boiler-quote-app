export interface DateRange {
    start: Date
    end: Date
    label: string
    key: string
}

export const RANGE_PRESETS = [
    { key: '7d', label: 'Last 7 days' },
    { key: '30d', label: 'Last 30 days' },
    { key: '90d', label: 'Last 90 days' },
    { key: 'month', label: 'This month' },
    { key: 'lastmonth', label: 'Last month' },
    { key: 'all', label: 'All time' },
]

export function resolveDateRange(searchParams: {
    range?: string
    start?: string
    end?: string
}): DateRange {
    const now = new Date()
    now.setHours(23, 59, 59, 999)

    if (searchParams.start && searchParams.end) {
        const start = new Date(searchParams.start)
        start.setHours(0, 0, 0, 0)
        const end = new Date(searchParams.end)
        end.setHours(23, 59, 59, 999)

        return {
            start,
            end,
            label: `${start.toLocaleDateString('en-GB')} – ${end.toLocaleDateString('en-GB')}`,
            key: 'custom',
        }
    }

    const key = searchParams.range || '30d'

    if (key === 'all') {
        return { start: new Date(2000, 0, 1), end: now, label: 'All time', key }
    }

    if (key === 'month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1)
        return { start, end: now, label: 'This month', key }
    }

    if (key === 'lastmonth') {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const end = new Date(now.getFullYear(), now.getMonth(), 0)
        end.setHours(23, 59, 59, 999)
        return { start, end, label: 'Last month', key }
    }

    const days = key === '7d' ? 7 : key === '90d' ? 90 : 30
    const start = new Date(now)
    start.setDate(start.getDate() - (days - 1))
    start.setHours(0, 0, 0, 0)

    return {
        start,
        end: now,
        label: RANGE_PRESETS.find((p) => p.key === key)?.label || 'Last 30 days',
        key,
    }
}

export function isInRange(dateStr: string | null | undefined, range: DateRange): boolean {
    if (!dateStr) return false
    const d = new Date(dateStr)
    return d >= range.start && d <= range.end
}
