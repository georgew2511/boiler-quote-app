export function getLeadValue(lead: any): number {
    const raw = lead.raw_data || lead.answers || {}

    // Check boiler recommendations first
    if (Array.isArray(lead.recommended_boilers) && lead.recommended_boilers.length > 0) {
        const prices = lead.recommended_boilers
            .map((b: any) => Number(b.price || 0))
            .filter((p: number) => p > 0)

        if (prices.length > 0) {
            return Math.max(...prices)
        }
    }

    // Check common calculator fields
    const prices = [
        raw.worcesterPrice,
        raw.worcester_price,
        raw.idealPrice,
        raw.ideal_price,
        raw.glowWormPrice,
        raw.glow_worm_price,
        raw.vaillantPrice,
        raw.vaillant_price,
        lead.quote_price,
    ]
        .map((p: any) => Number(p || 0))
        .filter((p: number) => p > 0)

    if (prices.length > 0) {
        return Math.max(...prices)
    }

    // Fallback: attempt to parse prices from notes text
    const notes = String(lead.notes || lead.note || '')

    const matches = [...notes.matchAll(/(\d+(?:\.\d+)?)/g)]
        .map((m) => Number(m[1]))
        .filter((n) => n > 1000)

    return matches.length > 0 ? Math.max(...matches) : 0
}
