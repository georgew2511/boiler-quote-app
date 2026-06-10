'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase'

export default function LogoutPage() {
    useRouter()

    useEffect(() => {
        const logout = async () => {
            await supabaseBrowser.auth.signOut({ scope: 'global' })

            try {
                localStorage.clear()
                sessionStorage.clear()
            } catch { }

            window.location.replace('/')
        }

        logout()
    }, [])

    return (
        <main className="min-h-screen flex items-center justify-center">
            <p>Signing out...</p>
        </main>
    )
}