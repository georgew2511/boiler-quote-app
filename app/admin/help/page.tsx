import Link from 'next/link'

interface HelpSection {
    id: string
    label: string
    title: string
    content: React.ReactNode
}

const SECTIONS: HelpSection[] = [
    {
        id: 'getting-started',
        label: 'Getting Started',
        title: 'Getting Started',
        content: (
            <>
                <p>
                    Welcome — this dashboard runs two ways of quoting customers: an <strong>online quote
                    calculator</strong> for your website, and a <strong>surveyor tool</strong> your team uses
                    to build a fixed-price quote on-site during a survey.
                </p>
                <p>
                    To get the online calculator live, work through these in order:
                </p>
                <ol className="list-decimal space-y-2 pl-5">
                    <li>Add your boilers (or check the ones we pre-loaded for you) — <Link href="/admin/help?section=boilers" className="text-blue-600 hover:underline">Adding Your Boilers</Link></li>
                    <li>Set your installation pricing and surcharges — <Link href="/admin/help?section=pricing" className="text-blue-600 hover:underline">Setting Your Pricing</Link></li>
                    <li>Add your logo and brand colour — <Link href="/admin/help?section=branding" className="text-blue-600 hover:underline">Branding Your Calculator</Link></li>
                    <li>Try it yourself before going live — <Link href="/admin/help?section=test-quote" className="text-blue-600 hover:underline">Testing Your Quote Calculator</Link></li>
                    <li>Put it on your website — <Link href="/admin/help?section=embed" className="text-blue-600 hover:underline">Embedding On Your Website</Link></li>
                </ol>
                <p>
                    Once it's live, new enquiries land automatically in <Link href="/admin/leads" className="text-blue-600 hover:underline">Leads</Link>.
                </p>
                <p>
                    If your team quotes on-site instead (or as well), see <Link href="/admin/help?section=surveyor-tool" className="text-blue-600 hover:underline">The Surveyor Tool</Link> to
                    set up materials pricing and start sending on-site quotes.
                </p>
            </>
        ),
    },
    {
        id: 'boilers',
        label: 'Adding Your Boilers',
        title: 'Adding Your Boilers',
        content: (
            <>
                <p>
                    Your boiler catalogue lives under <Link href="/admin/boilers" className="text-blue-600 hover:underline">Boilers</Link>.
                    Every boiler here can be recommended to customers in the quote calculator.
                </p>
                <ol className="list-decimal space-y-2 pl-5">
                    <li>Click <strong>Add Boiler</strong> to create a new one, or click any existing boiler to edit it.</li>
                    <li>Fill in the manufacturer, tier (Good/Better/Best), category (Combi/System/Regular), output (kW) and base price.</li>
                    <li>Upload a photo — this shows on the customer's quote, along with a guarantee sticker showing the warranty years you enter.</li>
                    <li>Use the <strong>Active/Inactive</strong> toggle on each boiler card to instantly hide it from the calculator without deleting it.</li>
                </ol>
                <p>
                    Boilers are grouped by category, then by manufacturer, with collapsible sections — click a
                    category header to expand or collapse it, and use the search box to jump straight to one boiler.
                </p>
                <p className="text-sm text-gray-500">
                    Tip: the price you enter here is the <strong>base</strong> price before installation surcharges
                    and VAT — see Setting Your Pricing for how the final customer price is built up.
                </p>
            </>
        ),
    },
    {
        id: 'pricing',
        label: 'Setting Your Pricing',
        title: 'Setting Your Pricing',
        content: (
            <>
                <p>
                    Everything that affects the final price a customer sees lives under <Link href="/admin/pricing" className="text-blue-600 hover:underline">Pricing</Link>,
                    split into two tabs:
                </p>
                <ul className="list-disc space-y-2 pl-5">
                    <li><strong>Boiler Prices</strong> — quickly update every boiler's base price in one table, without opening each one individually.</li>
                    <li><strong>Installation &amp; Surcharges</strong> — the extra costs added depending on a customer's answers (swap type, flue position, fuel type, sundries, etc.), grouped into Swap Type, Flue, Condense Needed, Fuel &amp; Surcharges and Sundries.</li>
                </ul>
                <p>
                    A customer's final price is: <strong>boiler base price + every applicable surcharge</strong>,
                    plus VAT if you're VAT registered (see Branding Your Calculator for the VAT toggle).
                </p>
                <p className="text-sm text-gray-500">
                    All prices are entered <strong>excluding VAT</strong> — the calculator adds VAT automatically
                    if you've turned it on in Settings.
                </p>
            </>
        ),
    },
    {
        id: 'branding',
        label: 'Branding Your Calculator',
        title: 'Branding Your Calculator',
        content: (
            <>
                <p>
                    Head to <Link href="/admin/settings" className="text-blue-600 hover:underline">Settings</Link> to make the calculator look like part of your own website:
                </p>
                <ul className="list-disc space-y-2 pl-5">
                    <li><strong>Logo</strong> — upload your logo or paste a URL; it appears at the top of the calculator and the service plan sign-up page.</li>
                    <li><strong>Branding Colour</strong> — pick your brand colour and it's used everywhere a customer sees a button, the loading bar, focus rings and the guarantee stickers on boiler photos.</li>
                    <li><strong>VAT</strong> — toggle on if you're VAT registered; 20% is added automatically to every price shown to customers. Leave it off and customers see your price exactly as entered.</li>
                    <li><strong>Tracking &amp; Analytics</strong> — add a Google Tag Manager or Google Analytics ID to track quote-calculator activity in your own analytics.</li>
                </ul>
            </>
        ),
    },
    {
        id: 'test-quote',
        label: 'Testing Your Quote Calculator',
        title: 'Testing Your Quote Calculator',
        content: (
            <>
                <p>
                    Before putting anything on your website, use <Link href="/admin/test-quote" className="text-blue-600 hover:underline">Test Quote</Link> to
                    run through the exact live calculator your customers will see — same boilers, same pricing, same branding.
                </p>
                <ol className="list-decimal space-y-2 pl-5">
                    <li>Open Test Quote and work through the quiz like a customer would.</li>
                    <li>Check the recommended boilers, prices and guarantee stickers look right.</li>
                    <li>Any sign-up you submit here is automatically tagged <strong>Test</strong> in Leads, so it never gets mistaken for a real enquiry — and you don't need to enter real contact details.</li>
                </ol>
                <p>
                    Keep using this whenever you change a price, add a boiler, or update your branding.
                </p>
            </>
        ),
    },
    {
        id: 'embed',
        label: 'Embedding On Your Website',
        title: 'Embedding On Your Website',
        content: (
            <>
                <p>
                    Once you're happy with Test Quote, go to <Link href="/admin/embed-code" className="text-blue-600 hover:underline">Embed Calculator</Link> to
                    get your unique link and embed code.
                </p>
                <ol className="list-decimal space-y-2 pl-5">
                    <li>Copy the embed code shown there.</li>
                    <li>Paste it into your website's HTML, wherever you want the calculator to appear (most website builders have a spot for "custom HTML" or an "embed" block).</li>
                    <li>That's it — the calculator updates automatically whenever you change boilers, pricing or branding here, no need to re-embed anything.</li>
                </ol>
                <p className="text-sm text-gray-500">
                    Not sure how to add embed code to your specific website builder (Wix, Squarespace, WordPress, etc.)? Get in touch and we'll help.
                </p>
            </>
        ),
    },
    {
        id: 'surveyor-tool',
        label: 'The Surveyor Tool',
        title: 'The Surveyor Tool',
        content: (
            <>
                <p>
                    The surveyor tool is for quoting on-site during a survey — your engineer answers questions
                    about the job as they go, picks which boilers to offer, and sends (or hands over) a
                    professional itemised quote before they've even left the house.
                </p>
                <ol className="list-decimal space-y-2 pl-5">
                    <li>Set your materials and labour costs first — <Link href="/admin/help?section=surveyor-pricing" className="text-blue-600 hover:underline">Surveyor Pricing &amp; Margins</Link>.</li>
                    <li>Start a quote from <Link href="/admin/survey" className="text-blue-600 hover:underline">New Survey Quote</Link>, or give each engineer their own personal link from <Link href="/admin/surveyors" className="text-blue-600 hover:underline">Surveyors</Link> so quotes are attributed to whoever created them.</li>
                    <li>Work through the wizard — customer details, current boiler, job type, flue, system components, controls, pipework and so on. Steps that don't apply (e.g. cylinder questions on a combi swap) are skipped automatically.</li>
                    <li>On the boiler step, select up to <strong>5 boilers</strong> to offer. They're shown to the customer cheapest to most expensive and labelled automatically — Good, Better, Best, and Premium/Elite if you add more than three.</li>
                    <li>On the review screen, tap any price to adjust it for this customer, then <strong>Lock prices</strong> before sending. Editing a shared item (labour, controls, etc.) updates every option at once; editing one option's boiler price only affects that option.</li>
                    <li>Preview the customer-facing quote, then email it directly — or hand your tablet over so they can review and accept it on the spot.</li>
                </ol>
                <p>
                    Every quote sent is tracked in <Link href="/admin/surveyor-quotes" className="text-blue-600 hover:underline">Survey Quotes</Link>, showing
                    how many options were offered, the price range, views, and whether — and which option — the customer accepted.
                </p>
            </>
        ),
    },
    {
        id: 'surveyor-pricing',
        label: 'Surveyor Pricing & Margins',
        title: 'Surveyor Pricing & Margins',
        content: (
            <>
                <p>
                    <Link href="/admin/surveyor-pricing" className="text-blue-600 hover:underline">Surveyor Pricing</Link> holds
                    every material and labour cost the surveyor tool can add to a quote — flue kits, cylinders,
                    system components, controls, filters, pipework, radiators, and more — grouped by category.
                </p>
                <ul className="list-disc space-y-2 pl-5">
                    <li>Enter each item's <strong>cost price</strong> (what it costs you), excluding VAT. Untick an item to hide it from the surveyor tool without deleting its price.</li>
                    <li>Set a <strong>margin %</strong> per category to mark cost prices up automatically on every quote — for example 20% on copper, 15% on controls. The margin is applied before VAT and baked straight into the line item, so customers never see it as a separate charge.</li>
                    <li>The <strong>Boiler</strong> margin at the top applies to every boiler's trade price (set trade prices themselves in <Link href="/admin/boilers" className="text-blue-600 hover:underline">Boilers</Link>).</li>
                    <li><strong>Labour is never marked up</strong> — there's no margin field for it, by design.</li>
                </ul>
                <p className="text-sm text-gray-500">
                    Leave a category's margin at 0% to charge the cost price exactly as entered. Use <strong>Restore
                    missing defaults</strong> if a new item type is added to the price list later — it only adds
                    what's missing and never overwrites prices you've already set.
                </p>
            </>
        ),
    },
    {
        id: 'quote-trust',
        label: 'Quote Settings & Finance',
        title: 'Quote Settings & Finance',
        content: (
            <>
                <p>
                    A few settings under <Link href="/admin/settings" className="text-blue-600 hover:underline">Settings</Link> control
                    what a customer sees on a surveyor quote beyond the price — these build trust and explain
                    payment options.
                </p>
                <ul className="list-disc space-y-2 pl-5">
                    <li><strong>Quote Validity (Days)</strong> and <strong>Workmanship Warranty (Months)</strong> — shown as a "Price held until…" date and a workmanship guarantee badge on every quote.</li>
                    <li><strong>Google Reviews URL</strong> / <strong>Trustpilot URL</strong> — adds a star-rating link to your reviews near the top of the quote. Leave blank to hide it.</li>
                </ul>
                <p>
                    Under <strong>Finance Settings</strong>, if finance is enabled the customer sees a live <strong>deposit
                    slider</strong> — dragging it between your minimum required deposit and 90% instantly recalculates
                    the deposit, loan amount and monthly payment for every finance option on their quote.
                </p>
                <p>
                    If you offer finance, UK regulation requires a specific disclosure naming your Introducer
                    Appointed Representative status, registered details and lender/broker information. Paste the
                    exact wording your finance provider requires into <strong>Finance Regulatory Disclosure</strong> —
                    it's shown in full at the bottom of the finance section on every quote. This varies by company
                    and provider, so there's no default text; leave it blank if you don't offer finance.
                </p>
            </>
        ),
    },
    {
        id: 'leads',
        label: 'Managing Leads',
        title: 'Managing Leads',
        content: (
            <>
                <p>
                    Every enquiry from your calculator lands in <Link href="/admin/leads" className="text-blue-600 hover:underline">Leads</Link> automatically —
                    name, contact details, boiler chosen, quote value, and any photos or survey booking they've submitted.
                </p>
                <ul className="list-disc space-y-2 pl-5">
                    <li>Click into any lead to see full details, including uploaded photos.</li>
                    <li>The status badge shows where each lead is in your process (New Lead, Photos Uploaded, Quoted, etc.).</li>
                    <li>Anything tagged <strong>Test</strong> came from your own Test Quote runs, not a real customer.</li>
                </ul>
            </>
        ),
    },
    {
        id: 'service-plans',
        label: 'Service Plans',
        title: 'Service Plans',
        content: (
            <>
                <p>
                    Service Plans is a premium add-on that lets customers sign up online for annual boiler
                    cover plans, with their own GoCardless Direct Debit. If you don't see this in your sidebar
                    yet, get in touch to have it added to your account.
                </p>
                <ol className="list-decimal space-y-2 pl-5">
                    <li>Go to <Link href="/admin/service-plans" className="text-blue-600 hover:underline">Service Plans</Link> and click <strong>Add a Plan</strong> to build a tier (e.g. Bronze/Silver/Gold), with monthly/annual pricing and what's included.</li>
                    <li>In your own GoCardless account, create a Billing Request Template (a reusable payment link) for that plan, and paste its link into the plan.</li>
                    <li>Mark one plan as "Most Popular" if you want it highlighted to customers.</li>
                    <li>Share your sign-up link or embed code (shown at the bottom of the Service Plans page) the same way you embedded the quote calculator.</li>
                </ol>
                <p className="text-sm text-gray-500">
                    Customers who sign up are saved as <strong>Pending</strong> until you confirm their Direct
                    Debit is active in GoCardless — there's no automatic two-way sync yet, so check GoCardless
                    directly for payment status.
                </p>
            </>
        ),
    },
    {
        id: 'support',
        label: 'Getting Help',
        title: 'Getting Help',
        content: (
            <>
                <p>
                    Stuck on something not covered here, or found something that doesn't look right? Get in
                    touch and we'll help directly — most things can be fixed quickly.
                </p>
            </>
        ),
    },
]

export default async function HelpPage({
    searchParams,
}: {
    searchParams: Promise<{ section?: string }>
}) {
    const { section } = await searchParams
    const activeSection = SECTIONS.find((s) => s.id === section) || SECTIONS[0]

    return (
        <main className="min-h-screen bg-[#f5f7fb] p-8">
            <div className="mx-auto max-w-6xl">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin"
                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md"
                    >
                        ← Admin Panel
                    </Link>
                    <div>
                        <h1 className="text-4xl font-bold">Help &amp; Guide</h1>
                        <p className="text-sm text-gray-500">
                            A step-by-step guide to setting up and using your quote calculator.
                        </p>
                    </div>
                </div>

                <div className="mt-8 grid gap-6 lg:grid-cols-[260px_1fr]">
                    <nav className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        {SECTIONS.map((s) => (
                            <Link
                                key={s.id}
                                href={`/admin/help?section=${s.id}`}
                                className={`block border-b border-slate-100 px-5 py-4 text-sm font-medium transition-colors last:border-0 ${activeSection.id === s.id
                                    ? 'bg-[color-mix(in_srgb,var(--brand,#16a34a)_10%,white)] text-[var(--brand,#16a34a)]'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                {s.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                        <h2 className="text-2xl font-bold">{activeSection.title}</h2>
                        <div className="mt-4 space-y-4 text-gray-700 [&_ol]:space-y-2 [&_ul]:space-y-2">
                            {activeSection.content}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    )
}
