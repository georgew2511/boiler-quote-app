import { supabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function EditBoilerPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: routeId } = await params
    const id = Number(routeId)

    console.log('Editing boiler id:', id)

    const { data: boiler, error } = await supabase
        .from('boilers')
        .select('*')
        .eq('id', id)
        .single()

    if (error) {
        return (
            <main className="min-h-screen bg-gray-50 p-8">
                <div className="mx-auto max-w-xl">
                    <h1 className="text-3xl font-bold mb-4">Database Error</h1>
                    <pre className="rounded bg-red-50 p-4 text-sm">{JSON.stringify(error, null, 2)}</pre>
                    <p className="mt-4">Route ID: {routeId}</p>
                </div>
            </main>
        )
    }

    if (!boiler) {
        return (
            <main className="min-h-screen bg-gray-50 p-8">
                <div className="mx-auto max-w-xl">
                    <h1 className="text-3xl font-bold mb-4">Boiler not found</h1>
                    <Link href="/admin/boilers" className="text-blue-600 hover:underline">Back to Boilers</Link>
                </div>
            </main>
        )
    }

    async function updateBoiler(formData: FormData) {
        'use server'
        const updates: Record<string, any> = {}
        const fields = ['name', 'tier', 'category', 'output', 'price', 'warranty', 'status']
        for (const field of fields) {
            const value = formData.get(field)
            if (typeof value === 'string') {
                updates[field] = value
            }
        }
        const imageFile = formData.get('image') as File

        if (imageFile && imageFile.size > 0) {
            const fileExt = imageFile.name.split('.').pop()
            const fileName = `boilers/${Date.now()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('customer-uploads')
                .upload(fileName, imageFile, {
                    upsert: true,
                })

            if (!uploadError) {
                const {
                    data: { publicUrl },
                } = supabase.storage
                    .from('customer-uploads')
                    .getPublicUrl(fileName)

                updates.image = publicUrl
            }
        }
        await supabase.from('boilers').update(updates).eq('id', id)
        redirect('/admin/boilers')
    }

    return (
        <main className="min-h-screen bg-gray-50 p-8">
            <div className="mx-auto max-w-4xl rounded-3xl border border-gray-200 bg-white p-10 shadow-xl">
                <div className="mb-8 flex items-center justify-between border-b border-gray-100 pb-6">
                    <div>
                        <h1 className="text-5xl font-bold text-gray-900">Edit Boiler</h1>
                        <p className="mt-2 text-gray-500">Update boiler details, pricing and recommendation settings.</p>
                    </div>

                    <Link
                        href="/admin/boilers"
                        className="rounded-xl border border-gray-300 px-5 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                        ← Back
                    </Link>
                </div>
                <form action={updateBoiler} className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-gray-600" htmlFor="name">Name</label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            defaultValue={boiler.name || ''}
                            required
                            className="w-full rounded-2xl border border-gray-300 px-4 py-4 text-lg transition focus:border-green-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-gray-600" htmlFor="tier">Tier</label>
                        <select
                            id="tier"
                            name="tier"
                            defaultValue={boiler.tier || ''}
                            required
                            className="w-full rounded-2xl border border-gray-300 px-4 py-4 text-lg transition focus:border-green-500 focus:outline-none"
                        >
                            <option value="">Select Tier</option>
                            <option value="Good">Good</option>
                            <option value="Better">Better</option>
                            <option value="Best">Best</option>
                        </select>
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-gray-600" htmlFor="category">Category</label>
                        <select
                            id="category"
                            name="category"
                            defaultValue={boiler.category || ''}
                            required
                            className="w-full rounded-2xl border border-gray-300 px-4 py-4 text-lg transition focus:border-green-500 focus:outline-none"
                        >
                            <option value="">Select Category</option>
                            <option value="combi">Combi</option>
                            <option value="system">System</option>
                            <option value="regular">Regular</option>
                        </select>
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-gray-600" htmlFor="output">Output</label>
                        <input
                            id="output"
                            name="output"
                            type="number"
                            step="any"
                            defaultValue={boiler.output ?? ''}
                            required
                            className="w-full rounded-2xl border border-gray-300 px-4 py-4 text-lg transition focus:border-green-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-gray-600" htmlFor="price">Price (£)</label>
                        <input
                            id="price"
                            name="price"
                            type="number"
                            step="any"
                            defaultValue={boiler.price ?? ''}
                            required
                            className="w-full rounded-2xl border border-gray-300 px-4 py-4 text-lg transition focus:border-green-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-gray-600" htmlFor="warranty">Warranty (Years)</label>
                        <input
                            id="warranty"
                            name="warranty"
                            type="number"
                            step="1"
                            defaultValue={boiler.warranty ?? ''}
                            required
                            className="w-full rounded-2xl border border-gray-300 px-4 py-4 text-lg transition focus:border-green-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-gray-600" htmlFor="status">Status</label>
                        <select
                            id="status"
                            name="status"
                            defaultValue={boiler.status || ''}
                            required
                            className="w-full rounded-2xl border border-gray-300 px-4 py-4 text-lg transition focus:border-green-500 focus:outline-none"
                        >
                            <option value="">Select Status</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>

                    <div className="md:col-span-2 rounded-2xl border border-gray-200 p-6">
                        <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-gray-600">
                            Boiler Image
                        </label>

                        {boiler.image && (
                            <img
                                src={boiler.image}
                                alt={boiler.name}
                                className="mb-4 h-48 rounded-xl border object-contain"
                            />
                        )}

                        <input
                            type="file"
                            name="image"
                            accept="image/*"
                            className="w-full rounded-2xl border border-gray-300 px-4 py-4 text-lg"
                        />

                        <p className="mt-2 text-sm text-gray-500">
                            Upload a replacement boiler image. Leave blank to keep the existing image.
                        </p>
                    </div>

                    <div className="rounded-2xl bg-green-50 p-6 md:col-span-2">
                        <h3 className="mb-2 text-lg font-bold text-green-800">Quick Summary</h3>
                        <p className="text-green-700">
                            {boiler.name} • {boiler.output}kW • {boiler.category} • {boiler.tier} • £{Number(boiler.price || 0).toLocaleString()}
                        </p>
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-4 md:col-span-2">
                        <button
                            type="submit"
                            className="rounded-2xl border border-emerald-700 bg-emerald-700 px-8 py-4 text-lg font-semibold text-white shadow-sm transition-all hover:bg-emerald-800 hover:shadow-md"
                        >
                            Save Boiler
                        </button>
                    </div>
                </form>
            </div>
        </main>
    )
}