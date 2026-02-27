"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useState, useMemo } from "react"
import { toast } from "sonner"
import { updatePlatformSettings, type PlatformSettings } from "@/actions/config-actions"
import { Loader2, AlertCircle } from "lucide-react"

interface ConfigClientProps {
  initialData: PlatformSettings | null
}

export function ConfigClient({ initialData }: ConfigClientProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<PlatformSettings>>({
    maintenance_mode: initialData?.maintenance_mode ?? false,
    mock_fallbacks_enabled: initialData?.mock_fallbacks_enabled ?? true,
    payment_gateway_active: initialData?.payment_gateway_active ?? true,
    android_version_code: initialData?.android_version_code ?? 1,
    ios_version_code: initialData?.ios_version_code ?? 1,
    global_announcement: initialData?.global_announcement ?? "",
  })

  // Improvement 5: Track dirty state
  const isDirty = useMemo(() => {
    if (!initialData) return Object.values(formData).some(v => v !== false && v !== true && v !== 1 && v !== '')
    return (
      formData.maintenance_mode !== initialData.maintenance_mode ||
      formData.mock_fallbacks_enabled !== initialData.mock_fallbacks_enabled ||
      formData.payment_gateway_active !== initialData.payment_gateway_active ||
      formData.android_version_code !== initialData.android_version_code ||
      formData.ios_version_code !== initialData.ios_version_code ||
      formData.global_announcement !== (initialData.global_announcement ?? "")
    )
  }, [formData, initialData])

  const handleChange = (key: keyof PlatformSettings, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const res = await updatePlatformSettings(formData)
      if (res.error) throw new Error(res.error)
      toast.success("Settings saved successfully")
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to save settings")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configuration</h2>
        <p className="text-muted-foreground">System-wide settings and variables.</p>
        {!initialData && (
          <p className="text-sm font-semibold text-amber-500 mt-2">
            Settings have not been initialized yet. Run the new migration.
          </p>
        )}
      </div>

      <Separator />

      <div className="grid gap-8 max-w-2xl">
        <div className="space-y-4">
          <h3 className="text-lg font-bold">General Settings</h3>

          <div className="grid gap-1.5">
            <Label htmlFor="global_announcement">Global Announcement (Optional)</Label>
            <Textarea
              id="global_announcement"
              placeholder="E.g., Server maintenance scheduled for 2 AM... (Supports standard text)"
              value={formData.global_announcement || ""}
              onChange={(e) => handleChange("global_announcement", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Appears as a banner at the top of the mobile app home screen.</p>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-lg font-bold">Feature Toggles</h3>

          <div className="flex items-center justify-between border p-4 rounded-xl shadow-sm dark:bg-[#2C2C2E]/20">
            <div className="space-y-0.5">
              <Label className="text-base text-red-500">Maintenance Mode</Label>
              <p className="text-xs font-medium text-muted-foreground">
                Locks all users out of the mobile app with a maintenance screen.
              </p>
            </div>
            <Switch
              checked={formData.maintenance_mode}
              onCheckedChange={(c: boolean) => handleChange("maintenance_mode", c)}
            />
          </div>

          <div className="flex items-center justify-between border p-4 rounded-xl shadow-sm dark:bg-[#2C2C2E]/20">
            <div className="space-y-0.5">
              <Label className="text-base">Mock Fallbacks</Label>
              <p className="text-xs font-medium text-muted-foreground">
                Enable hardcoded mock data generation for Dev environment.
              </p>
            </div>
            <Switch
              checked={formData.mock_fallbacks_enabled}
              onCheckedChange={(c: boolean) => handleChange("mock_fallbacks_enabled", c)}
            />
          </div>

          <div className="flex items-center justify-between border p-4 rounded-xl shadow-sm dark:bg-[#2C2C2E]/20">
            <div className="space-y-0.5">
              <Label className="text-base">Payments Active</Label>
              <p className="text-xs font-medium text-muted-foreground">
                Temporarily disable &quot;Buy PRO&quot; if payment gateway goes down.
              </p>
            </div>
            <Switch
              checked={formData.payment_gateway_active}
              onCheckedChange={(c: boolean) => handleChange("payment_gateway_active", c)}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-lg font-bold">App Version Control (Force Updates)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="android_version">Minimum Android Version Code</Label>
              <Input
                id="android_version"
                type="number"
                value={formData.android_version_code}
                onChange={(e) => handleChange("android_version_code", parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ios_version">Minimum iOS Version Code</Label>
              <Input
                id="ios_version"
                type="number"
                value={formData.ios_version_code}
                onChange={(e) => handleChange("ios_version_code", parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            Any app build below this version number will be forced to the App Store for a mandatory update.
          </p>
        </div>

        <div className={`sticky bottom-0 -mx-8 -mb-8 px-8 py-4 border-t border-black/5 dark:border-white/5 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl flex items-center justify-between transition-all ${isDirty ? 'opacity-100' : 'opacity-60'}`}>
          <div className="flex items-center gap-2">
            {isDirty && (
              <>
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Unsaved changes</span>
              </>
            )}
          </div>
          <Button onClick={handleSave} disabled={loading || !isDirty} size="lg" className="w-auto">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration Settings
          </Button>
        </div>
      </div>
    </div>
  )
}
