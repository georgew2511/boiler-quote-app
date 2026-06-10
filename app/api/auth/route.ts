

import { NextResponse } from 'next/server'

export async function POST() {
    const response = NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'))

    response.cookies.getAll().forEach((cookie) => {
        if (cookie.name.startsWith('sb-')) {
            response.cookies.set(cookie.name, '', {
                expires: new Date(0),
                path: '/',
            })
        }
    })

    return response
}