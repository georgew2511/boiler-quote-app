import Anthropic from '@anthropic-ai/sdk'
import ExcelJS from 'exceljs'

// Reads a merchant's quote or price list (PDF, photo, CSV or Excel), pulls out
// the boiler lines, and suggests which of the company's boilers each one is.
// Nothing is saved here — the owner reviews every suggestion on
// /admin/pricing/import before any price changes.

export interface ImportBoiler {
    id: number
    name: string
    manufacturer: string | null
    output: number
    category: string
    price: number
    markup_percent: number | null
}

export type MatchConfidence = 'high' | 'medium' | 'low'

export interface ImportLine {
    description: string
    partNumber: string | null
    unitPriceExVat: number
    priceWasIncVat: boolean
    matchedBoilerId: number | null
    confidence: MatchConfidence
    /** 'remembered' when a previously confirmed alias decided the match. */
    source: 'ai' | 'remembered'
    note: string
    /** Stable key for boiler_supplier_aliases; see aliasKey(). */
    aliasKey: string
}

export const ACCEPTED_TYPES: Record<string, 'pdf' | 'image' | 'text' | 'excel'> = {
    'application/pdf': 'pdf',
    'image/jpeg': 'image',
    'image/png': 'image',
    'image/webp': 'image',
    'image/gif': 'image',
    'text/csv': 'text',
    'text/plain': 'text',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'excel',
}

// Browsers report some CSVs with an empty or odd MIME type; fall back to the extension.
export function fileKind(file: File): 'pdf' | 'image' | 'text' | 'excel' | null {
    const byType = ACCEPTED_TYPES[file.type]
    if (byType) return byType
    const ext = file.name.toLowerCase().split('.').pop()
    if (ext === 'csv' || ext === 'txt') return 'text'
    if (ext === 'xlsx') return 'excel'
    if (ext === 'pdf') return 'pdf'
    return null
}

/** Lowercase, alphanumerics only, single-spaced. */
export function normalise(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

/**
 * Key a supplier line is remembered by. A part number is the most reliable
 * identifier across quotes from the same merchant; the description is the
 * fallback when the supplier doesn't print one.
 */
export function aliasKey(description: string, partNumber: string | null): string {
    const pn = partNumber ? normalise(partNumber).replace(/ /g, '') : ''
    return pn.length >= 4 ? `pn:${pn}` : `desc:${normalise(description)}`
}

export async function fileToContent(file: File): Promise<Anthropic.Beta.BetaContentBlockParam[]> {
    const kind = fileKind(file)
    const bytes = Buffer.from(await file.arrayBuffer())

    if (kind === 'pdf') {
        return [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: bytes.toString('base64') } }]
    }
    if (kind === 'image') {
        const mediaType = (ACCEPTED_TYPES[file.type] === 'image' ? file.type : 'image/jpeg') as
            'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
        return [{ type: 'image', source: { type: 'base64', media_type: mediaType, data: bytes.toString('base64') } }]
    }
    if (kind === 'text') {
        return [{ type: 'text', text: `Supplier file "${file.name}":\n\n${bytes.toString('utf8')}` }]
    }
    if (kind === 'excel') {
        const workbook = new ExcelJS.Workbook()
        await workbook.xlsx.load(bytes as unknown as ArrayBuffer)
        const sheets: string[] = []
        workbook.eachSheet((sheet) => {
            const rows: string[] = []
            sheet.eachRow((row) => {
                const values = (row.values as unknown[]).slice(1).map((v) => cellText(v))
                rows.push(values.join('\t'))
            })
            sheets.push(`Sheet "${sheet.name}":\n${rows.join('\n')}`)
        })
        return [{ type: 'text', text: `Supplier spreadsheet "${file.name}":\n\n${sheets.join('\n\n')}` }]
    }
    throw new Error('Unsupported file type')
}

function cellText(value: unknown): string {
    if (value === null || value === undefined) return ''
    if (typeof value === 'object') {
        const v = value as Record<string, unknown>
        if ('result' in v) return cellText(v.result)
        if ('text' in v) return String(v.text)
        if ('richText' in v && Array.isArray(v.richText)) {
            return v.richText.map((r: { text?: string }) => r.text ?? '').join('')
        }
        if (value instanceof Date) return value.toISOString().slice(0, 10)
    }
    return String(value)
}

const SYSTEM_PROMPT = `You read UK heating merchants' quotes and price lists for a boiler installer and match the boilers on them to the installer's own boiler catalogue.

Extract every line that is a boiler (combi, system or regular/heat-only), including boiler packs that bundle a boiler with a flue or controls. Skip lines that are not boilers: flues sold separately, filters, controls, cylinders, radiators, delivery, fittings.

For each boiler line:
- unit_price_ex_vat: the net price for ONE unit after any discount, excluding VAT. If the document only shows VAT-inclusive prices, divide by 1.2 and set price_was_inc_vat to true.
- manufacturer, output_kw and boiler_type as printed or clearly implied (e.g. "30C" or "Combi 30" means a 30kW combi; "Heat"/"Regular"/"Open vent" means regular). Use null when unknown.
- matched_boiler_id: the id of the catalogue boiler that is the same product, or null if none is. Supplier names never match the catalogue exactly, so match on manufacturer, model range and output. Manufacturer, output (kW) and type must all agree; never match a 25kW boiler to a 30kW one, and never match across manufacturers or model ranges (e.g. Greenstar 4000 is not Greenstar 8000). If two catalogue boilers are equally plausible, pick the closer one and use confidence "low".
- confidence: "high" when manufacturer, range, output and type all clearly agree; "medium" when one detail is inferred or abbreviated; "low" when unsure.
- note: a few words on anything the installer should check (a pack with a flue included, an unusual discount, an ambiguous name). Empty string if nothing.`

const OUTPUT_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: ['lines'],
    properties: {
        lines: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: false,
                required: [
                    'description', 'part_number', 'manufacturer', 'output_kw', 'boiler_type',
                    'unit_price_ex_vat', 'price_was_inc_vat', 'matched_boiler_id', 'confidence', 'note',
                ],
                properties: {
                    description: { type: 'string' },
                    part_number: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                    manufacturer: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                    output_kw: { anyOf: [{ type: 'number' }, { type: 'null' }] },
                    boiler_type: { anyOf: [{ type: 'string', enum: ['combi', 'system', 'regular'] }, { type: 'null' }] },
                    unit_price_ex_vat: { type: 'number' },
                    price_was_inc_vat: { type: 'boolean' },
                    matched_boiler_id: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
                    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
                    note: { type: 'string' },
                },
            },
        },
    },
}

interface RawLine {
    description: string
    part_number: string | null
    manufacturer: string | null
    output_kw: number | null
    boiler_type: 'combi' | 'system' | 'regular' | null
    unit_price_ex_vat: number
    price_was_inc_vat: boolean
    matched_boiler_id: number | null
    confidence: MatchConfidence
    note: string
}

export class ImportError extends Error {}

export async function readSupplierQuote(
    file: File,
    boilers: ImportBoiler[],
    aliases: Map<string, number>,
): Promise<ImportLine[]> {
    const content = await fileToContent(file)
    const catalogue = boilers.map((b) => ({
        id: b.id,
        name: b.name,
        manufacturer: b.manufacturer,
        output_kw: b.output,
        type: b.category,
    }))

    const client = new Anthropic()
    const message = await client.beta.messages
        .stream({
            model: 'claude-opus-5',
            max_tokens: 32000,
            thinking: { type: 'adaptive' },
            output_config: { effort: 'medium', format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
            system: SYSTEM_PROMPT,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: `The installer's boiler catalogue:\n${JSON.stringify(catalogue)}` },
                        ...content,
                        { type: 'text', text: 'Extract and match the boiler lines from this supplier document.' },
                    ],
                },
            ],
        })
        .finalMessage()

    if (message.stop_reason === 'refusal') {
        throw new ImportError('The quote could not be read. Try a different file.')
    }
    if (message.stop_reason === 'max_tokens') {
        throw new ImportError('This file has too many lines to read in one go. Split it into smaller files and import each one.')
    }

    const text = message.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')?.text
    let raw: RawLine[]
    try {
        raw = JSON.parse(text ?? '').lines
        if (!Array.isArray(raw)) throw new Error('lines is not an array')
    } catch (err) {
        console.error('supplierImport: unparseable model output:', err, text?.slice(0, 500))
        throw new ImportError('The quote could not be read. Try a clearer copy of the file.')
    }

    const byId = new Map(boilers.map((b) => [b.id, b]))
    return raw
        .filter((line) => typeof line.description === 'string' && Number(line.unit_price_ex_vat) > 0)
        .map((line) => checkLine(line, byId, aliases))
}

/**
 * Applies the rules that must hold whatever the model said: a remembered alias
 * wins outright, and a suggested match is dropped if its output or type
 * contradicts what's printed on the quote.
 */
export function checkLine(line: RawLine, byId: Map<number, ImportBoiler>, aliases: Map<string, number>): ImportLine {
    const key = aliasKey(line.description, line.part_number)
    const base = {
        description: line.description,
        partNumber: line.part_number || null,
        unitPriceExVat: Math.round(Number(line.unit_price_ex_vat) * 100) / 100,
        priceWasIncVat: !!line.price_was_inc_vat,
        aliasKey: key,
    }

    const remembered = aliases.get(key)
    if (remembered !== undefined && byId.has(remembered)) {
        return { ...base, matchedBoilerId: remembered, confidence: 'high', source: 'remembered', note: line.note ?? '' }
    }

    const boiler = line.matched_boiler_id === null ? undefined : byId.get(line.matched_boiler_id)
    if (!boiler) {
        return { ...base, matchedBoilerId: null, confidence: 'low', source: 'ai', note: line.note ?? '' }
    }

    const notes = line.note ? [line.note] : []
    let confidence = line.confidence

    if (line.output_kw !== null && Math.abs(Number(line.output_kw) - Number(boiler.output)) > 0.5) {
        return {
            ...base, matchedBoilerId: null, confidence: 'low', source: 'ai',
            note: `Quote says ${line.output_kw}kW, closest boiler is ${boiler.output}kW`,
        }
    }
    if (line.boiler_type && boiler.category && line.boiler_type !== boiler.category) {
        return {
            ...base, matchedBoilerId: null, confidence: 'low', source: 'ai',
            note: `Quote says ${line.boiler_type}, closest boiler is ${boiler.category}`,
        }
    }
    if (line.manufacturer && boiler.manufacturer) {
        const quoted = normalise(line.manufacturer).split(' ')[0]
        const ours = normalise(boiler.manufacturer).split(' ')[0]
        if (quoted && ours && quoted !== ours) {
            confidence = 'low'
            notes.push(`Manufacturer on quote is "${line.manufacturer}"`)
        }
    }

    return { ...base, matchedBoilerId: boiler.id, confidence, source: 'ai', note: notes.join('. ') }
}
