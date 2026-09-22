'use client'

import { useMemo, useState, useTransition } from 'react'
import { applyBoilerMarkup, effectiveBoilerMarkup } from '@/lib/boilerMarkup'
import type { ImportBoiler, ImportLine, MatchConfidence } from '@/lib/supplierImport'
import { applySupplierPrices } from './actions'

interface Row {
    line: ImportLine
    boilerId: number | null
    price: string
    include: boolean
}

const CONFIDENCE_RANK: Record<MatchConfidence, number> = { high: 0, medium: 1, low: 2 }
const BIG_CHANGE = 0.3 // flag price moves of more than 30%

// Phone photos of paper quotes are often 5–10MB; the upload limit is 4MB.
// Re-encode anything over ~1.5MB as a JPEG no wider/taller than 2400px,
// which keeps printed text perfectly legible.
async function shrinkImage(file: File): Promise<File> {
    if (!file.type.startsWith('image/') || file.size < 1.5 * 1024 * 1024) return file
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    return blob ? new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }) : file
}

function money(n: number) {
    return `£${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function SupplierImport({ boilers, defaultMarkup }: { boilers: ImportBoiler[]; defaultMarkup: number }) {
    const [file, setFile] = useState<File | null>(null)
    const [reading, setReading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [rows, setRows] = useState<Row[] | null>(null)
    const [saving, startSaving] = useTransition()

    const byId = useMemo(() => new Map(boilers.map((b) => [b.id, b])), [boilers])
    const grouped = useMemo(() => {
        const groups: Record<string, ImportBoiler[]> = {}
        for (const b of boilers) (groups[b.category || 'other'] ??= []).push(b)
        return groups
    }, [boilers])

    async function readQuote() {
        if (!file) return
        setReading(true)
        setError(null)
        setRows(null)
        try {
            const body = new FormData()
            body.append('file', await shrinkImage(file))
            const res = await fetch('/api/admin/boilers/import-quote', { method: 'POST', body })
            const json = await res.json().catch(() => ({ error: 'The upload failed. Try a smaller file.' }))
            if (!res.ok) {
                setError(json.error || 'Something went wrong reading that file')
                return
            }
            setRows(initialRows(json.lines as ImportLine[]))
        } catch {
            setError('The upload failed. Check your connection and try again.')
        } finally {
            setReading(false)
        }
    }

    // Tick confident matches by default. If a boiler matched more than one
    // line, only its most confident line is ticked.
    function initialRows(lines: ImportLine[]): Row[] {
        const best = new Map<number, number>()
        lines.forEach((line, i) => {
            if (line.matchedBoilerId === null) return
            const current = best.get(line.matchedBoilerId)
            if (current === undefined || CONFIDENCE_RANK[line.confidence] < CONFIDENCE_RANK[lines[current].confidence]) {
                best.set(line.matchedBoilerId, i)
            }
        })
        return lines.map((line, i) => ({
            line,
            boilerId: line.matchedBoilerId,
            price: String(line.unitPriceExVat),
            include:
                line.matchedBoilerId !== null &&
                line.confidence !== 'low' &&
                best.get(line.matchedBoilerId) === i,
        }))
    }

    function update(index: number, patch: Partial<Row>) {
        setRows((rs) => rs!.map((r, i) => (i === index ? { ...r, ...patch } : r)))
    }

    const selected = (rows ?? []).filter((r) => r.include && r.boilerId !== null && Number(r.price) > 0)
    const selectedIds = selected.map((r) => r.boilerId!)
    const duplicateIds = new Set(selectedIds.filter((id, i) => selectedIds.indexOf(id) !== i))
    const matchedIds = new Set((rows ?? []).map((r) => r.boilerId).filter((id): id is number => id !== null))
    const notOnQuote = boilers.filter((b) => !matchedIds.has(b.id))

    function apply() {
        if (duplicateIds.size) return
        setError(null)
        startSaving(async () => {
            // On success the action redirects back to Pricing.
            const result = await applySupplierPrices(
                selected.map((r) => ({
                    boilerId: r.boilerId!,
                    price: Number(r.price),
                    supplierText: r.line.description,
                    aliasKey: r.line.aliasKey,
                }))
            )
            if (result?.error) setError(result.error)
        })
    }

    return (
        <div className="mt-8 space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center gap-4">
                    <input
                        type="file"
                        accept=".pdf,.csv,.txt,.xlsx,image/*"
                        onChange={(e) => {
                            setFile(e.target.files?.[0] ?? null)
                            setRows(null)
                            setError(null)
                        }}
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                    />
                    <button
                        onClick={readQuote}
                        disabled={!file || reading}
                        className="rounded-xl border border-emerald-700 bg-emerald-700 px-6 py-3 font-semibold text-white shadow-sm transition-all hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {reading ? 'Reading quote…' : 'Read quote'}
                    </button>
                </div>
                <p className="mt-3 text-sm text-slate-500">
                    PDF, photo, CSV or Excel (.xlsx), up to 4MB. Long price lists can take a minute or two to read.
                    Prices are imported as <strong>trade prices ex VAT</strong>; your markup is added on top.
                </p>
                {error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
            </div>

            {rows && rows.length === 0 && (
                <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
                    No boilers were found on that file. If it does list boilers, try a clearer copy or a PDF export.
                </div>
            )}

            {rows && rows.length > 0 && (
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold">Review {rows.length} boiler {rows.length === 1 ? 'line' : 'lines'}</h2>
                            <p className="text-sm text-slate-500">
                                Ticked rows will update that boiler&apos;s trade price. Check anything amber, and pick the right
                                boiler for any row we couldn&apos;t match.
                            </p>
                        </div>
                        <button
                            onClick={apply}
                            disabled={saving || selected.length === 0 || duplicateIds.size > 0}
                            className="rounded-xl border border-emerald-700 bg-emerald-700 px-6 py-3 font-semibold text-white shadow-sm transition-all hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {saving ? 'Saving…' : `Update ${selected.length} ${selected.length === 1 ? 'price' : 'prices'}`}
                        </button>
                    </div>

                    {duplicateIds.size > 0 && (
                        <p className="mb-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">
                            More than one ticked line is set to the same boiler (
                            {[...duplicateIds].map((id) => byId.get(id)?.name).join(', ')}). Untick all but one.
                        </p>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 text-left text-slate-600">
                                    <th className="pb-3 pr-3"></th>
                                    <th className="pb-3 pr-3">On the quote</th>
                                    <th className="pb-3 pr-3">Your boiler</th>
                                    <th className="pb-3 pr-3 text-right">Current trade</th>
                                    <th className="pb-3 pr-3">New trade (£)</th>
                                    <th className="pb-3 pr-3 text-right">Change</th>
                                    <th className="pb-3 text-right">Customer price</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, i) => {
                                    const boiler = row.boilerId === null ? undefined : byId.get(row.boilerId)
                                    const newPrice = Number(row.price) || 0
                                    const change = boiler && boiler.price > 0 ? (newPrice - boiler.price) / boiler.price : null
                                    const bigChange = change !== null && Math.abs(change) > BIG_CHANGE
                                    const markup = boiler ? effectiveBoilerMarkup(boiler.markup_percent, defaultMarkup) : defaultMarkup
                                    const needsLook = row.line.confidence !== 'high' || bigChange || !boiler
                                    return (
                                        <tr
                                            key={i}
                                            className={`border-b border-slate-100 align-top last:border-0 ${needsLook ? 'bg-amber-50/60' : ''}`}
                                        >
                                            <td className="py-3 pr-3">
                                                <input
                                                    type="checkbox"
                                                    checked={row.include}
                                                    disabled={!boiler}
                                                    onChange={(e) => update(i, { include: e.target.checked })}
                                                    className="h-4 w-4"
                                                    aria-label={`Update price from ${row.line.description}`}
                                                />
                                            </td>
                                            <td className="max-w-xs py-3 pr-3">
                                                <div className="font-medium text-slate-900">{row.line.description}</div>
                                                {row.line.partNumber && <div className="text-xs text-slate-500">Part {row.line.partNumber}</div>}
                                                <div className="mt-1 flex flex-wrap gap-1">
                                                    <ConfidenceBadge line={row.line} />
                                                    {row.line.priceWasIncVat && (
                                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">VAT removed</span>
                                                    )}
                                                </div>
                                                {row.line.note && <div className="mt-1 text-xs text-amber-800">{row.line.note}</div>}
                                            </td>
                                            <td className="py-3 pr-3">
                                                <select
                                                    value={row.boilerId ?? ''}
                                                    onChange={(e) => {
                                                        const id = e.target.value ? Number(e.target.value) : null
                                                        update(i, { boilerId: id, include: id !== null })
                                                    }}
                                                    className="w-64 rounded-xl border border-slate-300 bg-white px-2 py-2"
                                                >
                                                    <option value="">Not one of mine: skip</option>
                                                    {Object.entries(grouped).map(([category, list]) => (
                                                        <optgroup key={category} label={category}>
                                                            {list.map((b) => (
                                                                <option key={b.id} value={b.id}>
                                                                    {b.name} ({b.output}kW)
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="py-3 pr-3 text-right text-slate-600">{boiler ? money(boiler.price) : '–'}</td>
                                            <td className="py-3 pr-3">
                                                <input
                                                    type="number"
                                                    step="any"
                                                    value={row.price}
                                                    onChange={(e) => update(i, { price: e.target.value })}
                                                    className="w-28 rounded-xl border border-slate-300 bg-white px-2 py-2"
                                                />
                                            </td>
                                            <td className={`py-3 pr-3 text-right font-medium ${bigChange ? 'text-amber-700' : change && change > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                                                {change === null ? '–' : `${change > 0 ? '+' : ''}${(change * 100).toFixed(1)}%`}
                                            </td>
                                            <td className="py-3 text-right">
                                                {boiler ? (
                                                    <>
                                                        <div className="font-medium">{money(applyBoilerMarkup(newPrice, markup))}</div>
                                                        <div className="text-xs text-slate-500">+{markup}% markup, ex VAT</div>
                                                    </>
                                                ) : (
                                                    '–'
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {notOnQuote.length > 0 && (
                        <details className="mt-6 text-sm text-slate-600">
                            <summary className="cursor-pointer">
                                {notOnQuote.length} of your boilers weren&apos;t on this quote and will keep their current price
                            </summary>
                            <ul className="mt-2 columns-1 gap-6 md:columns-2">
                                {notOnQuote.map((b) => (
                                    <li key={b.id}>
                                        {b.name} ({b.output}kW), {money(b.price)}
                                    </li>
                                ))}
                            </ul>
                        </details>
                    )}
                </div>
            )}
        </div>
    )
}

function ConfidenceBadge({ line }: { line: ImportLine }) {
    if (line.matchedBoilerId === null) {
        return <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700">No match</span>
    }
    if (line.source === 'remembered') {
        return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">Matched before</span>
    }
    const styles: Record<MatchConfidence, string> = {
        high: 'bg-emerald-100 text-emerald-800',
        medium: 'bg-amber-100 text-amber-800',
        low: 'bg-red-100 text-red-700',
    }
    const labels: Record<MatchConfidence, string> = { high: 'Confident match', medium: 'Check match', low: 'Unsure match' }
    return <span className={`rounded-full px-2 py-0.5 text-xs ${styles[line.confidence]}`}>{labels[line.confidence]}</span>
}
