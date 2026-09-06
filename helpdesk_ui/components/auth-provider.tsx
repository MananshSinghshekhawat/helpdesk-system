'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'

interface Permission {
  module: string
  status: boolean
}

interface User {
  id: number
  email: string
  name: string
  role_id: number
  organization_id: number
  status: string
  department: string | null
  mobile: string | null
  role_name?: string
  permissions?: Permission[]
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  logout: () => { },
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check localStorage for auth data
    const storedToken = localStorage.getItem('access_token')
    const storedUserStr = localStorage.getItem('user')

    if (storedToken && storedUserStr) {
      try {
        const parsedUser = JSON.parse(storedUserStr)
        setToken(storedToken)
        setUser(parsedUser)
      } catch (e) {
        console.error('Failed to parse user data from localStorage')
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
      }
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (isLoading) return

    const currentToken = localStorage.getItem('access_token')
    const isAuthRoute = pathname.startsWith('/auth')
    const isAuthenticated = !!currentToken

    // Sync state if it changed during client-side navigation
    if (currentToken !== token) {
      setToken(currentToken)
      const storedUserStr = localStorage.getItem('user')
      if (storedUserStr) {
        try {
          setUser(JSON.parse(storedUserStr))
        } catch (e) { }
      }
    }

    if (!isAuthenticated && !isAuthRoute) {
      // If not logged in and trying to access protected route
      router.replace('/auth/login')
    } else if (isAuthenticated && isAuthRoute) {
      // If logged in and trying to access auth route (like login)
      router.replace('/dashboard')
    } else if (isAuthenticated && !isAuthRoute) {
      // Check route permissions
      const routeModuleMap: Record<string, string> = {
        '/dashboard': 'Dashboard',
        '/inbox': 'Inbox',
        '/tickets': 'All Tickets',
        '/agents': 'AI Agents',
        '/training': 'AI Agents',
        '/analytics': 'Analytics',
        '/settings': 'Settings',
      }

      let requiredModule = null
      for (const [path, module] of Object.entries(routeModuleMap)) {
        if (pathname.startsWith(path)) {
          requiredModule = module
          break
        }
      }

      let activeUser = user
      if (currentToken !== token) {
        const storedUserStr = localStorage.getItem('user')
        if (storedUserStr) {
          try {
            activeUser = JSON.parse(storedUserStr)
          } catch (e) { }
        }
      }

      if (requiredModule) {
        if (!activeUser?.permissions) {
          // Legacy session without permissions, force relogin
          logout()
          return
        }

        let hasPermission = false
        if (requiredModule === 'All Tickets') {
           hasPermission = activeUser.permissions.some((p: any) => (p.module === 'All Tickets' || p.module === 'Inbox') && p.status === true)
        } else {
           hasPermission = activeUser.permissions.find((p: any) => p.module === requiredModule)?.status ?? false
        }
        
        if (!hasPermission) {
          // No permission, redirect to dashboard (fallback)
          toast.error("You do not have access", { id: 'access-denied' })
          router.replace('/dashboard')
          return
        }
      }

      // Admin route guards
      if (pathname.startsWith('/admin')) {
        const userRoleId = activeUser?.role_id
        const perms = activeUser?.permissions || []

        if (pathname.startsWith('/admin/audit-logs') && userRoleId !== 1 && !perms.find(p => p.module === 'view_audit_logs')?.status) {
          toast.error("You do not have access", { id: 'access-denied' })
          router.replace('/dashboard')
          return
        } else if (pathname.startsWith('/admin/users') && ![1, 2].includes(userRoleId as any) && !perms.find(p => p.module === 'view_users')?.status) {
          toast.error("You do not have access", { id: 'access-denied' })
          router.replace('/dashboard')
          return
        } else if (pathname.startsWith('/admin/departments') && !perms.find(p => p.module === 'view_departments')?.status) {
          toast.error("You do not have access to departments", { id: 'access-denied' })
          router.replace('/dashboard')
          return
        } else if (pathname.startsWith('/admin/roles') && !perms.find(p => p.module === 'view_roles')?.status) {
          toast.error("You do not have access to roles", { id: 'access-denied' })
          router.replace('/dashboard')
          return
        }
      }
    }
  }, [isLoading, pathname, router, token, user])

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
    router.replace('/auth/login')
  }

  // Show nothing while verifying initial auth state to prevent flash of content
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // If we're not authenticated (checking localStorage directly to avoid state lag) and not on an auth route, 
  // the useEffect will redirect. We return null to prevent flashing the protected content.
  const currentToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  if (!currentToken && !pathname.startsWith('/auth')) {
    return null
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
