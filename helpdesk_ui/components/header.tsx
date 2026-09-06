'use client'

import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { LogOut, ChevronDown } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  orgName?: string
  userName?: string
  userRole?: string
  userAvatar?: string
}

export function Header({
  orgName = 'Acme Corp',
  userName = 'Alex Johnson',
  userRole = 'Admin',
  userAvatar,
}: HeaderProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    router.push('/auth/login')
  }

  // Close on outside click
  React.useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  const initials = userName
    ? userName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U'

  return (
    <header className="sticky top-0 z-40 bg-background border-b border-border">
      <div className="flex items-center justify-end px-6 py-3 gap-3">

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Avatar dropdown trigger */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 group"
            aria-label="User menu"
          >
            <Avatar className="w-8 h-8 ring-2 ring-primary/20 transition-all duration-200 group-hover:ring-primary/50">
              <AvatarImage src={userAvatar || ''} alt={userName} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <ChevronDown
              className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown */}
          {open && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border/60 bg-card shadow-2xl shadow-black/20 backdrop-blur-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              {/* User info section */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/50 bg-muted/20">
                <Avatar className="w-9 h-9 shrink-0 ring-2 ring-primary/20">
                  <AvatarImage src={userAvatar || ''} alt={userName} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
                  <Badge variant="secondary" className="mt-0.5 text-[10px] px-1.5 py-0 h-4 font-medium">
                    {userRole}
                  </Badge>
                </div>
              </div>

              {/* Actions */}
              <div className="p-1.5">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
