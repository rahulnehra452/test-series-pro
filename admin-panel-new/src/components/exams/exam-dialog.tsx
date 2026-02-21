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
import { ExamForm } from "./exam-form"
import { useState } from "react"
import { ExamFormValues } from "@/lib/validations/exam"

interface ExamDialogProps {
  initialData?: ExamFormValues & { id: string }
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ExamDialog({ initialData, trigger, open, onOpenChange }: ExamDialogProps) {
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
            Add Exam
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Exam" : "Create Exam"}</DialogTitle>
          <DialogDescription>
            {initialData ? "Modify the exam details below." : "Add a new exam category to the platform."}
          </DialogDescription>
        </DialogHeader>
        <ExamForm initialData={initialData} onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  )
}
