'use client'

import { useState, useTransition } from 'react'
import type { ImportBoiler, ImportLine } from '@/lib/supplierImport'
import { addBoilerFromImport } from './actions'
import { shrinkImage } from './shrinkImage'

const inputClass =
    'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100'
const labelClass = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600'

// Inline form under a supplier-quote row for adding that boiler to the
// catalogue, prefilled with what the quote reader found on the line.
export default function NewBoilerForm({
    line,
    price,
    defaultMarkup,
    onAdded,
    onCancel,
}: {
    line: ImportLine
    price: string
    defaultMarkup: number
    onAdded: (boiler: ImportBoiler) => void
    onCancel: () => void
}) {
    const s = line.suggested
    const [useSuggestedPhoto, setUseSuggestedPhoto] = useState(!!s.imageUrl && s.imageStrong)
    const [upload, setUpload] = useState<File | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [pending, startTransition] = useTransition()

    function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        setError(null)
        startTransition(async () => {
            formData.delete('image')
            if (upload) {
                // Server actions accept up to 1MB; a 1200px WebP of a product
                // shot is typically well under that and keeps transparency.
                formData.append('image', await shrinkImage(upload, { overBytes: 700 * 1024, maxSide: 1200, type: 'image/webp' }))
            } else if (useSuggestedPhoto && s.imageUrl) {
                formData.append('image_url', s.imageUrl)
            }
            const result = await addBoilerFromImport(formData)
            if ('error' in result) setError(result.error)
            else onAdded(result.boiler)
        })
    }

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="flex items-baseline justify-between gap-4">
                <h3 className="font-semibold text-slate-900">Add to your boiler catalogue</h3>
                <p className="text-xs text-slate-500">Filled in from the quote. Check the details before adding.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <div className="md:col-span-2">
                    <label className={labelClass}>Name</label>
                    <input name="name" defaultValue={s.name} required className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Manufacturer</label>
                    <input name="manufacturer" defaultValue={s.manufacturer ?? ''} required placeholder="Worcester Bosch" className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Type</label>
                    <select name="category" defaultValue={s.category ?? ''} required className={inputClass}>
                        <option value="" disabled>Choose…</option>
                        <option value="combi">Combi</option>
                        <option value="system">System</option>
                        <option value="regular">Regular</option>
                    </select>
                </div>
                <div>
                    <label className={labelClass}>Output (kW)</label>
                    <input name="output" type="number" step="any" min="0" defaultValue={s.output ?? ''} required className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Tier</label>
                    <select name="tier" defaultValue={s.tier} required className={inputClass}>
                        <option value="Good">Good</option>
                        <option value="Better">Better</option>
                        <option value="Best">Best</option>
                    </select>
                </div>
                <div>
                    <label className={labelClass}>Warranty (years)</label>
                    <input name="warranty" type="number" step="1" min="0" defaultValue={10} required className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Trade price (£)</label>
                    <input name="price" type="number" step="any" min="0" defaultValue={price} required className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Markup override (%)</label>
                    <input name="markup_percent" type="number" step="any" min="0" placeholder={`${defaultMarkup} (default)`} className={inputClass} />
                </div>
                <div className="flex items-end md:col-span-3">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" name="active" defaultChecked className="h-4 w-4" />
                        Show on the online quote calculator straight away
                    </label>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-3">
                {s.imageUrl && !upload && (
                    <label className="flex items-center gap-3 text-sm text-slate-700">
                        <input
                            type="checkbox"
                            checked={useSuggestedPhoto}
                            onChange={(e) => setUseSuggestedPhoto(e.target.checked)}
                            className="h-4 w-4"
                        />
                        {/* eslint-disable-next-line @next/next/no-img-element -- remote Supabase storage thumbnail */}
                        <img src={s.imageUrl} alt="" className="h-14 w-14 rounded-lg border object-contain" />
                        <span>
                            {s.imageStrong ? 'Use this photo of the same range' : 'Use a photo of a similar boiler'}
                            <span className="block text-xs text-slate-500">From {s.imageFrom}</span>
                        </span>
                    </label>
                )}
                <label className="text-sm text-slate-600">
                    {s.imageUrl ? 'Or upload your own: ' : 'Photo (optional): '}
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setUpload(e.target.files?.[0] ?? null)}
                        className="text-sm"
                    />
                </label>
            </div>

            {error && <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

            <div className="flex gap-3">
                <button
                    type="submit"
                    disabled={pending}
                    className="rounded-xl border border-blue-700 bg-blue-700 px-5 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                    {pending ? 'Adding…' : 'Add boiler'}
                </button>
                <button type="button" onClick={onCancel} className="rounded-xl border border-slate-300 px-5 py-2 text-slate-700 hover:bg-slate-50">
                    Cancel
                </button>
            </div>
        </form>
    )
}
