'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ONBOARDING_STEPS } from '@/lib/onboardingSteps'

export default function OnboardingGuide({
    initialStep,
    initialDismissed,
}: {
    initialStep: number
    initialDismissed: boolean
}) {
    const router = useRouter()
    const [step, setStep] = useState(initialStep)
    const [dismissed, setDismissed] = useState(initialDismissed)
    const [expanded, setExpanded] = useState(initialStep === 0)
    const [neverShowAgain, setNeverShowAgain] = useState(false)

    if (dismissed || step >= ONBOARDING_STEPS.length) return null

    const current = ONBOARDING_STEPS[step]
    const isFirstEver = step === 0 && expanded

    function persist(update: { step?: number; dismissed?: boolean }) {
        return fetch('/api/onboarding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(update),
        }).catch(() => {
            // best-effort — local state still drives the UI for this session
        })
    }

    function dismissForever() {
        setDismissed(true)
        persist({ dismissed: true })
    }

    async function goToCurrentStep() {
        const nextStep = step + 1
        setStep(nextStep)
        setExpanded(false)
        // Wait for the write so the next page's server-rendered onboarding
        // state (read fresh from the DB) reflects the advanced step.
        await persist({ step: nextStep })
        router.push(current.href)
    }

    function skipStep() {
        const nextStep = step + 1
        persist({ step: nextStep })
        setStep(nextStep)
    }

    if (isFirstEver) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        Getting started
                    </div>
                    <h3 className="mt-3 text-xl font-bold text-slate-900">Welcome — let&apos;s get your calculator ready</h3>
                    <p className="mt-2 text-sm text-slate-600">
                        We&apos;ll walk you through it step by step, starting here:
                    </p>

                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="font-semibold text-slate-900">{current.title}</p>
                        <p className="mt-1 text-sm text-slate-600">{current.description}</p>
                    </div>

                    <label className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                        <input
                            type="checkbox"
                            checked={neverShowAgain}
                            onChange={(e) => setNeverShowAgain(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300"
                        />
                        Don&apos;t show this again
                    </label>

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => (neverShowAgain ? dismissForever() : setExpanded(false))}
                            className="rounded-xl border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
                        >
                            Maybe later
                        </button>
                        <button
                            type="button"
                            onClick={() => (neverShowAgain ? dismissForever() : goToCurrentStep())}
                            className="rounded-xl bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500"
                        >
                            {current.cta} →
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (!expanded) {
        return (
            <button
                type="button"
                onClick={() => setExpanded(true)}
                className="fixed bottom-5 left-5 z-40 flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-lg transition-transform hover:scale-105 hover:bg-emerald-500"
            >
                <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                Getting Started · Step {step + 1} of {ONBOARDING_STEPS.length}
            </button>
        )
    }

    return (
        <div className="fixed bottom-5 left-5 z-40 w-full max-w-xs rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                    Step {step + 1} of {ONBOARDING_STEPS.length}
                </p>
                <button
                    type="button"
                    onClick={() => setExpanded(false)}
                    className="text-slate-400 hover:text-slate-600"
                    title="Minimise"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <p className="mt-2 font-semibold text-slate-900">{current.title}</p>
            <p className="mt-1 text-sm text-slate-600">{current.description}</p>

            <div className="mt-4 flex items-center justify-between">
                <div className="flex gap-3">
                    <button type="button" onClick={dismissForever} className="text-xs font-medium text-slate-400 hover:text-slate-600">
                        Stop showing
                    </button>
                    <button type="button" onClick={skipStep} className="text-xs font-medium text-slate-400 hover:text-slate-600">
                        Skip
                    </button>
                </div>
                <button
                    type="button"
                    onClick={goToCurrentStep}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                >
                    {current.cta} →
                </button>
            </div>
        </div>
    )
}
