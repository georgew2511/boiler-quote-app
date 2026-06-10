import React from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'

interface Boiler {
    id: number
    name: string
    tier: string
    category: string
    output: number
    price: number
    warranty: number
    status: string
}

export default async function BoilersPage() {
    const { data: boilers, error } = await supabase
        .from('boilers')
        .select('*')

    if (error) {
        return <div>Error: {error.message}</div>
    }

    async function deleteBoiler(formData: FormData) {
        'use server'

        const id = formData.get('id') as string

        await supabase.from('boilers').delete().eq('id', id)

        redirect('/admin/boilers')
    }

    async function duplicateBoiler(formData: FormData) {
        'use server'

        const id = Number(formData.get('id'))

        const { data: boiler } = await supabase
            .from('boilers')
            .select('*')
            .eq('id', id)
            .single()

        if (!boiler) {
            redirect('/admin/boilers')
        }

        const { id: _id, created_at, ...boilerData } = boiler

        await supabase.from('boilers').insert({
            ...boilerData,
            name: `${boiler.name} (Copy)`
        })

        redirect('/admin/boilers')
    }

    const groupedBoilers = {
        combi: (boilers?.filter((b) => b.category === 'combi') ?? []).sort((a, b) => Number(a.output || 0) - Number(b.output || 0)),
        system: (boilers?.filter((b) => b.category === 'system') ?? []).sort((a, b) => Number(a.output || 0) - Number(b.output || 0)),
        regular: (boilers?.filter((b) => b.category === 'regular') ?? []).sort((a, b) => Number(a.output || 0) - Number(b.output || 0)),
        other: (boilers?.filter((b) => !['combi', 'system', 'regular'].includes(b.category)) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
    }

    const orderedBoilers = [
        ...groupedBoilers.combi,
        ...groupedBoilers.system,
        ...groupedBoilers.regular,
        ...groupedBoilers.other,
    ]

    return (
        <main className="min-h-screen bg-gray-50 py-10">
            <div className="mx-auto max-w-7xl px-6">
                <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/admin"
                            className="rounded-xl border border-gray-300 px-5 py-3 font-medium text-gray-700 transition hover:bg-gray-100"
                        >
                            ← Admin Panel
                        </Link>
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900">Boilers</h1>
                            <p className="text-sm text-gray-500">Manage boiler models, pricing and recommendations</p>
                        </div>
                    </div>
                    <Link
                        href="/admin/boilers/new"
                        className="rounded-xl bg-green-600 px-6 py-4 font-semibold text-white shadow-sm transition hover:bg-green-700"
                    >
                        Add Boiler
                    </Link>
                </div>
                {orderedBoilers.length > 0 ? (
                    <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-lg">
                        <table className="w-full table-auto">
                            <thead>
                                <tr className="border-b border-gray-200 bg-slate-900 text-left text-white">
                                    <th className="px-6 py-2">Name</th>
                                    <th className="px-6 py-2">Tier</th>
                                    <th className="px-6 py-2">Category</th>
                                    <th className="px-6 py-2">Output</th>
                                    <th className="px-6 py-2">Price</th>
                                    <th className="px-6 py-2">Warranty</th>
                                    <th className="px-6 py-2">Status</th>
                                    <th className="px-6 py-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orderedBoilers.map((boiler, index) => (
                                    <React.Fragment key={boiler.id}>
                                        {(index === 0 || orderedBoilers[index - 1]?.category !== boiler.category) && (
                                            <tr>
                                                <td colSpan={8} className="bg-blue-50 px-6 py-4 text-sm font-bold uppercase tracking-wider text-blue-800 border-y border-blue-100">
                                                    {boiler.category === 'combi'
                                                        ? 'Combi Boilers'
                                                        : boiler.category === 'system'
                                                            ? 'System Boilers'
                                                            : boiler.category === 'regular'
                                                                ? 'Regular Boilers'
                                                                : 'Other Boilers'}
                                                </td>
                                            </tr>
                                        )}

                                        <tr className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="px-6 py-5">
                                                <Link
                                                    href={`/admin/boilers/${boiler.id}`}
                                                    className="font-semibold text-blue-600 hover:underline"
                                                >
                                                    {boiler.name}
                                                </Link>
                                                <div className="text-sm text-gray-500">{boiler.output}kW</div>
                                            </td>
                                            <td className="px-6 py-5">{boiler.tier || ''}</td>
                                            <td className="px-6 py-5">
                                                <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                                                    {boiler.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">{boiler.output}</td>
                                            <td className="px-6 py-5">
                                                <span className="text-lg font-bold text-green-600">
                                                    £{Number(boiler.price || 0).toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">{boiler.warranty}</td>
                                            <td className="px-6 py-5">
                                                <span className={`rounded-full px-3 py-1 text-sm font-medium ${boiler.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {boiler.status || 'Active'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-wrap gap-2">
                                                    <form action={duplicateBoiler}>
                                                        <input type="hidden" name="id" value={boiler.id} />
                                                        <button type="submit" className="inline-flex h-10 min-w-[90px] items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700">
                                                            Duplicate
                                                        </button>
                                                    </form>

                                                    <form action={deleteBoiler}>
                                                        <input type="hidden" name="id" value={boiler.id} />
                                                        <button type="submit" className="inline-flex h-10 min-w-[90px] items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700">
                                                            Delete
                                                        </button>
                                                    </form>
                                                </div>
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p>No boilers found</p>
                )}
            </div>
        </main>
    )
}