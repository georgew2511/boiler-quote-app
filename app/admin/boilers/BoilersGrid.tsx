'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Boiler {
    id: number
    name: string
    manufacturer?: string
    tier: string
    category: string
    output: number
    price: number
    warranty: number
    status: string
    image?: string
}

interface BoilersGridProps {
    groupedBoilers: {
        combi: Boiler[]
        system: Boiler[]
        regular: Boiler[]
        other: Boiler[]
    }
    deleteBoiler: (formData: FormData) => void
    toggleBoilerStatus: (formData: FormData) => void
}

const CATEGORY_LABELS: Record<string, string> = {
    combi: 'Combi Boilers',
    system: 'System Boilers',
    regular: 'Regular Boilers',
    other: 'Other Boilers',
}

function StatusToggle({
    boiler,
    toggleBoilerStatus,
}: {
    boiler: Boiler
    toggleBoilerStatus: (formData: FormData) => void
}) {
    const isActive = (boiler.status || 'Active') === 'Active'

    return (
        <form action={toggleBoilerStatus}>
            <input type="hidden" name="id" value={boiler.id} />
            <input type="hidden" name="current_status" value={boiler.status || 'Active'} />
            <button
                type="submit"
                title={isActive ? 'Click to deactivate — hides this boiler from the quote calculator' : 'Click to activate — shows this boiler on the quote calculator'}
                className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full py-1.5 pl-2.5 pr-3 text-xs font-medium transition-colors ${isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
            >
                <span
                    className={`relative inline-block h-5 w-9 shrink-0 rounded-full transition-colors ${isActive ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                >
                    <span
                        className={`absolute top-[2px] h-4 w-4 rounded-full bg-white shadow transition-all ${isActive ? 'left-[18px]' : 'left-[2px]'
                            }`}
                    />
                </span>
                <span className="ml-2.5">{isActive ? 'Active' : 'Inactive'}</span>
            </button>
        </form>
    )
}

function BoilerCard({
    boiler,
    deleteBoiler,
    toggleBoilerStatus,
}: {
    boiler: Boiler
    deleteBoiler: (formData: FormData) => void
    toggleBoilerStatus: (formData: FormData) => void
}) {
    return (
        <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
            <div className="mb-3 flex h-32 items-center justify-center rounded-xl bg-gray-50">
                {boiler.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={boiler.image} alt={boiler.name} className="h-full w-full object-contain p-2" />
                ) : (
                    <span className="text-sm text-gray-400">No image</span>
                )}
            </div>

            <div className="flex items-start justify-between gap-2">
                <Link
                    href={`/admin/boilers/${boiler.id}`}
                    className="font-semibold text-slate-900 transition-colors hover:text-blue-600"
                >
                    {boiler.name}
                </Link>
                <StatusToggle boiler={boiler} toggleBoilerStatus={toggleBoilerStatus} />
            </div>

            <div className="mt-1 text-sm text-gray-500">
                {boiler.tier || ''} • {boiler.output}kW • {boiler.warranty}yr warranty
            </div>

            <div className="mt-3 text-2xl font-bold text-green-600">
                £{Number(boiler.price || 0).toLocaleString()}
            </div>

            <div className="mt-4 flex gap-2">
                <Link
                    href={`/admin/boilers/${boiler.id}`}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50"
                >
                    Edit
                </Link>

                <form action={deleteBoiler}>
                    <input type="hidden" name="id" value={boiler.id} />
                    <button
                        type="submit"
                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition-all hover:bg-red-100"
                    >
                        Delete
                    </button>
                </form>
            </div>
        </div>
    )
}

function CategorySection({
    category,
    boilers,
    deleteBoiler,
    toggleBoilerStatus,
}: {
    category: string
    boilers: Boiler[]
    deleteBoiler: (formData: FormData) => void
    toggleBoilerStatus: (formData: FormData) => void
}) {
    const [open, setOpen] = useState(true)

    const manufacturers = Array.from(
        new Set(boilers.filter((b) => b.manufacturer).map((b) => b.manufacturer as string))
    ).sort((a, b) => a.localeCompare(b))

    const manufacturerGroups = manufacturers.map((manufacturer) => ({
        manufacturer,
        boilers: boilers.filter((b) => b.manufacturer === manufacturer),
    }))

    const unbranded = boilers.filter((b) => !b.manufacturer)

    return (
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex w-full items-center justify-between bg-blue-50 px-6 py-4 text-left transition-colors hover:bg-blue-100"
            >
                <span className="text-sm font-bold uppercase tracking-wider text-blue-800">
                    {CATEGORY_LABELS[category] || category} ({boilers.length})
                </span>
                <span className="text-blue-800">{open ? '−' : '+'}</span>
            </button>

            {open && (
                <div className="space-y-6 p-6">
                    {manufacturerGroups.map(({ manufacturer, boilers: brandBoilers }) => (
                        <div key={manufacturer}>
                            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                {manufacturer}
                            </h3>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {brandBoilers.map((boiler) => (
                                    <BoilerCard
                                        key={boiler.id}
                                        boiler={boiler}
                                        deleteBoiler={deleteBoiler}
                                        toggleBoilerStatus={toggleBoilerStatus}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}

                    {unbranded.length > 0 && (
                        <div>
                            {manufacturerGroups.length > 0 && (
                                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Other
                                </h3>
                            )}
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {unbranded.map((boiler) => (
                                    <BoilerCard
                                        key={boiler.id}
                                        boiler={boiler}
                                        deleteBoiler={deleteBoiler}
                                        toggleBoilerStatus={toggleBoilerStatus}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default function BoilersGrid({ groupedBoilers, deleteBoiler, toggleBoilerStatus }: BoilersGridProps) {
    const [search, setSearch] = useState('')

    const filterBoilers = (boilers: Boiler[]) =>
        search.trim()
            ? boilers.filter((b) => b.name.toLowerCase().includes(search.trim().toLowerCase()))
            : boilers

    const categories: Array<keyof typeof groupedBoilers> = ['combi', 'system', 'regular', 'other']
    const visibleCategories = categories
        .map((category) => ({ category, boilers: filterBoilers(groupedBoilers[category]) }))
        .filter((g) => g.boilers.length > 0)

    return (
        <div className="space-y-6">
            <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search boilers by name..."
                className="w-full max-w-md rounded-2xl border border-gray-300 px-4 py-3 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />

            {visibleCategories.length > 0 ? (
                visibleCategories.map(({ category, boilers }) => (
                    <CategorySection
                        key={category}
                        category={category}
                        boilers={boilers}
                        deleteBoiler={deleteBoiler}
                        toggleBoilerStatus={toggleBoilerStatus}
                    />
                ))
            ) : (
                <p className="text-gray-500">No boilers match your search.</p>
            )}
        </div>
    )
}
