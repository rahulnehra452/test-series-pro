"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { AdminUserForm } from "./admin-user-form"
import { useState } from "react"
import { AdminUserFormValues } from "@/lib/validations/admin-user"

interface AdminUserDialogProps {
  initialData?: AdminUserFormValues & { id: string, email: string }
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AdminUserDialog({ initialData, trigger, open, onOpenChange }: AdminUserDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)

  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen

  const handleSuccess = () => {
    setIsOpen?.(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit User" : "Create User"}</DialogTitle>
          <DialogDescription>
            {initialData ? "Update user details below." : "Create a new admin user."}
          </DialogDescription>
        </DialogHeader>
        <AdminUserForm initialData={initialData} onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  )
}
