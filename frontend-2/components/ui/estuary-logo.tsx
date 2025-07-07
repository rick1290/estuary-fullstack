import React from 'react'

interface EstuaryLogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function EstuaryLogo({ className = '', size = 'md' }: EstuaryLogoProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  }

  return (
    <span className={`font-bold tracking-widest ${sizeClasses[size]} ${className}`}>
      ESTUARY
    </span>
  )
}