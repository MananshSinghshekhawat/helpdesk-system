'use client'

import { AppLayout } from '@/components/app-layout'

export default function SettingsPage() {
  return (
    <AppLayout orgName="Acme Corp" userName="Alex Johnson" userRole="Admin">
      <div className="p-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your organization and preferences</p>
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold text-foreground">Organization Settings</h2>
              <p className="text-sm text-muted-foreground">Manage your organization's information and preferences</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-center py-8">
                <p className="text-muted-foreground">Organization settings will be displayed here</p>
              </div>
              <button className="w-full px-4 py-2 border border-border rounded-md hover:bg-secondary">
                Edit Settings
              </button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold text-foreground">Team Members</h2>
              <p className="text-sm text-muted-foreground">Manage team members and their permissions</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-center py-8">
                <p className="text-muted-foreground">Team member list will be displayed here</p>
              </div>
              <button className="w-full px-4 py-2 border border-border rounded-md hover:bg-secondary">
                Manage Team
              </button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold text-foreground">Integrations</h2>
              <p className="text-sm text-muted-foreground">Connect external services and applications</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-center py-8">
                <p className="text-muted-foreground">Available integrations will be displayed here</p>
              </div>
              <button className="w-full px-4 py-2 border border-border rounded-md hover:bg-secondary">
                Browse Integrations
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
