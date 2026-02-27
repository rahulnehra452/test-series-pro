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
import { useRouter } from "next/navigation"

interface QuestionDialogProps {
  initialData?: QuestionFormValues & { id: string }
  tests: { id: string; title: string }[]
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function QuestionDialog({ initialData, tests, trigger, open, onOpenChange }: QuestionDialogProps) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)

  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen

  const handleSuccess = () => {
    setIsOpen?.(false)
    router.refresh()
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
      <DialogContent className="sm:max-w-[1200px] max-h-[95vh] overflow-y-hidden bg-white/60 dark:bg-background/80 backdrop-blur-2xl">
        <DialogHeader>
          <DialogTitle>{initialData && initialData.id !== "" ? "Edit Question" : initialData ? "Duplicate Question" : "Create Question"}</DialogTitle>
          <DialogDescription>
            {initialData && initialData.id !== "" ? "Modify question details." : "Add a new question to the test."}
          </DialogDescription>
        </DialogHeader>
        <QuestionForm initialData={initialData} tests={tests} onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  )
}
