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
import { TestSeriesForm } from "./test-series-form"
import { useState } from "react"
import { TestSeriesFormValues } from "@/lib/validations/test-series"

interface TestSeriesDialogProps {
  initialData?: TestSeriesFormValues & { id: string }
  exams: { id: string; title: string }[]
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function TestSeriesDialog({ initialData, exams, trigger, open, onOpenChange }: TestSeriesDialogProps) {
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
            Add Series
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Test Series" : "Create Test Series"}</DialogTitle>
          <DialogDescription>
            {initialData ? "Modify details below." : "Create a new collection of tests."}
          </DialogDescription>
        </DialogHeader>
        <TestSeriesForm initialData={initialData} exams={exams} onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  )
}
