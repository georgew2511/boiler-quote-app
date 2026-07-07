import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

const DEFAULT_PRICING = [
    // LABOUR
    { category: 'LABOUR', key: 'labour_combi_same_location',       name: 'Combi Install',                           price: 580,   unit: 'job' },
    { category: 'LABOUR', key: 'labour_system_same_location',      name: 'System Boiler Install',                   price: 620,   unit: 'job' },
    { category: 'LABOUR', key: 'labour_regular_same_location',     name: 'Regular/Heat-Only Install',               price: 900,   unit: 'job' },
    { category: 'LABOUR', key: 'labour_conventional_to_combi',     name: 'Conventional to Combi Conversion',        price: 420,   unit: 'job' },
    // FLUE
    { category: 'FLUE', key: 'flue_horizontal_standard',           name: 'Horizontal Flue Kit (standard telescopic)', price: 65,  unit: 'each' },
    { category: 'FLUE', key: 'flue_horizontal_long',               name: 'Horizontal Flue Kit (long telescopic)',   price: 85,    unit: 'each' },
    { category: 'FLUE', key: 'flue_vertical_terminal_only',        name: 'Vertical Flue — Terminal Only',           price: 55,    unit: 'each' },
    { category: 'FLUE', key: 'flue_vertical_small',                name: 'Vertical Flue Kit — Small',               price: 78,    unit: 'each' },
    { category: 'FLUE', key: 'flue_vertical_medium',               name: 'Vertical Flue Kit — Medium',              price: 95,    unit: 'each' },
    { category: 'FLUE', key: 'flue_vertical_large',                name: 'Vertical Flue Kit — Large',               price: 115,   unit: 'each' },
    { category: 'FLUE', key: 'flue_plume_kit',                     name: 'Plume Kit',                               price: 72,    unit: 'each' },
    { category: 'FLUE', key: 'flue_extension_1m',                  name: 'Flue Extension 1m',                       price: 32,    unit: 'each' },
    { category: 'FLUE', key: 'flue_elbow_90',                      name: 'Flue 90° Elbow',                          price: 22,    unit: 'each' },
    { category: 'FLUE', key: 'flue_bend_45_pair',                  name: 'Flue 45° Bend (pair)',                    price: 28,    unit: 'pair' },
    { category: 'FLUE', key: 'flue_plume_extension_1m',            name: 'Plume Kit Extension 1m',                  price: 30,    unit: 'each' },
    { category: 'FLUE', key: 'flue_plume_elbow_90',                name: 'Plume Kit 90° Elbow',                     price: 20,    unit: 'each' },
    { category: 'FLUE', key: 'flue_clips',                         name: 'Flue Clips',                              price: 8,     unit: 'set' },
    { category: 'FLUE', key: 'flue_guard_11x6',                    name: 'Flue Terminal Guard 11" × 6"',            price: 18,    unit: 'each' },
    { category: 'FLUE', key: 'flue_guard_11_5x9',                  name: 'Flue Terminal Guard 11.5" × 9"',          price: 20,    unit: 'each' },
    { category: 'FLUE', key: 'flue_guard_10x4',                    name: 'Flue Terminal Guard 10" × 4"',            price: 16,    unit: 'each' },
    { category: 'FLUE', key: 'flue_guard_plume_hole',              name: 'Flue Guard with Plume Kit Hole',          price: 22,    unit: 'each' },
    // CYLINDER
    { category: 'CYLINDER', key: 'cylinder_labour_straight_swap',       name: 'Cylinder Labour — Straight Swap',           price: 180,  unit: 'job' },
    { category: 'CYLINDER', key: 'cylinder_labour_vented_to_pressurised', name: 'Cylinder Labour — Vented to Pressurised', price: 320,  unit: 'job' },
    { category: 'CYLINDER', key: 'cylinder_labour_new_install',         name: 'Cylinder Labour — New Install',             price: 280,  unit: 'job' },
    { category: 'CYLINDER', key: 'cylinder_90L_indirect',               name: '90L Indirect Pressurised Cylinder',         price: 280,  unit: 'each' },
    { category: 'CYLINDER', key: 'cylinder_125L_indirect',              name: '125L Indirect Pressurised Cylinder',        price: 320,  unit: 'each' },
    { category: 'CYLINDER', key: 'cylinder_150L_indirect',              name: '150L Indirect Pressurised Cylinder',        price: 360,  unit: 'each' },
    { category: 'CYLINDER', key: 'cylinder_170L_indirect',              name: '170L Indirect Pressurised Cylinder',        price: 395,  unit: 'each' },
    { category: 'CYLINDER', key: 'cylinder_200L_indirect',              name: '200L Indirect Pressurised Cylinder',        price: 440,  unit: 'each' },
    { category: 'CYLINDER', key: 'cylinder_250L_indirect',              name: '250L Indirect Pressurised Cylinder',        price: 510,  unit: 'each' },
    { category: 'CYLINDER', key: 'cylinder_300L_indirect',              name: '300L Indirect Pressurised Cylinder',        price: 580,  unit: 'each' },
    { category: 'CYLINDER', key: 'cylinder_36x18_vented',               name: '36×18" Indirect Vented Cylinder',           price: 195,  unit: 'each' },
    { category: 'CYLINDER', key: 'cylinder_42x18_vented',               name: '42×18" Indirect Vented Cylinder',           price: 220,  unit: 'each' },
    // SYSTEM
    { category: 'SYSTEM', key: 'system_pump_grundfos_ups3',        name: 'Grundfos UPS3 15-50/65 Pump',            price: 95,    unit: 'each' },
    { category: 'SYSTEM', key: 'system_3port_22mm',                name: 'Honeywell 3 Port Valve 22mm',            price: 45,    unit: 'each' },
    { category: 'SYSTEM', key: 'system_3port_28mm',                name: 'Honeywell 3 Port Valve 28mm',            price: 58,    unit: 'each' },
    { category: 'SYSTEM', key: 'system_2port_22mm',                name: 'Honeywell 2 Port Valve 22mm',            price: 32,    unit: 'each' },
    { category: 'SYSTEM', key: 'system_2port_28mm',                name: 'Honeywell 2 Port Valve 28mm',            price: 42,    unit: 'each' },
    { category: 'SYSTEM', key: 'system_bypass_22mm',               name: '22mm Bypass',                            price: 28,    unit: 'each' },
    { category: 'SYSTEM', key: 'system_expansion_8L',              name: '8L Expansion Vessel',                    price: 35,    unit: 'each' },
    { category: 'SYSTEM', key: 'system_expansion_12L',             name: '12L Expansion Vessel',                   price: 42,    unit: 'each' },
    { category: 'SYSTEM', key: 'system_expansion_18L',             name: '18L Expansion Vessel',                   price: 52,    unit: 'each' },
    { category: 'SYSTEM', key: 'system_expansion_24L',             name: '24L Expansion Vessel',                   price: 62,    unit: 'each' },
    { category: 'SYSTEM', key: 'system_expansion_35L',             name: '35L Expansion Vessel',                   price: 78,    unit: 'each' },
    { category: 'SYSTEM', key: 'system_booster_pump',              name: 'Cold Water Mains Booster Pump',          price: 380,   unit: 'each' },
    { category: 'SYSTEM', key: 'system_filling_loop',              name: 'Filling Loop',                            price: 15,    unit: 'each' },
    // CONTROLS
    { category: 'CONTROLS', key: 'ctrl_eph_wireless',              name: 'EPH Controller Wireless',                price: 65,    unit: 'each' },
    { category: 'CONTROLS', key: 'ctrl_hive_combi',                name: 'Hive Thermostat — Combi',                price: 145,   unit: 'each' },
    { category: 'CONTROLS', key: 'ctrl_hive_hwc',                  name: 'Hive Thermostat with Hot Water Control', price: 175,   unit: 'each' },
    { category: 'CONTROLS', key: 'ctrl_existing',                  name: 'Connect to Existing Controls',           price: 0,     unit: 'each' },
    { category: 'CONTROLS', key: 'ctrl_honeywell_t6_wired',        name: 'Honeywell Lyric T6 Wired',               price: 78,    unit: 'each' },
    { category: 'CONTROLS', key: 'ctrl_honeywell_t6_wireless',     name: 'Honeywell Lyric T6 Wireless',            price: 95,    unit: 'each' },
    { category: 'CONTROLS', key: 'ctrl_honeywell_t6_hwc',          name: 'Honeywell Lyric T6 with Hot Water Control', price: 120, unit: 'each' },
    { category: 'CONTROLS', key: 'ctrl_nest',                      name: 'Nest Learning Thermostat',               price: 185,   unit: 'each' },
    { category: 'CONTROLS', key: 'ctrl_nest_wireless_stand',       name: 'Nest Thermostat Wireless (inc. Stand)',  price: 205,   unit: 'each' },
    { category: 'CONTROLS', key: 'ctrl_worcester_comfort2',        name: 'Worcester Comfort 2',                    price: 88,    unit: 'each' },
    { category: 'CONTROLS', key: 'ctrl_worcester_easy_white',      name: 'Worcester Easy Control — White',         price: 72,    unit: 'each' },
    { category: 'CONTROLS', key: 'ctrl_worcester_easy_black',      name: 'Worcester Easy Control — Black',         price: 72,    unit: 'each' },
    { category: 'CONTROLS', key: 'ctrl_vaillant_vsmart',           name: 'Vaillant vSMART Combi',                  price: 95,    unit: 'each' },
    // FILTER
    { category: 'FILTER', key: 'filter_22mm',                      name: 'Magnetic Filter 22mm',                   price: 85,    unit: 'each' },
    { category: 'FILTER', key: 'filter_fernox_omega_28_nv',        name: 'Fernox Omega Magnetic Filter 28mm (no valves)', price: 95, unit: 'each' },
    { category: 'FILTER', key: 'filter_fernox_omega_28_wv',        name: 'Fernox Omega Magnetic Filter 28mm (with valves)', price: 115, unit: 'each' },
    { category: 'FILTER', key: 'filter_magnaclean_pro2xp_28',      name: 'Magnaclean Pro 2XP Magnetic Filter 28mm', price: 125, unit: 'each' },
    { category: 'FILTER', key: 'filter_spirotech_mb3_28',          name: 'Spirotech MB3 Magnetic Filter 28mm',     price: 110,   unit: 'each' },
    { category: 'FILTER', key: 'filter_worcester_28',              name: 'Worcester System Magnetic Filter 28mm',  price: 98,    unit: 'each' },
    { category: 'FILTER', key: 'filter_care_packs',                name: 'Filter Care Packs',                      price: 22,    unit: 'each' },
    // GAS
    { category: 'GAS', key: 'gas_22mm_meter_tail',                 name: '22mm Meter Tail',                        price: 18,    unit: 'each' },
    { category: 'GAS', key: 'gas_replace_tees_tail',               name: 'Replace Tees Tail',                      price: 35,    unit: 'job' },
    { category: 'GAS', key: 'gas_run_5m',                          name: 'Gas Run 5m',                             price: 120,   unit: 'job' },
    // COPPER
    { category: 'COPPER', key: 'copper_15mm_per_metre',            name: '15mm Copper Pipe (3m length)',            price: 8.40,  unit: '3m length' },
    { category: 'COPPER', key: 'copper_22mm_per_metre',            name: '22mm Copper Pipe (3m length)',            price: 12.60, unit: '3m length' },
    { category: 'COPPER', key: 'copper_28mm_per_metre',            name: '28mm Copper Pipe (3m length)',            price: 19.50, unit: '3m length' },
    // FITTINGS
    { category: 'FITTINGS', key: 'fittings_pack_15mm',             name: '15mm Fittings Pack',                     price: 18.00, unit: 'pack' },
    { category: 'FITTINGS', key: 'fittings_pack_22mm',             name: '22mm Fittings Pack',                     price: 24.00, unit: 'pack' },
    { category: 'FITTINGS', key: 'fittings_pack_28mm',             name: '28mm Fittings Pack',                     price: 32.00, unit: 'pack' },
    // LAGGING
    { category: 'LAGGING', key: 'lagging_15mm_internal',           name: '15mm Internal Lagging',                  price: 1.20,  unit: 'per metre' },
    { category: 'LAGGING', key: 'lagging_22mm_internal',           name: '22mm Internal Lagging',                  price: 1.60,  unit: 'per metre' },
    { category: 'LAGGING', key: 'lagging_32mm_armaflex',           name: '32mm Armaflex Lagging',                  price: 2.80,  unit: 'per metre' },
    // RAD VALVES
    { category: 'RAD_VALVES', key: 'rv_15mm_trv_lockshield_pack',  name: '15mm Angled TRV & Lockshield Pack',      price: 22,    unit: 'per pair' },
    { category: 'RAD_VALVES', key: 'rv_15mm_lockshield_pair',      name: '15mm Lockshield Pair',                   price: 12,    unit: 'per pair' },
    { category: 'RAD_VALVES', key: 'rv_810mm_trv_lockshield_pack', name: '8/10mm TRV & Lockshield Pack',           price: 25,    unit: 'per pair' },
    // RADIATORS
    { category: 'RADIATORS', key: 'rad_straight_swap',             name: 'Radiator — Straight Swap',               price: 65,    unit: 'each' },
    { category: 'RADIATORS', key: 'rad_minor_alteration',          name: 'Radiator — Minor Pipework Alteration',   price: 95,    unit: 'each' },
    { category: 'RADIATORS', key: 'rad_new_install',               name: 'Radiator — New Installation (no pipework)', price: 130, unit: 'each' },
    // CLEAN — chemical flush
    { category: 'CLEAN', key: 'clean_chem_up_to_5',                name: 'Chemical Flush — up to 5 rads',          price: 95,    unit: 'job' },
    { category: 'CLEAN', key: 'clean_chem_up_to_10',               name: 'Chemical Flush — up to 10 rads',         price: 130,   unit: 'job' },
    { category: 'CLEAN', key: 'clean_chem_up_to_15',               name: 'Chemical Flush — up to 15 rads',         price: 165,   unit: 'job' },
    { category: 'CLEAN', key: 'clean_chem_over_15',                name: 'Chemical Flush — over 15 rads',          price: 210,   unit: 'job' },
    // CLEAN — powerflush
    { category: 'CLEAN', key: 'clean_powerflush_up_to_5',          name: 'Powerflush — up to 5 rads',              price: 280,   unit: 'job' },
    { category: 'CLEAN', key: 'clean_powerflush_up_to_10',         name: 'Powerflush — up to 10 rads',             price: 380,   unit: 'job' },
    { category: 'CLEAN', key: 'clean_powerflush_up_to_15',         name: 'Powerflush — up to 15 rads',             price: 480,   unit: 'job' },
    { category: 'CLEAN', key: 'clean_powerflush_over_15',          name: 'Powerflush — over 15 rads',              price: 580,   unit: 'job' },
    // ELECTRICAL
    { category: 'ELECTRICAL', key: 'electrical_fused_spur',        name: 'New Fused Spur — Supply and Fit',        price: 95,    unit: 'each' },
    // CONDENSATE
    { category: 'CONDENSATE', key: 'condensate_internal_3m',       name: 'Condensate pipe run — internal up to 3m',   price: 35,  unit: 'job' },
    { category: 'CONDENSATE', key: 'condensate_internal_6m',       name: 'Condensate pipe run — internal up to 6m',   price: 55,  unit: 'job' },
    { category: 'CONDENSATE', key: 'condensate_internal_9m',       name: 'Condensate pipe run — internal up to 9m',   price: 75,  unit: 'job' },
    { category: 'CONDENSATE', key: 'condensate_external_3m',       name: 'Condensate pipe run — external lagged up to 3m', price: 65, unit: 'job' },
    { category: 'CONDENSATE', key: 'condensate_external_6m',       name: 'Condensate pipe run — external lagged up to 6m', price: 95, unit: 'job' },
    { category: 'CONDENSATE', key: 'condensate_mcalpine_clamp',    name: 'McAlpine waste pipe clamp',               price: 18,    unit: 'each' },
    { category: 'CONDENSATE', key: 'condensate_strap_boss',        name: 'Strap-on boss',                          price: 12,    unit: 'each' },
    { category: 'CONDENSATE', key: 'condensate_rainwater_tee',     name: 'Rainwater downpipe tee',                  price: 15,    unit: 'each' },
    { category: 'CONDENSATE', key: 'condensate_soil_pipe',         name: 'Soil pipe connection',                    price: 22,    unit: 'each' },
    { category: 'CONDENSATE', key: 'condensate_standpipe',         name: 'Standpipe / open end into drain',         price: 10,    unit: 'each' },
    { category: 'CONDENSATE', key: 'condensate_pump',              name: 'Condensate pump',                         price: 165,   unit: 'each' },
    // INHIBITOR
    { category: 'INHIBITOR', key: 'inhibitor_500ml',               name: 'Inhibitor 500ml',                         price: 12,    unit: 'each' },
    { category: 'INHIBITOR', key: 'inhibitor_1L',                  name: 'Inhibitor 1 Litre',                       price: 20,    unit: 'each' },
    { category: 'INHIBITOR', key: 'inhibitor_2L',                  name: 'Inhibitor 2 Litre',                       price: 36,    unit: 'each' },
]

export async function POST(req: NextRequest) {
    try {
        const contentType = req.headers.get('content-type') ?? ''
        let companyId: string | null = null
        if (contentType.includes('application/json')) {
            const body = await req.json().catch(() => ({}))
            companyId = body.company_id ?? null
        } else {
            const form = await req.formData().catch(() => null)
            companyId = form?.get('company_id')?.toString() ?? null
        }
        companyId = companyId ?? req.nextUrl.searchParams.get('company_id')
        if (!companyId) {
            return NextResponse.json({ error: 'company_id required' }, { status: 400 })
        }

        const supabase = createAdminClient()
        const rows = DEFAULT_PRICING.map((p) => ({ ...p, company_id: companyId, active: true }))

        // ignoreDuplicates so seeding only inserts items that don't already exist
        // for this company — it never overwrites prices the admin has edited.
        const { error } = await supabase
            .from('surveyor_pricing_items')
            .upsert(rows, { onConflict: 'company_id,key', ignoreDuplicates: true })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ seeded: rows.length })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to seed pricing' }, { status: 500 })
    }
}
