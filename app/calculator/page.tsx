'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { PRICING_DEFINITIONS } from '@/lib/pricingKeys'

// Dynamic guarantee "sticker" overlaid on boiler photos, pulling its number
// straight from that boiler's Warranty (Years) field in the admin.
function GuaranteeBadge({ years, size = 'md' }: { years: number; size?: 'sm' | 'md' }) {
  const dimensions = size === 'sm' ? 'h-16 w-16' : 'h-24 w-24'
  const numberSize = size === 'sm' ? 'text-xl' : 'text-3xl'
  const labelSize = size === 'sm' ? 'text-[8px]' : 'text-[10px]'

  return (
    <div
      className={`absolute bottom-0 right-0 flex ${dimensions} flex-col items-center justify-center rounded-full border-4 border-white bg-[var(--brand)] text-center text-white shadow-lg`}
    >
      <span className={`${numberSize} font-extrabold leading-none`}>{years}</span>
      <span className={`${labelSize} font-semibold uppercase leading-tight`}>
        Year<br />Guarantee
      </span>
    </div>
  )
}

const fallbackPricing = {
  lpg: 500,
  combiSwap: 600,
  standard: 600,
  system: 500,
  backBoiler: 1200,
  convertToCombi: 1500,
  wallMountedNo: 250,
  condensateNeeded: 50,
  relocate: 750,
  roofFlue: 300,
  horizontalFlue: 90,
  wallDistance1to2: 100,
  wallDistance2to3: 200,
  wallDistance3plus: 250,
  squareFlue: 50,
  lowFlue: 50,
  flueStructure: 120,
  flueNearWindow: 120,
  sundries: 150,
}

function CalculatorContent() {
  const [step, setStep] = useState(0)
  const [loadingIndex, setLoadingIndex] = useState(0)
  const [showLeadModal, setShowLeadModal] = useState(false)
  const searchParams = useSearchParams()
  const companyId = searchParams.get('company_id')
  // Set by the admin "Test Quote" page so companies can try the live
  // calculator before embedding it anywhere, without it looking like a real
  // customer enquiry in their Leads list.
  const isPreviewMode = searchParams.get('preview') === '1'

  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [boilers, setBoilers] = useState<any[]>([])
  const [pricingData, setPricingData] = useState(fallbackPricing)
  const [vatRegistered, setVatRegistered] = useState(false)
  // Falls back to the original house green if a company hasn't set a brand
  // colour in Settings yet.
  const [brandColor, setBrandColor] = useState('#16a34a')

  const questions = [
    {
      title: 'What fuel does your boiler use?',
      key: 'fuel',
      options: [
        { label: 'Gas', image: '/icons8-gas-50.png', modifier: 0 },
        { label: 'LPG', image: '/LPG.png', modifier: pricingData.lpg },
      ],
    },
    {
      title: 'What type of boiler do you have ?',
      key: 'boilerType',
      options: [
        { label: 'Combi', image: '/combi.svg', modifier: 0 },
        { label: 'Standard', image: '/standard.svg', modifier: pricingData.standard },
        { label: 'System', image: '/system.svg', modifier: pricingData.system },
        { label: 'Back Boiler', image: '/back-boiler.svg', modifier: pricingData.backBoiler },
      ],
    },
    {
      title: 'Do you want to convert to a combi ?',
      key: 'convertToCombi',
      showIf: (answers: any) =>
        answers.boilerType?.label !== 'Combi',
      options: [
        { label: 'Yes', modifier: pricingData.convertToCombi },
        { label: 'No', modifier: 0 },
      ],
    },
    {
      title: 'How would you describe your current boiler ?',
      key: 'condition',
      options: [
        { label: 'Not working', image: '/not-working.svg', modifier: 0 },
        { label: 'Old and inefficient', image: '/old-inefficient.svg', modifier: 0 },
        { label: 'Other', image: '/question-mark.svg', modifier: 0 },
      ],
    },
    {
      title: 'Is your boiler mounted on the wall ?',
      key: 'wallMounted',
      options: [
        { label: 'Wall Mounted', image: '/wall-mounted.svg', modifier: 0 },
        { label: 'Free Standing', image: '/free-standing.svg', modifier: pricingData.wallMountedNo },
      ],
    },
    {
      title: 'Roughly how old is your boiler ?',
      key: 'age',
      options: [
        { label: 'Up to 10 years', image: '/up-to-ten.svg', modifier: 0 },
        { label: 'Over 10 years', image: '/ten-twenty.svg', modifier: pricingData.condensateNeeded },
        { label: "I'm not sure", image: '/question-mark.svg', modifier: pricingData.condensateNeeded },
      ],
    },
    {
      title: 'Do you want your new boiler in a different place ?',
      key: 'relocate',
      options: [
        { label: 'No', image: '/no.svg', modifier: 0 },
        { label: 'Yes', image: '/yes.svg', modifier: pricingData.relocate },
      ],
    },
    {
      title: 'How many bedrooms do you have ?',
      key: 'bedrooms',
      options: [
        { label: '1 bedroom', image: '/one.svg', modifier: 0 },
        { label: '2 bedrooms', image: '/two.svg', modifier: 0 },
        { label: '3 bedrooms', image: '/three.svg', modifier: 0 },
        { label: '4 bedrooms', image: '/four.svg', modifier: 0 },
        { label: '5 bedrooms', image: '/five.svg', modifier: 0 },
        { label: '6 + bedrooms', image: '/six-plus.svg', modifier: 0 },
      ],
    },
    {
      title: 'How many bathtubs do you have, or plan to have in the future ?',
      key: 'bathtubs',
      options: [
        { label: '0 bathtubs', image: '/zero.svg', modifier: 0 },
        { label: '1 bathtub', image: '/one.svg', modifier: 0 },
        { label: '2 bathtubs', image: '/two.svg', modifier: 0 },
        { label: '3 + bathtubs', image: '/three-plus.svg', modifier: 0 },
      ],
    },
    {
      title: 'How many separate showers do you have, or plan to have in the future ?',
      key: 'showers',
      options: [
        { label: '0 showers', image: '/zero.svg', modifier: 0 },
        { label: '1 shower', image: '/one.svg', modifier: 0 },
        { label: '2 + showers', image: '/two-plus.svg', modifier: 0 },
      ],
    },
    {
      title: 'How many radiators do you have ?',
      key: 'radiators',
      options: [
        { label: '0-5 radiators', image: '/zero-five.svg', modifier: 0 },
        { label: '6 - 9 radiators', image: '/six-nine.svg', modifier: 0 },
        { label: '10 - 13 radiators', image: '/ten-thirteen.svg', modifier: 0 },
        { label: '14 - 16 radiators', image: '/fourteen-sixteen.svg', modifier: 0 },
        { label: '17 + radiators', image: '/seventeen-plus.svg', modifier: 0 },
      ],
    },
    {
      title: 'How does your flue come out ?',
      key: 'flueType',
      options: [
        { label: 'Roof', image: '/roof.svg', modifier: pricingData.roofFlue },
        { label: 'Horizontal', image: '/wall.svg', modifier: pricingData.horizontalFlue },
      ],
    },
    {
      title: 'How far is your current boiler from an outside wall ?',
      key: 'wallDistance',
      showIf: (answers: any) =>
        answers.flueType?.label === 'Horizontal',
      options: [
        { label: 'Under 1 metre', modifier: 0 },
        { label: '1 - 2 metres', modifier: pricingData.wallDistance1to2 },
        { label: '2 - 3 metres', modifier: pricingData.wallDistance2to3 },
        { label: 'Over 3 metres', modifier: pricingData.wallDistance3plus },
      ],
    },
    {
      title: 'Is your current flue square or round ?',
      key: 'flueShape',
      showIf: (answers: any) =>
        answers.flueType?.label === 'Horizontal',
      options: [
        { label: 'Square', modifier: pricingData.squareFlue },
        { label: 'Round', modifier: 0 },
      ],
    },
    {
      title: 'How close to the ground is your flue ?',
      key: 'flueHeight',
      showIf: (answers: any) =>
        answers.flueType?.label === 'Horizontal',
      options: [
        { label: 'More than 2m', modifier: 0 },
        { label: 'Less than 2m', modifier: pricingData.lowFlue },
      ],
    },
    {
      title: 'Is the flue under a carport, balcony or other structure ?',
      key: 'flueStructure',
      showIf: (answers: any) =>
        answers.flueType?.label === 'Horizontal',
      options: [
        { label: 'Yes', modifier: pricingData.flueStructure },
        { label: 'No', modifier: 0 },
      ],
    },
    {
      title: 'Is the flue 30cm or more from a door or window ?',
      key: 'flueWindow',
      showIf: (answers: any) =>
        answers.flueType?.label === 'Horizontal',
      options: [
        { label: 'Yes', modifier: 0 },
        { label: 'No', modifier: pricingData.flueNearWindow },
      ],
    },
  ]

  useEffect(() => {
    async function loadBoilers() {
      if (!companyId) {
        console.error('No company ID supplied')
        return
      }
      const { data, error } = await supabase
        .from('boilers')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'Active')
        .order('price')

      if (!error && data) {
        setBoilers(data)
      }

      // Load pricing modifiers from Supabase (row-based pricing table)
      const { data: pricingRows } = await supabase
        .from('pricing')
        .select('*')
        .eq('company_id', companyId)

      console.log('Pricing rows:', pricingRows)

      if (pricingRows) {
        // Rows are matched by their stable `key` column. Falls back to matching
        // on the old `name` column for rows created before the `key` migration,
        // then to the hardcoded default if neither is found.
        const getPrice = (def: { key: string; name: string; fallback: number }, current: number) => {
          const row = pricingRows.find((r: any) => r.key === def.key) ??
            pricingRows.find((r: any) => r.name === def.name)
          return Number(row?.value ?? current ?? def.fallback)
        }

        setPricingData((prev) => {
          const next = { ...prev }
          for (const def of PRICING_DEFINITIONS) {
            if (def.key in next) {
              (next as any)[def.key] = getPrice(def, (prev as any)[def.key])
            }
          }
          return next
        })
      }
    }

    loadBoilers()
  }, [companyId])

  // GTM/GA are injected here (not in the root layout) because this calculator
  // is embedded on many different companies' websites via ?company_id=, so the
  // tracking IDs that fire have to be scoped to whichever company is loaded.
  useEffect(() => {
    if (!companyId) return

    async function loadTracking() {
      const { data } = await supabase
        .from('company_settings')
        .select('gtm_id, ga4_id, vat_registered, primary_colour, minimum_deposit, apr, zero_percent_term_1, zero_percent_term_2')
        .eq('company_id', companyId)
        .maybeSingle()

      setVatRegistered(!!data?.vat_registered)
      if (data?.primary_colour) setBrandColor(data.primary_colour)
      if (data) {
        setFinanceSettings({
          minimum_deposit: data.minimum_deposit || 500,
          apr: data.apr || 11.9,
          zero_percent_term_1: data.zero_percent_term_1 || 24,
          zero_percent_term_2: data.zero_percent_term_2 || 60,
        })
      }

      const gtmId = data?.gtm_id
      const ga4Id = data?.ga4_id

      if (gtmId && !document.getElementById('gtm-script')) {
        ;(window as any).dataLayer = (window as any).dataLayer || []
        ;(window as any).dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' })

        const script = document.createElement('script')
        script.id = 'gtm-script'
        script.async = true
        script.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`
        document.head.appendChild(script)

        const noscript = document.createElement('noscript')
        const iframe = document.createElement('iframe')
        iframe.src = `https://www.googletagmanager.com/ns.html?id=${gtmId}`
        iframe.height = '0'
        iframe.width = '0'
        iframe.style.display = 'none'
        iframe.style.visibility = 'hidden'
        noscript.appendChild(iframe)
        document.body.appendChild(noscript)
      }

      if (ga4Id && !document.getElementById('ga4-script')) {
        const gtagSrcScript = document.createElement('script')
        gtagSrcScript.async = true
        gtagSrcScript.src = `https://www.googletagmanager.com/gtag/js?id=${ga4Id}`
        document.head.appendChild(gtagSrcScript)

        const inline = document.createElement('script')
        inline.id = 'ga4-script'
        inline.innerHTML = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${ga4Id}');
        `
        document.head.appendChild(inline)
      }
    }

    loadTracking()
  }, [companyId])

  const [customer, setCustomer] = useState({
    name: '',
    email: '',
    phone: '',
  })

  const [selectedBoiler, setSelectedBoiler] = useState<any>(null)
  const [surveyRequested, setSurveyRequested] = useState(false)
  const [leadId, setLeadId] = useState<number | null>(null)
  const [surveyBooking, setSurveyBooking] = useState({
    houseName: '',
    addressLine1: '',
    addressLine2: '',
    town: '',
    county: '',
    postcode: '',
    date: '',
    timeSlot: '',
  })
  const [phoneError, setPhoneError] = useState('')
  const [showFinanceModal, setShowFinanceModal] = useState(false)
  const [financeBoiler, setFinanceBoiler] = useState<any>(null)
  const [showBoilerDetails, setShowBoilerDetails] = useState(false)
  const [detailsBoiler, setDetailsBoiler] = useState<any>(null)

  const [photos, setPhotos] = useState({
    boiler: null as File | null,
    flue: null as File | null,
    gasMeter: null as File | null,
    pipework: null as File | null,
    cylinder: null as File | null,
  })

  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [photoUploadError, setPhotoUploadError] = useState('')
  const [photosUploaded, setPhotosUploaded] = useState(false)
  const [financeSettings, setFinanceSettings] = useState({
    minimum_deposit: 500,
    apr: 11.9,
    zero_percent_term_1: 24,
    zero_percent_term_2: 60,
  })

  const [deposit, setDeposit] = useState(500)
  const [financeYears, setFinanceYears] = useState(24)
  const [financeAPR, setFinanceAPR] = useState(0)

  function calculateFinance(
    amount: number,
    deposit: number,
    years: number,
    apr: number
  ) {
    const principal = amount - deposit

    if (apr === 0) {
      const payments = years * 12

      return {
        monthly: Math.round(principal / payments),
        totalPayable: amount,
      }
    }

    const monthlyRate = apr / 100 / 12
    const payments = years * 12

    const monthly =
      (principal * monthlyRate * Math.pow(1 + monthlyRate, payments)) /
      (Math.pow(1 + monthlyRate, payments) - 1)

    return {
      monthly: Math.round(monthly),
      totalPayable: Math.round(monthly * payments + deposit),
    }
  }

  // Determine base prices based on selected boiler type
  const boilerType = answers.boilerType?.label

  // New modifiers and installationModifier logic
  let installationModifier = 0

  const convertingToCombi = answers.convertToCombi?.label === 'Yes'

  if (boilerType === 'Combi') {
    installationModifier = pricingData.combiSwap
  } else if (boilerType === 'System' && !convertingToCombi) {
    installationModifier = pricingData.system
  } else if (boilerType === 'Standard' && !convertingToCombi) {
    installationModifier = pricingData.standard
  } else if (
    (boilerType === 'System' || boilerType === 'Standard') &&
    convertingToCombi
  ) {
    installationModifier = pricingData.convertToCombi
  } else if (boilerType === 'Back Boiler') {
    installationModifier = pricingData.backBoiler
  }

  const modifiers = Object.entries(answers).reduce(
    (sum: number, [key, answer]: [string, any]) => {
      if (
        key === 'boilerType' ||
        key === 'convertToCombi'
      ) {
        return sum
      }

      const isCombi = answers.boilerType?.label === 'Combi'
      const convertingToCombi = answers.convertToCombi?.label === 'Yes'

      if (
        key === 'radiators' &&
        (isCombi || convertingToCombi)
      ) {
        return sum
      }

      return sum + (answer?.modifier || 0)
    },
    installationModifier
  )

  const loadingStep = questions.length
  const detailsStep = questions.length + 1
  const recommendationsStep = questions.length + 2
  const finalPriceStep = questions.length + 3

  const photoStep = questions.length + 4
  const surveyStep = questions.length + 5
  const totalSteps = surveyStep + 1

  const visibleQuestions = questions.filter(
    (question) => !question.showIf || question.showIf(answers)
  )


  const selectedBoilerType = answers.boilerType?.label

  const targetCategory = convertingToCombi
    ? 'combi'
    : selectedBoilerType === 'System'
      ? 'system'
      : selectedBoilerType === 'Standard'
        ? 'regular'
        : selectedBoilerType === 'Back Boiler'
          ? 'combi'
          : 'combi'


  const bathsLabel = answers.bathtubs?.label || ''
  const showersLabel = answers.showers?.label || ''
  const radsLabel = answers.radiators?.label || ''

  let targetOutputs: number[] = []

  if (targetCategory === 'combi') {
    const hasZeroBaths = bathsLabel.includes('0 bathtub')
    const hasOneBath = bathsLabel.includes('1 bathtub')

    const hasLargeHotWaterDemand =
      bathsLabel.includes('2 bathtubs') ||
      bathsLabel.includes('3 +')

    const lowRadiators =
      radsLabel.includes('0-5') ||
      radsLabel.includes('6 - 9')

    if (
      hasZeroBaths &&
      showersLabel.includes('1 shower') &&
      lowRadiators
    ) {
      targetOutputs = [25]
    } else if (hasOneBath) {
      targetOutputs = [30]
    } else if (
      hasLargeHotWaterDemand &&
      showersLabel.includes('2 +')
    ) {
      targetOutputs = [36]
    } else {
      // Fallback: Always select a combi output when converting to combi
      targetOutputs = [30]
    }
  }

  if (targetCategory === 'system' || targetCategory === 'regular') {
    if (radsLabel === '0-5 radiators') {
      targetOutputs = [12, 15]
    } else if (radsLabel === '6 - 9 radiators') {
      targetOutputs = [18, 21]
    } else if (radsLabel === '10 - 13 radiators') {
      targetOutputs = [24, 27]
    } else if (radsLabel === '14 - 16 radiators') {
      targetOutputs = [24, 27]
    } else if (radsLabel === '17 + radiators') {
      targetOutputs = [30, 35]
    }
  }

  console.log('Radiator label:', radsLabel)
  console.log('Target outputs:', targetOutputs)
  console.log('Current sundries value:', pricingData.sundries)
  console.log('Current modifiers value:', modifiers)
  console.log('COMPANY ID:', companyId)
  console.log('LOADED BOILERS:', boilers)

  const recommendedBoilers = boilers
    .filter((boiler) => {
      if (boiler.category !== targetCategory) {
        return false
      }

      if (targetOutputs.length === 0) {
        return true
      }

      return targetOutputs.includes(Number(boiler.output))
    })
    .map((boiler) => {
      const exVatPrice =
        Number(boiler.price || 0) +
        modifiers +
        Number(pricingData.sundries || 0)

      return {
        ...boiler,
        price: Math.round(exVatPrice * (vatRegistered ? 1.2 : 1)),
      }
    })
    .sort((a, b) => {
      const tierOrder = {
        Better: 0,
        Best: 1,
        Good: 2,
      }
      return (tierOrder[a.tier as keyof typeof tierOrder] ?? 99) -
        (tierOrder[b.tier as keyof typeof tierOrder] ?? 99)
    })


  useEffect(() => {
    if (step !== loadingStep) return

    setLoadingIndex(0)

    const first = setTimeout(() => {
      setLoadingIndex(1)
    }, 1200)

    const second = setTimeout(() => {
      setLoadingIndex(2)
    }, 2800)

    const finish = setTimeout(() => {
      setLoadingIndex(3)
    }, 4300)

    const moveOn = setTimeout(async () => {
      ;(window as any).dataLayer = (window as any).dataLayer || []
      ;(window as any).dataLayer.push({ event: 'recommendations_viewed' })

      // Preview mode skips the contact-details form entirely — companies
      // testing their own pricing shouldn't have to fill in a fake name,
      // email, phone and postcode every time. A placeholder "Test" lead is
      // created silently instead, so photo upload / survey booking (which
      // need a lead id) still work the same as the real flow.
      if (isPreviewMode) {
        const { data } = await supabase
          .from('leads')
          .insert([
            {
              company_id: companyId,
              name: 'Test Preview',
              email: '',
              phone: '',
              postcode: '',
              status: 'Test',
              answers,
            },
          ])
          .select()
          .single()

        if (data) {
          setLeadId(data.id)
        }

        setStep(recommendationsStep)
        return
      }

      setShowLeadModal(true)
      setStep(recommendationsStep)
    }, 4800)

    return () => {
      clearTimeout(first)
      clearTimeout(second)
      clearTimeout(finish)
      clearTimeout(moveOn)
    }
  }, [step])

  useEffect(() => {
    if (showLeadModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [showLeadModal])
  function validatePhone(phone: string) {
    const cleaned = phone.replace(/\s/g, '')
    return /^07\d{9}$/.test(cleaned)
  }

  function isWeekend(dateString: string) {
    if (!dateString) return false

    const day = new Date(dateString).getDay()

    return day === 0 || day === 6
  }

  function selectAnswer(option: any) {
    const currentQuestion = visibleQuestions[step]

    setAnswers({
      ...answers,
      [currentQuestion.key]: option,
    })

    setTimeout(() => {
      if (step < visibleQuestions.length - 1) {
        setStep(step + 1)
      } else {
        setStep(loadingStep)
      }
    }, 200)
  }

  function previousStep() {
    if (step > 0) {
      setStep(step - 1)
    }
  }

  // Helper to upload a photo to Supabase Storage and get public URL
  async function uploadPhoto(file: File, path: string) {
    const { error } = await supabase.storage
      .from('customer-uploads')
      .upload(path, file, {
        upsert: true,
      })

    if (error) throw error

    const { data } = supabase.storage
      .from('customer-uploads')
      .getPublicUrl(path)

    return data.publicUrl
  }
  return (
    <main
      className="min-h-screen bg-gray-50 flex items-center justify-center p-6"
      style={{ '--brand': brandColor } as React.CSSProperties}
    >
      {isPreviewMode && (
        <div className="fixed inset-x-0 top-0 z-[60] bg-amber-500 px-4 py-2 text-center text-sm font-semibold text-amber-950 shadow">
          Preview Mode — this is exactly what your customers will see. Any submission is tagged "Test" in your Leads list, not a real enquiry.
        </div>
      )}
      <style jsx global>{`
        @keyframes circleLoading {
          from {
            stroke-dashoffset: 339.3;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        .animate-circle-loading {
          animation: circleLoading 1.6s linear infinite, spin 1.6s linear infinite;
          transform-origin: center;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
      <div className="w-full max-w-6xl rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-[0_8px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm">

        <div className="mb-8">
          <div className="h-2 bg-gray-200 rounded-full">
            <div
              className="h-2 bg-[var(--brand)] rounded-full transition-all"
              style={{
                width: `${Math.min((step / (totalSteps - 1)) * 100, 100)}%`,
              }}
            />
          </div>
        </div>

        {step < visibleQuestions.length && (
          <>
            <h1 className="text-3xl font-bold">
              {visibleQuestions[step].title}
            </h1>

            <div className="grid gap-4 mt-6 md:grid-cols-2 justify-items-center">
              {visibleQuestions[step].options.map((option) => (
                <button
                  key={option.label}
                  onClick={() => selectAnswer(option)}
                  className="mx-auto w-full max-w-[420px] rounded-3xl border border-slate-200 bg-white p-4 md:p-6 text-center shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[var(--brand)] hover:shadow-lg min-h-[120px] md:min-h-[180px] lg:min-h-[220px] flex flex-col items-center justify-center"
                >
                  {'image' in option && option.image && (
                    <Image
                      src={option.image}
                      alt={option.label}
                      width={120}
                      height={120}
                      className="mx-auto mb-4 h-[50px] w-auto object-contain md:h-[90px] lg:h-[110px]"
                    />
                  )}
                  <div className="text-base font-semibold md:text-lg">
                    {option.label}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={previousStep}
              disabled={step === 0}
              className="mt-8 w-full rounded-xl border p-4 font-semibold disabled:opacity-30"
            >
              Back
            </button>
          </>
        )}

        {step === loadingStep && (
          <>
            <div className="py-12 text-center">
              <div className="mb-10 flex items-center justify-center gap-3">
                {/* Relode's own brand mark — intentionally not themed to the company's colour */}
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22c55e] to-[#059669] text-lg font-bold text-white">
                  R
                </div>
                <span className="font-semibold text-slate-700">
                  Powered by Relode
                </span>
              </div>

              <h1 className="text-4xl font-bold text-slate-900">
                Analysing your home
              </h1>

              <p className="mt-4 text-lg text-slate-600">
                Matching your property with suitable boilers, installation requirements and fixed pricing.
              </p>

              <div className="mt-10 flex justify-center">
                <svg
                  className="h-32 w-32 text-[var(--brand)]"
                  viewBox="0 0 120 120"
                  fill="none"
                >
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    stroke="currentColor"
                    strokeOpacity="0.15"
                    strokeWidth="8"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray="339.3"
                    strokeDashoffset="339.3"
                    className="animate-circle-loading"
                  />
                </svg>
              </div>

              <div className="mt-16 space-y-4 max-w-3xl mx-auto">
                <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
                  <span>Selecting suitable boilers</span>
                  <span className="font-semibold text-[var(--brand)]">
                    {loadingIndex > 0 ? 'Complete' : 'Processing'}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
                  <span>Calculating installation requirements</span>
                  <span className={`font-semibold ${loadingIndex > 1 ? 'text-[var(--brand)]' : 'animate-pulse text-blue-600'}`}>
                    {loadingIndex > 1 ? 'Complete' : 'Processing'}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
                  <span>Generating fixed pricing</span>
                  <span className={`font-semibold ${loadingIndex > 2 ? 'text-[var(--brand)]' : 'animate-pulse text-blue-600'}`}>
                    {loadingIndex > 2 ? 'Complete' : 'Processing'}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {step === recommendationsStep && (
          <>
            {/*
              Immediately after the recommendedBoilers calculation block, add:
              const lowestRecommendedPrice = recommendedBoilers.length
                ? recommendedBoilers[0].price
                : 0
            */}
            {(() => {
              const lowestRecommendedPrice = recommendedBoilers.length
                ? recommendedBoilers[0].price
                : 0
              return null
            })()}
            {recommendedBoilers.length === 0 && (
              <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-center text-amber-800">
                No boilers found for category: {targetCategory}. Add boilers with category values of combi, system or regular in the admin panel.
              </div>
            )}
            <h1 className="text-3xl font-bold mb-4 text-center">
              {customer.name ? `${customer.name}, recommended boilers for your home` : 'Recommended boilers for your home'}
            </h1>
            <div className="mb-6 rounded-xl bg-[color-mix(in_srgb,var(--brand)_8%,white)] p-4 text-center">
              <p className="font-semibold">
                ⭐⭐⭐⭐⭐ Rated Excellent
              </p>

              <p className="text-sm text-gray-600">
                Trusted by hundreds of Surrey homeowners
              </p>
            </div>

            <p className="text-gray-600 mb-8 text-center">
              Based on your answers, we recommend these fixed price options.
            </p>

            <div className="grid gap-4">
              {recommendedBoilers.map((boiler) => (
                <div
                  key={boiler.name}
                  className={`rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all duration-300 hover:shadow-xl sm:p-6 ${boiler.tier === 'Better'
                    ? 'border-2 border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_8%,white)] shadow-lg'
                    : 'border-gray-300'
                    }`}
                >
                  {/* Name/tier always shown first, on every screen size, before the
                      image/details/price below get reordered for mobile. */}
                  <p className="text-sm font-semibold text-[var(--brand)]">
                    {boiler.tier}
                  </p>

                  {boiler.tier === 'Better' && (
                    <span className="inline-block mt-2 rounded-full bg-[var(--brand)] px-3 py-1 text-xs font-bold text-white">
                      OUR BEST SELLER
                    </span>
                  )}

                  <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
                    {boiler.name}
                  </h2>

                  <div className="mt-5 grid gap-6 lg:grid-cols-[320px_1fr_320px] items-start">
                    {/* Image: first on mobile (after name above) and desktop alike */}
                    <div className="order-1 flex flex-col items-center justify-start w-full lg:order-1">
                      <div className="relative mx-auto w-full max-w-[280px]">
                        {boiler.image ? (
                          <img
                            src={boiler.image}
                            alt={boiler.name}
                            className="mx-auto max-h-[220px] w-full object-contain sm:max-h-[300px] lg:max-h-[380px]"
                          />
                        ) : (
                          <div className="flex h-[220px] w-full items-center justify-center rounded-xl border border-dashed text-gray-400 sm:h-[300px]">
                            No image uploaded
                          </div>
                        )}
                        {Number(boiler.warranty) > 0 && <GuaranteeBadge years={Number(boiler.warranty)} />}
                      </div>
                      <div className="mt-4 mx-auto w-full max-w-[320px] rounded-xl border border-[color-mix(in_srgb,var(--brand)_30%,white)] bg-[color-mix(in_srgb,var(--brand)_8%,white)] p-4 text-left">
                        <p className="font-semibold text-[color-mix(in_srgb,var(--brand)_70%,black)]">
                          Next step: Photo verification
                        </p>
                        <p className="mt-2 text-sm text-[color-mix(in_srgb,var(--brand)_80%,black)]">
                          Upload a few photos and we'll confirm your guaranteed fixed price.
                        </p>
                      </div>
                    </div>
                    {/* Price & call-to-action: pulled up to 2nd on mobile (right
                        after the photo) so it's never buried under the long
                        specs/description block below. Desktop keeps it as the
                        3rd (rightmost) column via lg:order-3. */}
                    <div className="order-2 w-full max-w-[320px] justify-self-center rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm lg:order-3">
                      <p className="text-center font-semibold text-gray-700">
                        Your fixed price including installation
                      </p>
                      <div className="mt-6 grid grid-cols-2 gap-3">
                        <div className="rounded-lg bg-white p-4">
                          <p className="text-sm text-gray-500">Pay today</p>
                          <p className="mt-2 text-3xl font-bold">
                            £{boiler.price.toLocaleString()}
                          </p>
                        </div>
                        <div className="rounded-lg bg-white p-4">
                          <p className="text-sm text-gray-500">Monthly cost</p>
                          <p className="mt-2 text-3xl font-bold">
                            £{Math.round(boiler.price / 48)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation()

                          setSelectedBoiler(boiler)

                          if (typeof window !== 'undefined') {
                            ; (window as any).dataLayer = (window as any).dataLayer || []
                              ; (window as any).dataLayer.push({
                                event: 'boiler_selected',
                                boiler_name: boiler.name,
                                boiler_price: boiler.price,
                                boiler_tier: boiler.tier,
                              })
                          }

                          if (leadId) {
                            const { error } = await supabase
                              .from('leads')
                              .update({
                                boiler_name: boiler.name,
                                boiler_category: boiler.category,
                                boiler_output: boiler.output,
                                quote_price: boiler.price,
                                recommended_boilers: recommendedBoilers.map((b) => ({
                                  name: b.name,
                                  category: b.category,
                                  output: b.output,
                                  price: b.price,
                                  tier: b.tier,
                                })),
                              })
                              .eq('id', leadId)

                            if (error) {
                              console.error('Lead update error:', error)
                            }
                          }

                          setStep(finalPriceStep)
                        }}
                        className="mt-6 w-full rounded-xl bg-[var(--brand)] p-4 font-semibold text-white"
                      >
                        Choose
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFinanceBoiler(boiler)
                          setDeposit(financeSettings.minimum_deposit)
                          setFinanceAPR(0)
                          setFinanceYears(financeSettings.zero_percent_term_1)
                          setShowFinanceModal(true)
                        }}
                        className="mt-3 w-full rounded-xl border border-[color-mix(in_srgb,var(--brand)_55%,white)] bg-white p-4 font-semibold text-[var(--brand)]"
                      >
                        View finance calculator
                      </button>
                      <button type="button" className="mt-3 w-full rounded-xl border-2 border-[var(--brand)] bg-white p-4 font-semibold text-[var(--brand)]">
                        Save this quote
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setStep(surveyStep)
                        }}
                        className="mt-3 w-full rounded-xl border-2 border-blue-600 bg-white p-4 font-semibold text-blue-700"
                      >
                        Book Home Survey Instead
                      </button>
                    </div>
                    {/* Supporting details/specs: pushed to last on mobile since
                        it's descriptive, not decision-critical, content. Desktop
                        keeps it as the middle column via lg:order-2. */}
                    <div className="order-3 lg:order-2">
                      <div className="rounded-xl border p-6">
                        <h3 className="text-2xl font-semibold">
                          Recommended for your home
                        </h3>

                        <p className="mt-4 text-gray-600">
                          Based on your answers, this is one of our most suitable boiler options.
                        </p>

                        <button
                          type="button"
                          onClick={() => {
                            setDetailsBoiler(boiler)
                            setShowBoilerDetails(true)
                          }}
                          className="mt-4 font-semibold text-[var(--brand)] underline"
                        >
                          See what's included
                        </button>

                      </div>

                      <div className="mt-5 rounded-xl border p-6">
                        <h4 className="font-semibold mb-4">Specifications</h4>
                        <ul className="space-y-3 text-gray-700">
                          <li>
                            ✓ {boiler.warranty
                              ? `${boiler.warranty} Year Warranty`
                              : 'Manufacturer Warranty'}
                          </li>
                          <li>✓ A-Rated Efficiency</li>
                          <li>✓ Magnetic Filter Included</li>
                          <li>✓ Gas Safe Installation</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep(detailsStep)}
              className="mt-6 w-full rounded-xl border p-4 font-semibold"
            >
              Back
            </button>
          </>
        )}

        {step === photoStep && (
          <>
            <h1 className="text-3xl font-bold text-center">
              Almost there, {customer.name}
            </h1>

            <p className="mt-4 text-center text-gray-600">
              Upload a few photos so we can guarantee your fixed price.
            </p>

            <div className="mt-6 rounded-xl bg-[color-mix(in_srgb,var(--brand)_8%,white)] p-4 text-center text-[color-mix(in_srgb,var(--brand)_80%,black)]">
              🔒 We use these photos to confirm your installation requirements and guarantee your fixed price.
              <br />
              Most quotes are reviewed within 30 minutes during office hours.
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {[
                ['boiler', 'Boiler'],
                ['flue', 'Flue'],
                ['gasMeter', 'Gas Meter'],
                ['pipework', 'Pipework'],
              ].map(([key, label]) => (
                <div key={key} className="rounded-xl border p-6 text-center">
                  <div className="text-5xl">📷</div>
                  <h3 className="mt-3 font-semibold">{label}</h3>

                  <input
                    id={`upload-${key}`}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      setPhotos((prev) => ({ ...prev, [key]: file }))
                    }}
                  />

                  <label
                    htmlFor={`upload-${key}`}
                    className="mt-4 inline-flex cursor-pointer items-center justify-center rounded-xl bg-[var(--brand)] px-6 py-3 font-semibold text-white hover:brightness-90"
                  >
                    📷 Take Photo
                  </label>

                  {(photos as any)[key] ? (
                    <div className="mt-3 rounded-lg bg-[color-mix(in_srgb,var(--brand)_8%,white)] p-2 text-sm font-semibold text-[var(--brand)]">
                      ✓ Photo Uploaded
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-gray-500">
                      Tap to take or upload a photo
                    </p>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={async () => {
                if (!leadId) {
                  setStep(finalPriceStep)
                  return
                }

                try {
                  setUploadingPhotos(true)
                  setPhotoUploadError('')

                  const updates: any = {
                    last_updated: new Date().toISOString(),
                    status: 'Photos Uploaded',
                  }

                  if (photos.boiler) {
                    updates.boiler_photo = await uploadPhoto(
                      photos.boiler,
                      `${leadId}/boiler-${Date.now()}.jpg`
                    )
                  }

                  if (photos.flue) {
                    updates.flue_photo = await uploadPhoto(
                      photos.flue,
                      `${leadId}/flue-${Date.now()}.jpg`
                    )
                  }

                  if (photos.gasMeter) {
                    updates.gas_meter_photo = await uploadPhoto(
                      photos.gasMeter,
                      `${leadId}/gas-meter-${Date.now()}.jpg`
                    )
                  }

                  if (photos.pipework) {
                    updates.pipework_photo = await uploadPhoto(
                      photos.pipework,
                      `${leadId}/pipework-${Date.now()}.jpg`
                    )
                  }

                  if (photos.cylinder) {
                    updates.cylinder_photo = await uploadPhoto(
                      photos.cylinder,
                      `${leadId}/cylinder-${Date.now()}.jpg`
                    )
                  }

                  // GTM event: photos_uploaded
                  if (typeof window !== 'undefined') {
                    ; (window as any).dataLayer = (window as any).dataLayer || []
                      ; (window as any).dataLayer.push({
                        event: 'photos_uploaded',
                        lead_id: leadId,
                      })
                  }

                  const { error } = await supabase
                    .from('leads')
                    .update(updates)
                    .eq('id', leadId)

                  if (error) {
                    console.error('Photo save error:', error)
                    setPhotoUploadError(
                      "Something went wrong uploading your photos. Please try again, or contact us if it keeps happening."
                    )
                    return
                  }

                  setPhotosUploaded(true)
                  setStep(finalPriceStep)
                } catch (err: any) {
                  console.error('Upload failed:', err)
                  setPhotoUploadError(
                    "Something went wrong uploading your photos. Please try again, or contact us if it keeps happening."
                  )
                } finally {
                  setUploadingPhotos(false)
                }
              }}
              disabled={!(photos.boiler && photos.flue && photos.gasMeter && photos.pipework) || uploadingPhotos}
              className="mt-8 w-full rounded-xl bg-[var(--brand)] p-4 font-semibold text-white disabled:opacity-30"
            >
              {uploadingPhotos ? 'Uploading Photos...' : 'Secure My Fixed Price'}
            </button>

            {photoUploadError && (
              <p className="mt-3 text-center text-sm text-red-600">{photoUploadError}</p>
            )}

            <button
              onClick={() => setStep(recommendationsStep)}
              className="mt-4 w-full rounded-xl border p-4 font-semibold"
            >
              Back
            </button>
          </>
        )}

        {step === surveyStep && (
          <>
            <h1 className="text-3xl font-bold text-center">
              Book Your Home Survey
            </h1>

            <p className="mt-4 text-center text-gray-600">
              Choose a date and time that works for you.
            </p>

            <div className="mt-8 space-y-4">
              <input
                type="text"
                placeholder="House Name / Number"
                value={surveyBooking.houseName}
                onChange={(e) =>
                  setSurveyBooking({
                    ...surveyBooking,
                    houseName: e.target.value,
                  })
                }
                className="w-full rounded-xl border p-4"
              />

              <input
                type="text"
                placeholder="Address Line 1"
                value={surveyBooking.addressLine1}
                onChange={(e) =>
                  setSurveyBooking({
                    ...surveyBooking,
                    addressLine1: e.target.value,
                  })
                }
                className="w-full rounded-xl border p-4"
              />

              <input
                type="text"
                placeholder="Address Line 2 (Optional)"
                value={surveyBooking.addressLine2}
                onChange={(e) =>
                  setSurveyBooking({
                    ...surveyBooking,
                    addressLine2: e.target.value,
                  })
                }
                className="w-full rounded-xl border p-4"
              />

              <input
                type="text"
                placeholder="Town / City"
                value={surveyBooking.town}
                onChange={(e) =>
                  setSurveyBooking({
                    ...surveyBooking,
                    town: e.target.value,
                  })
                }
                className="w-full rounded-xl border p-4"
              />

              <input
                type="text"
                placeholder="County"
                value={surveyBooking.county}
                onChange={(e) =>
                  setSurveyBooking({
                    ...surveyBooking,
                    county: e.target.value,
                  })
                }
                className="w-full rounded-xl border p-4"
              />

              <input
                type="text"
                placeholder="Postcode"
                value={surveyBooking.postcode}
                onChange={(e) =>
                  setSurveyBooking({
                    ...surveyBooking,
                    postcode: e.target.value.toUpperCase(),
                  })
                }
                className="w-full rounded-xl border p-4"
              />

              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={surveyBooking.date}
                onChange={(e) => {
                  const selectedDate = e.target.value

                  if (isWeekend(selectedDate)) {
                    alert('Please choose Monday to Friday')
                    return
                  }

                  setSurveyBooking({
                    ...surveyBooking,
                    date: selectedDate,
                  })
                }}
                className="w-full rounded-xl border p-4"
              />

              <select
                value={surveyBooking.timeSlot}
                onChange={(e) =>
                  setSurveyBooking({
                    ...surveyBooking,
                    timeSlot: e.target.value,
                  })
                }
                className="w-full rounded-xl border p-4"
              >
                <option value="">Select Time Slot</option>
                <option value="08:00 - 11:00">08:00 - 11:00</option>
                <option value="11:00 - 13:00">11:00 - 13:00</option>
                <option value="13:00 - 15:00">13:00 - 15:00</option>
                <option value="15:00 - 17:00">15:00 - 17:00</option>
                <option value="17:00 - 19:00">17:00 - 19:00</option>
              </select>

              <button
                onClick={async () => {
                  const day = new Date(surveyBooking.date).getDay()

                  if (day === 0 || day === 6) {
                    alert('Please select Monday to Friday')
                    return
                  }

                  // GTM event: survey_requested
                  if (typeof window !== 'undefined') {
                    ; (window as any).dataLayer = (window as any).dataLayer || []
                      ; (window as any).dataLayer.push({
                        event: 'survey_requested',
                        lead_id: leadId,
                        survey_date: surveyBooking.date,
                        survey_time_slot: surveyBooking.timeSlot,
                      })
                  }

                  await supabase
                    .from('leads')
                    .update({
                      status: 'Home Survey Requested',
                      survey_address: `${surveyBooking.houseName}, ${surveyBooking.addressLine1}, ${surveyBooking.addressLine2}, ${surveyBooking.town}, ${surveyBooking.county}, ${surveyBooking.postcode}`,
                      survey_date: surveyBooking.date,
                      survey_time_slot: surveyBooking.timeSlot,
                      last_updated: new Date().toISOString(),
                    })
                    .eq('id', leadId)

                  alert('Survey booked successfully')
                  setStep(recommendationsStep)
                }}
                disabled={
                  !surveyBooking.houseName ||
                  !surveyBooking.addressLine1 ||
                  !surveyBooking.town ||
                  !surveyBooking.postcode ||
                  !surveyBooking.date ||
                  !surveyBooking.timeSlot
                }
                className="w-full rounded-xl bg-blue-600 p-4 font-semibold text-white disabled:opacity-30"
              >
                Book Home Survey
              </button>

              <button
                onClick={() => setStep(recommendationsStep)}
                className="w-full rounded-xl border p-4 font-semibold"
              >
                Back
              </button>
            </div>
          </>
        )}

        {step === finalPriceStep && (
          <>
            {photosUploaded && (
              <div className="mb-6 rounded-2xl bg-[color-mix(in_srgb,var(--brand)_10%,white)] p-5 text-center text-[color-mix(in_srgb,var(--brand)_80%,black)]">
                <p className="text-lg font-semibold">✓ Photos received</p>
                <p className="mt-1 text-sm">
                  Thanks {customer.name?.split(' ')[0]}! We're reviewing your installation requirements now and
                  will confirm your guaranteed fixed price shortly — most quotes are reviewed within 30 minutes
                  during office hours.
                </p>
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <h1 className="text-3xl font-bold mb-4">
                  Your fixed online boiler quote
                </h1>

                <p className="text-gray-600 mb-8">
                  This is your estimated installation price based on the information provided.
                </p>

                <div className="rounded-3xl bg-gradient-to-br from-[var(--brand)] to-[color-mix(in_srgb,var(--brand)_70%,black)] p-8 text-center text-white shadow-[0_12px_40px_rgba(34,197,94,0.25)]">
                  <p className="text-sm uppercase tracking-wide text-white/80">
                    Guaranteed fixed price after photo check
                  </p>

                  <p className="mt-3 text-lg font-semibold">
                    {selectedBoiler?.name}
                  </p>

                  <p className="mt-3 text-6xl font-bold">
                    £{selectedBoiler?.price?.toLocaleString()}
                  </p>

                  <p className="mt-2 text-sm text-white/80">
                    Or from £{Math.round(selectedBoiler?.price / 48)}/month
                  </p>
                </div>

                <div className="mt-6 rounded-2xl border-2 border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_8%,white)] p-6">
                  <h2 className="text-2xl font-bold">Almost done</h2>

                  <p className="mt-3 text-gray-700">
                    Upload a few photos and we'll confirm your installation requirements and lock in your guaranteed fixed price.
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-white p-3">📷 Boiler</div>
                    <div className="rounded-lg bg-white p-3">📷 Flue</div>
                    <div className="rounded-lg bg-white p-3">📷 Gas Meter</div>
                    <div className="rounded-lg bg-white p-3">📷 Cylinder (if applicable)</div>
                  </div>
                </div>

                <div className="mt-6 rounded-xl border p-5">
                  <h2 className="mb-3 font-semibold">
                    Included as standard
                  </h2>
                  <ul className="space-y-2 text-gray-700">
                    <li>✓ Boiler supplied and installed</li>
                    <li>✓ Magnetic system filter</li>
                    <li>✓ Chemical system treatment</li>
                    <li>✓ Gas Safe registered installation</li>
                    <li>✓ Manufacturer warranty</li>
                    <li>✓ System commissioning and certification</li>
                  </ul>
                </div>

                {/* Photo Verification / Home Survey block moved below green price card */}

                <div className="mt-6 rounded-xl bg-gray-50 p-5">
                  {/* Photo Verification / Home Survey block - moved from above */}
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {photosUploaded ? (
                      <div className="rounded-2xl border-2 border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_8%,white)] p-6 text-left">
                        <h3 className="text-xl font-bold">✓ Photos Uploaded</h3>
                        <p className="mt-2 text-gray-600">
                          Got it — we'll confirm your installation requirements and fixed price shortly.
                        </p>
                        <button
                          onClick={() => {
                            setSurveyRequested(false)
                            setStep(photoStep)
                          }}
                          className="mt-3 text-sm font-semibold text-[var(--brand)] underline"
                        >
                          Add or replace a photo
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setSurveyRequested(false)
                          setStep(photoStep)
                        }}
                        className="rounded-2xl border-2 border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_8%,white)] p-6 text-left transition hover:bg-[color-mix(in_srgb,var(--brand)_15%,white)]"
                      >
                        <h3 className="text-xl font-bold">📷 Photo Verification</h3>
                        <p className="mt-2 text-gray-600">
                          Upload a few photos and we'll confirm your installation requirements and fixed price.
                        </p>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setStep(surveyStep)
                      }}
                      className="rounded-2xl border-2 border-blue-600 bg-blue-50 p-6 text-left transition hover:bg-blue-100"
                    >
                      <h3 className="text-xl font-bold">🏠 Book a Home Survey</h3>
                      <p className="mt-2 text-gray-600">
                        Prefer a home visit? Request a survey and we'll contact you to arrange an appointment.
                      </p>
                    </button>
                  </div>

                  {surveyRequested && (
                    <div className="mt-6 rounded-xl bg-blue-50 p-5 text-blue-900">
                      ✓ Home survey requested. Our team will contact you to arrange an appointment.
                    </div>
                  )}
                  <h3 className="font-semibold">What happens next?</h3>

                  <div className="mt-4 space-y-3 text-sm text-gray-700">
                    <p><strong>1.</strong> {photosUploaded ? '✓ Photos uploaded' : 'Upload your photos'}</p>
                    <p><strong>2.</strong> Surrey Gas reviews your installation requirements</p>
                    <p><strong>3.</strong> We confirm your guaranteed fixed price</p>
                    <p><strong>4.</strong> Choose an installation date that suits you</p>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.08)] h-fit">
                <div className="text-center">
                  <div className="text-4xl">⭐⭐⭐⭐⭐</div>
                  <h3 className="mt-3 text-xl font-bold">Rated Excellent</h3>
                  <p className="mt-2 text-sm text-gray-600">
                    Trusted by Surrey homeowners.
                  </p>
                </div>

                <div className="mt-6 border-t pt-6">
                  <h4 className="font-semibold">Your next steps</h4>

                  <div className="mt-4 space-y-4 text-sm">
                    <div>1. {photosUploaded ? '✓ Photos uploaded' : 'Upload photos'}</div>
                    <div>2. We review everything</div>
                    <div>3. Fixed price confirmed</div>
                    <div>4. Choose installation date</div>
                  </div>
                </div>

                <button
                  className="mt-8 w-full rounded-xl bg-[var(--brand)] p-4 font-semibold text-white"
                  onClick={() => {
                    setSurveyRequested(false)
                    setStep(photoStep)
                  }}
                >
                  Upload Photos
                </button>
                <button
                  onClick={() => {
                    setStep(surveyStep)
                  }}
                  className="mt-3 w-full rounded-xl border-2 border-blue-600 bg-white p-4 font-semibold text-blue-700"
                >
                  Book Home Survey
                </button>

                <p className="mt-3 text-center text-xs text-gray-500">
                  No obligation • Fully insured • Gas Safe registered
                </p>
              </div>
            </div>
            <button
              onClick={() => setStep(recommendationsStep)}
              className="mt-4 w-full rounded-xl border p-4 font-semibold"
            >
              Back
            </button>
          </>
        )}
      </div>

      {showLeadModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-6">
          <div className="w-full max-w-2xl rounded-[32px] border border-slate-200 bg-white p-10 shadow-[0_40px_100px_rgba(15,23,42,0.25)]">
            <h2 className="text-4xl font-bold text-slate-900">
              Your quote is ready
            </h2>

            <p className="mt-3 text-lg text-slate-600">
              Enter your details to unlock your fixed boiler price.
            </p>

            <div className="mt-6 space-y-4">
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-base transition-all focus:border-[var(--brand)] focus:bg-white focus:ring-4 focus:ring-[color-mix(in_srgb,var(--brand)_25%,white)]"
                placeholder="Full Name"
                value={customer.name}
                onChange={(e) => {
                  const formattedName = e.target.value
                    .toLowerCase()
                    .replace(/\b\w/g, (char) => char.toUpperCase())

                  setCustomer({
                    ...customer,
                    name: formattedName,
                  })
                }}
              />

              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-base transition-all focus:border-[var(--brand)] focus:bg-white focus:ring-4 focus:ring-[color-mix(in_srgb,var(--brand)_25%,white)]"
                placeholder="Email Address"
                value={customer.email}
                onChange={(e) =>
                  setCustomer({ ...customer, email: e.target.value })
                }
              />

              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-base transition-all focus:border-[var(--brand)] focus:bg-white focus:ring-4 focus:ring-[color-mix(in_srgb,var(--brand)_25%,white)]"
                placeholder="Postcode"
                value={(customer as any).postcode || ''}
                onChange={(e) =>
                  setCustomer({
                    ...customer,
                    postcode: e.target.value.toUpperCase().trim(),
                  } as any)
                }
              />

              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-base transition-all focus:border-[var(--brand)] focus:bg-white focus:ring-4 focus:ring-[color-mix(in_srgb,var(--brand)_25%,white)]"
                placeholder="Mobile Number"
                value={customer.phone}
                onChange={(e) => {
                  const phone = e.target.value

                  setCustomer({
                    ...customer,
                    phone,
                  })

                  if (phone && !validatePhone(phone)) {
                    setPhoneError('Please enter a valid UK mobile number')
                  } else {
                    setPhoneError('')
                  }
                }}
              />

              {phoneError && (
                <p className="mt-2 text-sm text-red-600">
                  {phoneError}
                </p>
              )}

              <button
                onClick={async () => {
                  const leadPayload = {
                    company_id: companyId,
                    name: customer.name,
                    email: customer.email,
                    phone: customer.phone,
                    postcode: (customer as any).postcode || '',
                    status: isPreviewMode ? 'Test' : 'New Lead',
                    answers,
                  }

                  const { data } = await supabase
                    .from('leads')
                    .insert([leadPayload])
                    .select()
                    .single()

                  if (data) {
                    setLeadId(data.id)

                    ;(window as any).dataLayer = (window as any).dataLayer || []
                    ;(window as any).dataLayer.push({
                      event: 'lead_submitted',
                      lead_id: data.id,
                    })
                  }

                  setShowLeadModal(false)
                }}
                disabled={
                  !customer.name ||
                  !customer.email ||
                  !(customer as any).postcode ||
                  !customer.phone ||
                  !validatePhone(customer.phone)
                }
                className="w-full rounded-2xl bg-gradient-to-r from-[var(--brand)] to-[color-mix(in_srgb,var(--brand)_70%,black)] py-6 text-xl font-semibold text-white shadow-xl disabled:opacity-30"
              >
                Show My Fixed Prices
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Boiler Details Modal */}
      {showBoilerDetails && detailsBoiler && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-white">
          <div className="mx-auto max-w-6xl p-8">
            <div className="flex items-center justify-between border-b pb-6">
              <h2 className="text-4xl font-bold">{detailsBoiler.name}</h2>

              <button
                onClick={() => setShowBoilerDetails(false)}
                className="text-3xl"
              >
                ×
              </button>
            </div>

            <div className="mt-10 grid gap-10 lg:grid-cols-2">
              <div className="relative mx-auto w-full max-w-[420px] text-center">
                {detailsBoiler.image ? (
                  <img
                    src={detailsBoiler.image}
                    alt={detailsBoiler.name}
                    className="mx-auto max-h-[500px] w-full object-contain"
                  />
                ) : (
                  <div className="flex h-[400px] items-center justify-center rounded-xl border border-dashed text-gray-400">
                    No image uploaded
                  </div>
                )}
                {Number(detailsBoiler.warranty) > 0 && (
                  <GuaranteeBadge years={Number(detailsBoiler.warranty)} />
                )}
              </div>

              <div>
                <span className="inline-block rounded-full bg-[color-mix(in_srgb,var(--brand)_15%,white)] px-4 py-2 text-sm font-semibold text-[var(--brand)]">
                  Recommended For Your Home
                </span>

                <p className="mt-6 text-5xl font-bold">
                  £{detailsBoiler.price.toLocaleString()}
                </p>

                <p className="mt-3 text-xl text-gray-600">
                  From £{Math.round(detailsBoiler.price / 48)}/month
                </p>

                <button
                  onClick={async () => {
                    setSelectedBoiler(detailsBoiler)

                    if (typeof window !== 'undefined') {
                      ; (window as any).dataLayer = (window as any).dataLayer || []
                        ; (window as any).dataLayer.push({
                          event: 'boiler_selected',
                          boiler_name: detailsBoiler.name,
                          boiler_price: detailsBoiler.price,
                          boiler_tier: detailsBoiler.tier,
                        })
                    }

                    if (leadId) {
                      const { error } = await supabase
                        .from('leads')
                        .update({
                          boiler_name: detailsBoiler.name,
                          boiler_category: detailsBoiler.category,
                          boiler_output: detailsBoiler.output,
                          quote_price: detailsBoiler.price,
                          recommended_boilers: recommendedBoilers.map((b) => ({
                            name: b.name,
                            category: b.category,
                            output: b.output,
                            price: b.price,
                            tier: b.tier,
                          })),
                        })
                        .eq('id', leadId)

                      if (error) {
                        console.error('Lead update error:', error)
                      }
                    }

                    setShowBoilerDetails(false)
                    setStep(finalPriceStep)
                  }}
                  className="mt-8 w-full rounded-xl bg-[var(--brand)] p-5 font-semibold text-white"
                >
                  Choose This Boiler
                </button>
              </div>
            </div>

            <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <h3 className="text-2xl font-bold">What's Included</h3>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div>✓ Boiler supplied and installed</div>
                <div>✓ Magnetic filter included</div>
                <div>✓ Chemical system treatment</div>
                <div>✓ Flue kit included</div>
                <div>✓ Gas Safe certification</div>
                <div>✓ Building Control notification</div>
                <div>✓ Old boiler removed</div>
                <div>✓ Manufacturer warranty</div>
                <div>✓ Surrey Gas workmanship warranty</div>
                <div>✓ System commissioning</div>
              </div>
            </div>

            <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <h3 className="text-2xl font-bold">Specifications</h3>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div>Efficiency</div><div>A Rated</div>
                <div>Warranty</div>
                <div>
                  {detailsBoiler.warranty
                    ? `${detailsBoiler.warranty} Years`
                    : 'Manufacturer Warranty'}
                </div>
                <div>Fuel Type</div><div>Natural Gas</div>
                <div>Smart Controls</div><div>Compatible</div>
                <div>Installed By</div><div>Gas Safe Engineer</div>
              </div>
            </div>

            <div className="mt-8 rounded-2xl bg-[color-mix(in_srgb,var(--brand)_8%,white)] p-8">
              <h3 className="text-2xl font-bold">What Happens Next?</h3>

              <div className="mt-6 space-y-3">
                <p>1. Choose your boiler</p>
                <p>2. Upload your photos</p>
                <p>3. We verify your installation</p>
                <p>4. We confirm your fixed price</p>
                <p>5. Choose your installation date</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Finance Calculator Modal */}
      {showFinanceModal && financeBoiler && (() => {
        const finance = calculateFinance(
          financeBoiler.price,
          deposit,
          financeYears,
          financeAPR
        )

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.12)]">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold">Finance Calculator</h2>

                <button
                  onClick={() => setShowFinanceModal(false)}
                  className="sticky top-0 text-2xl"
                >
                  ×
                </button>
              </div>

              <p className="mt-2 text-gray-600">{financeBoiler.name}</p>

              <div className="mt-8 rounded-xl bg-gray-50 p-5">
                <p className="text-sm text-gray-500">Boiler Price</p>
                <p className="text-4xl font-bold">
                  £{financeBoiler.price.toLocaleString()}
                </p>
              </div>

              <div className="mt-8">
                <label className="font-semibold">Deposit</label>

                <input
                  type="range"
                  min={financeSettings.minimum_deposit}
                  max={financeBoiler.price - financeSettings.minimum_deposit}
                  step="100"
                  value={deposit}
                  onChange={(e) => setDeposit(Number(e.target.value))}
                  className="mt-3 w-full"
                />

                <p className="mt-2 text-lg font-semibold">
                  £{deposit.toLocaleString()}
                </p>
              </div>

              {/* Finance Type Selection */}
              <div className="mt-8">
                <label className="font-semibold">Finance Product</label>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setFinanceAPR(0)
                      setFinanceYears(financeSettings.zero_percent_term_1 / 12)
                    }}
                    className={`rounded-xl border p-4 ${financeAPR === 0 ? 'bg-[var(--brand)] text-white' : ''}`}
                  >
                    0% APR Finance
                  </button>

                  <button
                    onClick={() => {
                      setFinanceAPR(financeSettings.apr)
                      setFinanceYears(financeSettings.zero_percent_term_2 / 12)
                    }}
                    className={`rounded-xl border p-4 ${financeAPR === financeSettings.apr ? 'bg-[var(--brand)] text-white' : ''}`}
                  >
                    {financeSettings.apr}% APR Finance
                  </button>
                </div>
              </div>

              <div className="mt-8">
                <label className="font-semibold">Finance Term</label>

                <div className="mt-3 flex flex-wrap gap-2">
                  {(() => {
                    const maxMonths = financeAPR === 0 ? financeSettings.zero_percent_term_1 : financeSettings.zero_percent_term_2
                    const years = Math.ceil(maxMonths / 12)
                    const options = []
                    for (let y = 1; y <= years; y++) {
                      options.push(y)
                    }
                    return options.map((year) => (
                      <button
                        key={year}
                        onClick={() => setFinanceYears(year)}
                        className={`rounded-xl px-4 py-3 border ${financeYears === year ? 'bg-[var(--brand)] text-white' : ''}`}
                      >
                        {year === 1 ? '12 Months' : `${year} Years`}
                      </button>
                    ))
                  })()}
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-[color-mix(in_srgb,var(--brand)_8%,white)] p-5">
                  <p className="text-sm text-gray-600">Monthly Payment</p>
                  <p className="mt-2 text-4xl font-bold text-[var(--brand)]">
                    £{finance.monthly}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-5">
                  <p className="text-sm text-gray-600">Total Payable</p>
                  <p className="mt-2 text-4xl font-bold">
                    £{finance.totalPayable.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-xl border p-4 text-sm text-gray-600">
                {financeAPR === 0
                  ? `0% APR available over up to ${financeSettings.zero_percent_term_1} months. Subject to status. Minimum £${financeSettings.minimum_deposit} deposit.`
                  : `Representative APR ${financeSettings.apr}%. Terms available up to ${financeSettings.zero_percent_term_2} months. Subject to status. Minimum £${financeSettings.minimum_deposit} deposit.`}
              </div>

              <button className="mt-8 w-full rounded-xl bg-[var(--brand)] p-4 font-semibold text-white">
                Apply for Finance
              </button>
            </div>
          </div>
        )
      })()}
    </main>
  )
}
export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <CalculatorContent />
    </Suspense>
  )
}