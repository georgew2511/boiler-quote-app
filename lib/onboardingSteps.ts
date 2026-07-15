export interface OnboardingStep {
    id: string
    title: string
    description: string
    cta: string
    href: string
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
    {
        id: 'pricing',
        title: 'Set up your pricing',
        description: "This is what turns your calculator into real, accurate quotes. Set your installation costs and surcharges so every price a customer sees is one you're happy to honour.",
        cta: 'Set Up Pricing',
        href: '/admin/pricing',
    },
    {
        id: 'boilers',
        title: 'Check your boilers',
        description: "We've pre-loaded a starter catalogue — review it and add or remove boilers so customers only see what you actually install.",
        cta: 'Review Boilers',
        href: '/admin/boilers',
    },
    {
        id: 'branding',
        title: 'Brand your calculator',
        description: 'Add your logo and brand colour so the calculator looks like part of your own website.',
        cta: 'Add Branding',
        href: '/admin/settings',
    },
    {
        id: 'test-quote',
        title: 'Run a test quote',
        description: 'Walk through the calculator yourself to check the boilers, prices and branding all look right before it goes live.',
        cta: 'Run Test Quote',
        href: '/admin/test-quote',
    },
    {
        id: 'embed',
        title: 'Embed it on your website',
        description: 'Grab your embed code and put the calculator live on your site so customers can start getting instant quotes.',
        cta: 'Get Embed Code',
        href: '/admin/embed-code',
    },
]
