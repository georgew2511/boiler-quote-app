'use client'

import { useState } from 'react'
import { applyBoilerMarkup, effectiveBoilerMarkup } from '@/lib/boilerMarkup'

interface BoilerRow {
    id: number
    name: string
    category: string
    output: number
    price: number
    markup_percent: number | null
}

const inputClass =
    'rounded-2xl border border-slate-300 bg-white px-3 py-2 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100'

// Inputs for the Boiler Prices form. A client component only so the customer
// price column updates as trade prices and markups are typed; the enclosing
// <form> posts to a server action on the Pricing page.
export default function BoilerPricesEditor({
    boilers,
    defaultMarkup,
    vatRegistered,
}: {
    boilers: BoilerRow[]
    defaultMarkup: number
    vatRegistered: boolean
}) {
    const [companyMarkup, setCompanyMarkup] = useState(String(defaultMarkup))
    const [prices, setPrices] = useState<Record<number, string>>(() =>
        Object.fromEntries(boilers.map((b) => [b.id, String(b.price ?? '')])),
    )
    const [overrides, setOverrides] = useState<Record<number, string>>(() =>
        Object.fromEntries(boilers.map((b) => [b.id, b.markup_percent === null ? '' : String(b.markup_percent)])),
    )

    const companyPct = Number(companyMarkup) || 0

    return (
        <>
            <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <label htmlFor="default_markup" className="font-medium text-slate-800">
                    Company boiler markup
                </label>
                <div className="flex items-center gap-2">
                    <input
                        id="default_markup"
                        name="default_markup"
                        type="number"
                        step="any"
                        min="0"
                        value={companyMarkup}
                        onChange={(e) => setCompanyMarkup(e.target.value)}
                        className={`w-28 ${inputClass}`}
                    />
                    <span className="text-slate-500">%</span>
                </div>
                <p className="text-sm text-slate-500">
                    Added to every boiler&apos;s trade price unless the boiler has its own override. Also used by the
                    surveyor tool.
                </p>
            </div>

            <table className="w-full overflow-hidden rounded-2xl">
                <thead>
                    <tr className="border-b border-slate-200">
                        <th className="pb-4 text-left">Boiler</th>
                        <th className="pb-4 text-left">Category</th>
                        <th className="pb-4 text-left">Output</th>
                        <th className="pb-4 text-left">Trade price (£)</th>
                        <th className="pb-4 text-left">Markup override (%)</th>
                        <th className="pb-4 text-right">Customer price</th>
                    </tr>
                </thead>
                <tbody>
                    {boilers.length === 0 && (
                        <tr>
                            <td colSpan={6} className="py-8 text-center text-red-600">
                                No boilers found. Add one from the boiler catalogue first.
                            </td>
                        </tr>
                    )}
                    {boilers.map((boiler) => {
                        const pct = effectiveBoilerMarkup(overrides[boiler.id], companyPct)
                        const exVat = applyBoilerMarkup(Number(prices[boiler.id]) || 0, pct)
                        return (
                            <tr key={boiler.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50 last:border-0">
                                <td className="py-4 font-medium">{boiler.name}</td>
                                <td className="py-4 capitalize text-slate-500">{boiler.category}</td>
                                <td className="py-4 text-slate-500">{boiler.output}kW</td>
                                <td className="py-4">
                                    <input type="hidden" name="boiler_id" value={boiler.id} />
                                    <input
                                        type="number"
                                        step="any"
                                        name={`price_${boiler.id}`}
                                        value={prices[boiler.id]}
                                        onChange={(e) => setPrices((p) => ({ ...p, [boiler.id]: e.target.value }))}
                                        className={`w-36 ${inputClass}`}
                                    />
                                </td>
                                <td className="py-4">
                                    <input
                                        type="number"
                                        step="any"
                                        min="0"
                                        name={`markup_${boiler.id}`}
                                        value={overrides[boiler.id]}
                                        placeholder={`${companyPct}`}
                                        onChange={(e) => setOverrides((o) => ({ ...o, [boiler.id]: e.target.value }))}
                                        className={`w-28 ${inputClass}`}
                                    />
                                </td>
                                <td className="py-4 text-right">
                                    <div className="font-semibold text-slate-900">£{exVat.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                                    <div className="text-xs text-slate-500">
                                        {vatRegistered
                                            ? `£${(exVat * 1.2).toLocaleString(undefined, { maximumFractionDigits: 2 })} inc VAT`
                                            : 'ex surcharges'}
                                    </div>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </>
    )
}
