

import { ReactNode } from 'react'

interface CardProps {
    children: ReactNode
    className?: string
}

export default function Card({ children, className = '' }: CardProps) {
    return (
        <div
            className={`
        rounded-3xl
        bg-white
        border
        border-slate-200
        shadow-sm
        ${className}
      `}
        >
            {children}
        </div>
    )
}