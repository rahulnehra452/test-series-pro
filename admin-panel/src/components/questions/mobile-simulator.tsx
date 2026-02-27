import { cn, htmlToPlainText } from "@/lib/utils"

interface MobileSimulatorProps {
  questionText: string
  options: { text: string; is_correct: boolean }[]
  marks?: number
  negativeMarks?: number
  subject?: string
}

export function MobileSimulator({
  questionText,
  options,
  marks = 1,
  negativeMarks = 0,
  subject = "Subject",
}: MobileSimulatorProps) {
  const plainQuestionText = htmlToPlainText(questionText)

  return (
    <div className="flex items-center justify-center p-6 bg-slate-50 dark:bg-[#1C1C1E]/50 rounded-2xl border border-black/5 dark:border-white/5 h-full min-h-[600px]">
      {/* iPhone Device Frame */}
      <div className="relative w-[320px] h-[650px] bg-black rounded-[45px] shadow-2xl p-2.5 ring-1 ring-black/10">
        {/* Dynamic Island / Notch */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-20 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-white/20 mr-2" />
        </div>

        {/* Screen */}
        <div className="relative w-full h-full bg-[#f8f9fa] dark:bg-[#000000] rounded-[35px] overflow-hidden flex flex-col">
          {/* Status Bar Fake */}
          <div className="h-12 w-full flex items-center justify-between px-6 pt-2 text-[10px] font-medium text-black dark:text-white">
            <span>9:41</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 border border-current rounded-sm"></span>
            </div>
          </div>

          {/* Test Kra Header area */}
          <div className="px-5 pt-2 pb-4 flex items-center justify-between border-b border-black/5 dark:border-white/10">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{subject}</p>
              <p className="text-sm font-bold mt-0.5 text-[#1D1D1F] dark:text-white">Q1 of 1</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold bg-green-500/10 text-green-600 px-2 py-1 rounded-full">+{marks}</span>
              <span className="text-[10px] font-bold bg-red-500/10 text-red-600 px-2 py-1 rounded-full">-{negativeMarks}</span>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto hide-scrollbar p-5 space-y-6">
            {/* Question Text */}
            <div className="space-y-4">
              {plainQuestionText ? (
                <div className="text-base font-semibold leading-snug text-[#1D1D1F] dark:text-white whitespace-pre-wrap">
                  {plainQuestionText}
                </div>
              ) : (
                <p className="text-base font-semibold leading-snug text-[#1D1D1F] dark:text-white">
                  Start typing to see your question here...
                </p>
              )}
            </div>

            {/* Options */}
            <div className="space-y-3">
              {options.map((opt, idx) => {
                const isSelected = false // We can mock selection state if we want
                const label = String.fromCharCode(65 + idx)
                const optionText = htmlToPlainText(opt.text) || `Option ${label}`
                return (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-center p-4 rounded-2xl border transition-all duration-200",
                      isSelected
                        ? "border-[#0066CC] bg-[#0066CC]/5 dark:bg-[#0066CC]/10"
                        : "border-black/5 dark:border-white/10 bg-white dark:bg-[#1C1C1E] shadow-sm"
                    )}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mr-3 transition-colors",
                        isSelected
                          ? "bg-[#0066CC] text-white"
                          : "bg-secondary text-muted-foreground"
                      )}
                    >
                      {label}
                    </div>
                    <div
                      className={cn(
                        "text-sm font-medium flex-1 whitespace-pre-wrap",
                        isSelected ? "text-[#0066CC] dark:text-[#5AC8FA]" : "text-[#4b4b4d] dark:text-[#A1A1A6]"
                      )}
                    >
                      {optionText}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="p-4 border-t border-black/5 dark:border-white/10 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-md flex items-center justify-between">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center opacity-50">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#0066CC] text-white flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
