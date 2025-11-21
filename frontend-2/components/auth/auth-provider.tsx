"use client"

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import AuthModal from "./auth-modal"

interface AuthModalContextType {
  openAuthModal: (options?: AuthModalOptions) => void
  closeAuthModal: () => void
}

interface AuthModalOptions {
  defaultTab?: "login" | "signup"
  redirectUrl?: string
  serviceType?: string
  title?: string
  description?: string
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined)

export function useAuthModal() {
  const context = useContext(AuthModalContext)
  if (!context) {
    throw new Error("useAuthModal must be used within an AuthModalProvider")
  }
  return context
}

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [modalOptions, setModalOptions] = useState<AuthModalOptions>({})
  const searchParams = useSearchParams()
  const router = useRouter()

  // Handle URL-based auth modal opening
  useEffect(() => {
    const authParam = searchParams.get("auth")
    const redirect = searchParams.get("redirect")
    const serviceType = searchParams.get("serviceType")

    if (authParam === "login" || authParam === "signup") {
      setModalOptions({
        defaultTab: authParam,
        redirectUrl: redirect || undefined,
        serviceType: serviceType || undefined,
      })
      setIsOpen(true)

      // Clean up URL
      const newSearchParams = new URLSearchParams(searchParams.toString())
      newSearchParams.delete("auth")
      newSearchParams.delete("redirect")
      newSearchParams.delete("serviceType")
      
      const newUrl = newSearchParams.toString() 
        ? `${window.location.pathname}?${newSearchParams.toString()}`
        : window.location.pathname
      
      router.replace(newUrl)
    }
  }, [searchParams, router])

  const openAuthModal = useCallback((options: AuthModalOptions = {}) => {
    setModalOptions(options)
    setIsOpen(true)
  }, [])

  const closeAuthModal = useCallback(() => {
    setIsOpen(false)
    setModalOptions({})
  }, [])

  const contextValue = useMemo(() => ({
    openAuthModal,
    closeAuthModal
  }), [openAuthModal, closeAuthModal])

  return (
    <AuthModalContext.Provider value={contextValue}>
      {children}
      <AuthModal
        open={isOpen}
        onClose={closeAuthModal}
        defaultTab={modalOptions.defaultTab}
        redirectUrl={modalOptions.redirectUrl}
        serviceType={modalOptions.serviceType}
        title={modalOptions.title}
        description={modalOptions.description}
      />
    </AuthModalContext.Provider>
  )
}