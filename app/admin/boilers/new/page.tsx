import { supabase } from '@/lib/supabase'
import { getCurrentCompany } from '@/lib/getcurrentcompany'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default function NewBoilerPage() {
    async function createBoiler(formData: FormData) {
        'use server'

        const company = await getCurrentCompany()

        const imageFile = formData.get('image') as File

        let imageUrl = ''

        if (imageFile && imageFile.size > 0) {
            const fileName = `boilers/${Date.now()}-${imageFile.name}`

            const { error: uploadError } = await supabase.storage
                .from('boiler-images')
                .upload(fileName, imageFile)

            if (uploadError) {
                throw new Error(`Image upload failed: ${uploadError.message}`)
            }

            const {
                data: { publicUrl },
            } = supabase.storage
                .from('boiler-images')
                .getPublicUrl(fileName)

            imageUrl = publicUrl
        }

        const { error } = await supabase
            .from('boilers')
            .insert({
                name: formData.get('name'),
                manufacturer: formData.get('manufacturer'),
                tier: formData.get('tier'),
                category: formData.get('category'),
                price: Number(formData.get('price')),
                output: Number(formData.get('output')),
                image: imageUrl,
                warranty: Number(formData.get('warranty')),
                status: formData.get('status'),
                company_id: company.id,
            })

        if (error) {
            throw new Error(JSON.stringify(error))
        }

        redirect('/admin/boilers')
    }

    return (
        <main className="min-h-screen bg-[#f5f7fb] p-8">
            <div className="mx-auto max-w-4xl">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-4xl font-bold">Add Boiler</h1>

                    <Link
                        href="/admin/boilers"
                        className="rounded-xl border border-slate-200 bg-white px-5 py-2 font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md"
                    >
                        Back
                    </Link>
                </div>

                <form
                    action={createBoiler}
                    encType="multipart/form-data"
                    className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
                >
                    <div className="grid gap-6 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block font-medium">Boiler Name</label>
                            <input
                                name="name"
                                type="text"
                                required
                                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block font-medium">Manufacturer</label>
                            <input
                                name="manufacturer"
                                type="text"
                                required
                                placeholder="Worcester Bosch, Vaillant, Ideal..."
                                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block font-medium">Tier</label>
                            <select
                                name="tier"
                                required
                                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="Good">Good</option>
                                <option value="Better">Better</option>
                                <option value="Best">Best</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block font-medium">Boiler Type</label>
                            <select
                                name="category"
                                defaultValue="combi"
                                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="combi">Combi</option>
                                <option value="system">System</option>
                                <option value="regular">Regular / Heat Only</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block font-medium">Output (kW)</label>
                            <input
                                name="output"
                                type="number"
                                required
                                placeholder="25, 30, 36"
                                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block font-medium">Price (£)</label>
                            <input
                                name="price"
                                type="number"
                                required
                                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block font-medium">Boiler Image</label>
                            <input
                                name="image"
                                type="file"
                                accept="image/*"
                                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                            <p className="mt-2 text-sm text-gray-500">
                                Upload a boiler image. It will be stored in Supabase Storage and displayed on the quote calculator.
                            </p>
                        </div>

                        <div>
                            <label className="mb-2 block font-medium">Warranty (Years)</label>
                            <input
                                name="warranty"
                                type="number"
                                defaultValue={10}
                                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block font-medium">Status</label>
                            <select
                                name="status"
                                defaultValue="Active"
                                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-3">
                        <Link
                            href="/admin/boilers"
                            className="rounded-xl border border-slate-200 bg-white px-6 py-3 font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md"
                        >
                            Cancel
                        </Link>

                        <button
                            type="submit"
                            className="rounded-xl border border-emerald-700 bg-emerald-700 px-6 py-3 font-semibold text-white shadow-sm transition-all hover:bg-emerald-800 hover:shadow-md"
                        >
                            Create Boiler
                        </button>
                    </div>
                </form>
            </div>
        </main>
    )
}