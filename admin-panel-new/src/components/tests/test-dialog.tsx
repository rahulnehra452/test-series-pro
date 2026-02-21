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
import { TestForm } from "./test-form"
import { useState } from "react"
import { TestFormValues } from "@/lib/validations/test"

interface TestDialogProps {
  initialData?: TestFormValues & { id: string }
  seriesList: { id: string; title: string }[]
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function TestDialog({ initialData, seriesList, trigger, open, onOpenChange }: TestDialogProps) {
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
            Add Test
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Test" : "Create Test"}</DialogTitle>
          <DialogDescription>
            {initialData ? "Modify test details below." : "Add a new test to a series."}
          </DialogDescription>
        </DialogHeader>
        <TestForm initialData={initialData} seriesList={seriesList} onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  )
}
