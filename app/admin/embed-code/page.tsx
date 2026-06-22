import { getCurrentCompany } from '@/lib/getcurrentcompany'

export default async function EmbedPage() {
    const company = await getCurrentCompany()

    const embedCode = `<iframe src="https://portal.relode.io/calculator?company_id=${company.id}" width="100%" height="1200" frameborder="0"></iframe>`

    return (
        <main className="min-h-screen bg-slate-100 p-8">
            <div className="mx-auto max-w-4xl">
                <h1 className="text-4xl font-bold text-slate-900">
                    Embed Calculator
                </h1>

                <p className="mt-3 text-slate-600">
                    Copy and paste this code into your website to display your
                    quote calculator.
                </p>

                <div className="mt-8 rounded-2xl bg-white p-6 shadow">
                    <div className="mb-4">
                        <h2 className="text-xl font-semibold">
                            {company.company_name} Embed Code
                        </h2>
                    </div>

                    <textarea
                        readOnly
                        value={embedCode}
                        className="h-40 w-full rounded-xl border border-slate-300 p-4 font-mono text-sm"
                    />

                    <div className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
                        Copy the code above and paste it into your website.
                    </div>
                </div>
            </div>
        </main>
    )
}