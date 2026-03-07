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
      <DialogContent className="sm:max-w-[1100px] max-h-[92vh] overflow-y-hidden rounded-3xl border-black/[0.06] dark:border-white/[0.08] bg-white/80 dark:bg-[#1C1C1E]/90 backdrop-blur-3xl shadow-2xl">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-lg font-bold tracking-tight">{initialData && initialData.id !== "" ? "Edit Question" : initialData ? "Duplicate Question" : "New Question"}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground/60">
            {initialData && initialData.id !== "" ? "Modify question details and preview changes live." : "Build a new question with a live mobile preview."}
          </DialogDescription>
        </DialogHeader>
        <QuestionForm initialData={initialData} tests={tests} onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  )
}
