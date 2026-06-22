// Stable identifiers for rows in the `pricing` table.
//
// The calculator used to match pricing rows by their display `name`, which meant
// renaming a row in the admin UI silently broke pricing (it would fall back to a
// hardcoded default with no warning). Each row now also has a `key` that never
// changes, so `name` is free to be edited for display purposes only.
//
// `category` groups rows in the admin UI (Swap Type / Flue / Fuel & Surcharges / Sundries).

export type PricingCategory = 'swap' | 'flue' | 'condensate' | 'fuel' | 'sundries'

export interface PricingDefinition {
    key: string
    name: string
    category: PricingCategory
    fallback: number
}

export const PRICING_CATEGORY_LABELS: Record<PricingCategory, string> = {
    swap: 'Swap Type',
    flue: 'Flue',
    condensate: 'Condense Needed',
    fuel: 'Fuel & Surcharges',
    sundries: 'Sundries',
}

export const PRICING_DEFINITIONS: PricingDefinition[] = [
    { key: 'combiSwap', name: 'Straight Swap (Combi → Combi)', category: 'swap', fallback: 600 },
    { key: 'standard', name: 'Straight Swap (Regular → Regular)', category: 'swap', fallback: 600 },
    { key: 'system', name: 'Straight Swap (System → System)', category: 'swap', fallback: 500 },
    { key: 'backBoiler', name: 'Back Boiler Conversion', category: 'swap', fallback: 1200 },
    { key: 'convertToCombi', name: 'Combi Conversion', category: 'swap', fallback: 1500 },
    { key: 'relocate', name: 'Boiler Relocation', category: 'swap', fallback: 750 },
    { key: 'roofFlue', name: 'Vertical Flue', category: 'flue', fallback: 300 },
    { key: 'horizontalFlue', name: 'Horizontal Flue', category: 'flue', fallback: 90 },
    { key: 'squareFlue', name: 'Square Flue', category: 'flue', fallback: 50 },
    { key: 'lowFlue', name: 'Low Flue', category: 'flue', fallback: 50 },
    { key: 'flueStructure', name: 'Flue Through Structure', category: 'flue', fallback: 120 },
    { key: 'flueNearWindow', name: 'Flue Near Window', category: 'flue', fallback: 120 },
    { key: 'lpg', name: 'LPG Surcharge', category: 'fuel', fallback: 500 },
    { key: 'wallMountedNo', name: 'Wall-Mounted Surcharge', category: 'fuel', fallback: 250 },
    // "Old Boiler Surcharge" and "Condensate Needed" were the same surcharge
    // under two different rows — consolidated into one, kept under its own
    // "Condense Needed" category rather than lumped in with fuel surcharges.
    { key: 'condensateNeeded', name: 'Condensate Needed', category: 'condensate', fallback: 50 },
    { key: 'sundries', name: 'Sundries (Pipe, Fittings & Filter)', category: 'sundries', fallback: 150 },
]
