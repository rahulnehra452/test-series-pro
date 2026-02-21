import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

export default function ConfigPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configuration</h2>
        <p className="text-muted-foreground">System-wide settings and variables.</p>
      </div>

      <Separator />

      <div className="grid gap-6 max-w-2xl">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">General Settings</h3>
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="site_name">Site Name</Label>
            <Input type="text" id="site_name" placeholder="Test Series Pro" disabled />
            <p className="text-[0.8rem] text-muted-foreground">Used in emails and titles.</p>
          </div>
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="support_email">Support Email</Label>
            <Input type="email" id="support_email" placeholder="support@testseriespro.com" disabled />
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <h3 className="text-lg font-medium">Features</h3>
          <div className="flex items-center space-x-2">
            <Button variant="outline" disabled>Manage Feature Flags</Button>
          </div>
          <p className="text-[0.8rem] text-muted-foreground">Enable or disable system modules (Maintenance Mode, etc).</p>
        </div>

        <div className="flex justify-end">
          <Button disabled>Save Changes</Button>
        </div>
      </div>
    </div>
  )
}
