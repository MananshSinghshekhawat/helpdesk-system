'use client'

import React, { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'

interface AppLayoutProps {
  children: React.ReactNode
  orgName?: string
  userName?: string
  userRole?: string
  userAvatar?: string
}

export function AppLayout({
  children,
  orgName = 'CreditQ',
  userName: defaultUserName = 'User',
  userRole: defaultUserRole = 'User',
  userAvatar,
}: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [actualUserName, setActualUserName] = useState(defaultUserName)
  const [actualUserRole, setActualUserRole] = useState(defaultUserRole)
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)

  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user')
      let hasAccess = true

      if (storedUser) {
        const parsed = JSON.parse(storedUser)
        if (parsed.name) setActualUserName(parsed.name)
        if (parsed.role) setActualUserRole(parsed.role)
      }
      setIsAuthorized(true)
    } catch (e) {
      console.error("Failed to parse user from localStorage", e)
      setIsAuthorized(true)
    }
  }, [pathname, router])

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header orgName={orgName} userName={actualUserName} userRole={actualUserRole} userAvatar={userAvatar} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="h-full">
            {isAuthorized === true ? children : isAuthorized === false ? (
               <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
                 <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                   <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                   </svg>
                 </div>
                 <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
                 <p className="text-muted-foreground">Redirecting to a secure page...</p>
               </div>
            ) : (
               <div className="h-full flex items-center justify-center">
                 <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin opacity-50" />
               </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
