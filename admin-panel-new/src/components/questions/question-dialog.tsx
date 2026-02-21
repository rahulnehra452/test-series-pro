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
import { QuestionForm } from "./question-form"
import { useState } from "react"
import { QuestionFormValues } from "@/lib/validations/question"

interface QuestionDialogProps {
  initialData?: QuestionFormValues & { id: string }
  tests: { id: string; title: string }[]
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function QuestionDialog({ initialData, tests, trigger, open, onOpenChange }: QuestionDialogProps) {
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
            Add Question
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Question" : "Create Question"}</DialogTitle>
          <DialogDescription>
            {initialData ? "Modify question details." : "Add a new question to the test."}
          </DialogDescription>
        </DialogHeader>
        <QuestionForm initialData={initialData} tests={tests} onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  )
}
