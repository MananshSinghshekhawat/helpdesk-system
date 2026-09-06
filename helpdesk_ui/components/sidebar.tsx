'use client'

import React from "react"

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, ChevronLeft, ChevronRight, LayoutDashboard, Inbox, Ticket, Brain, BarChart3, Settings, Shield, Users, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/components/auth-provider'

interface NavItem {
  label: string
  href?: string
  icon: React.ReactNode
  children?: NavItem[]
  allowedRoles?: string[]
  requiredPermission?: string
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    label: 'Inbox',
    href: '/inbox',
    icon: <Inbox className="w-5 h-5" />,
  },
  // {
  //   label: 'All Tickets',
  //   href: '/tickets',
  //   icon: <Ticket className="w-5 h-5" />,
  // },
  {
    label: 'AI Agents',
    icon: <Brain className="w-5 h-5" />,
    children: [
      {
        label: 'Agents', href: '/agents',
        icon: undefined
      },
      {
        label: 'Training', href: '/training',
        icon: undefined
      },
    ],
  },
  {
    label: 'Analytics',
    href: '/analytics',
    icon: <BarChart3 className="w-5 h-5" />,
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: <Settings className="w-5 h-5" />,
  },
  {
    label: 'Admin Panel',
    icon: <Shield className="w-5 h-5" />,
    allowedRoles: ['Super Admin', 'admin'],
    children: [
      {
        label: 'User Management',
        href: '/admin/users',
        icon: <Users className="w-4 h-4" />,
        requiredPermission: 'view_users',
        allowedRoles: ['Super Admin', 'admin'],
      },
      {
        label: 'Audit Logs',
        href: '/admin/audit-logs',
        icon: <ClipboardList className="w-4 h-4" />,
        requiredPermission: 'view_audit_logs',
        allowedRoles: ['Super Admin'],
      },
      {
        label: 'Departments',
        href: '/admin/departments',
        icon: <ClipboardList className="w-4 h-4" />,
        requiredPermission: 'view_departments',
        allowedRoles: ['Super Admin', 'admin'],
      },
      {
        label: 'Roles',
        href: '/admin/roles',
        icon: <Shield className="w-4 h-4" />,
        requiredPermission: 'view_roles',
        allowedRoles: ['Super Admin', 'admin'],
      },
    ],
  },
]

interface SidebarProps {
  collapsed?: boolean
  onCollapse?: (collapsed: boolean) => void
}

export function Sidebar({ collapsed = false, onCollapse }: SidebarProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  let userRole = ''
  if (typeof window !== 'undefined') {
    try {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        const parsed = JSON.parse(storedUser)
        const rawRole = parsed.role_name || parsed.role || ''
        userRole = rawRole.toLowerCase().replace(/[\s_]+/g, '')
      }
    } catch (e) {
      // ignore
    }
  }

  const toggleExpanded = (label: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(label)) {
      newExpanded.delete(label)
    } else {
      newExpanded.add(label)
    }
    setExpandedItems(newExpanded)
  }

  const isActive = (href?: string) => {
    if (!href) return false
    return pathname === href || pathname.startsWith(href + '/')
  }
  
  const checkRole = (allowed?: string[]) => {
    if (!allowed) return true;
    const normalizedAllowed = allowed.map(r => r.toLowerCase().replace(/[\s_]+/g, ''));
    return normalizedAllowed.includes(userRole);
  }

  const checkPermission = (perm?: string) => {
    if (!perm) return true
    if (!user?.permissions) return false
    return user.permissions.find((p: any) => p.module === perm)?.status === true
  }

  const renderNavItem = (item: NavItem, depth = 0) => {
    if (!checkRole(item.allowedRoles) || !checkPermission(item.requiredPermission)) {
      return null
    }

    const visibleChildren = item.children?.filter(child => 
      checkRole(child.allowedRoles) && checkPermission(child.requiredPermission)
    )
    const hasChildren = visibleChildren && visibleChildren.length > 0
    const isItemExpanded = expandedItems.has(item.label)
    const active = isActive(item.href)

    if (collapsed && depth > 0) return null

    return (
      <div key={item.label}>
        {hasChildren ? (
          <button
            onClick={() => toggleExpanded(item.label)}
            className={cn(
              'w-full flex items-center justify-between px-4 py-2.5 rounded-md transition-colors',
              'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              'text-sm font-medium'
            )}
          >
            <div className="flex items-center gap-3">
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </div>
            {!collapsed && (
              <ChevronDown
                className={cn('w-4 h-4 transition-transform', isItemExpanded && 'rotate-180')}
              />
            )}
          </button>
        ) : (
          <Link
            href={item.href || '#'}
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-md transition-colors',
              'text-sm font-medium',
              active
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )}
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
          </Link>
        )}

        {hasChildren && isItemExpanded && !collapsed && (
          <div className="pl-2 mt-1 space-y-1">
            {visibleChildren?.map((child) => renderNavItem(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside
      className={cn(
        'bg-sidebar border-r border-sidebar-border h-full flex flex-col transition-all duration-300',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo/Brand */}
      <div className={cn('px-4 py-6 border-b border-sidebar-border flex items-center justify-between')}>
        {!collapsed && <div className="font-bold text-sidebar-foreground text-lg">Helpdesk</div>}
        <button
          onClick={() => onCollapse?.(!collapsed)}
          className="p-1.5 hover:bg-sidebar-accent rounded-md text-sidebar-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
        {navItems.filter((item) => {
          // Allow 'Admin Panel' to bypass the strict module permissions check, 
          // because it uses the 'allowedRoles' guard inside renderNavItem instead.
          if (item.label === 'Admin Panel') return true

          if (!user?.permissions) return false // strict fallback
          return user.permissions.find((p: any) => p.module === item.label)?.status
        }).map((item) => renderNavItem(item))}
      </nav>
    </aside>
  )
}
