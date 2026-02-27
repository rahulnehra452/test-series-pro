"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, FileQuestion, Users, Settings, Database, Activity, Sparkles } from "lucide-react"
import Link from "next/link"

const helpTopics = [
  {
    icon: <Database className="h-6 w-6 text-blue-500" />,
    title: "Content Management",
    description: "Learn how to create structured exam categories, sequence test series, and add mock tests.",
    link: "#content"
  },
  {
    icon: <FileQuestion className="h-6 w-6 text-green-500" />,
    title: "Question Builder",
    description: "Guide to inserting questions, using mathematical formulas, and formatting explanations.",
    link: "#questions"
  },
  {
    icon: <Sparkles className="h-6 w-6 text-amber-500" />,
    title: "AI Generator",
    description: "How to use the AI generator to rapidly generate topic-based MCQs automatically.",
    link: "#ai"
  },
  {
    icon: <Activity className="h-6 w-6 text-purple-500" />,
    title: "Analytics & Performance",
    description: "Understanding user completion rates, test scores, and platform revenue metrics.",
    link: "#analytics"
  },
  {
    icon: <Users className="h-6 w-6 text-rose-500" />,
    title: "User Administration",
    description: "Managing student profiles, modifying subscription status, and suspending accounts.",
    link: "#users"
  },
  {
    icon: <Settings className="h-6 w-6 text-gray-500" />,
    title: "Platform Settings",
    description: "Updating app credentials, contact info, and system-wide configurations.",
    link: "#settings"
  }
]

export default function HelpPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Help & Documentation</h2>
        <p className="text-muted-foreground mt-2">
          Everything you need to know about managing the admin panel and mobile app content.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {helpTopics.map((topic, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-background rounded-lg shadow-sm border">
                  {topic.icon}
                </div>
                <CardTitle className="text-lg">{topic.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 flex flex-col justify-between h-[120px]">
              <CardDescription className="text-sm">
                {topic.description}
              </CardDescription>
              <Link href={topic.link} className="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1">
                Read Guide <BookOpen className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm mt-12 overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-b">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <FileQuestion className="h-5 w-5 text-blue-500" />
            Frequently Asked Questions
          </h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <h4 className="font-semibold text-base">How do I format math equations?</h4>
            <p className="text-sm text-muted-foreground">
              Wrap inline equations in <code>\\(...)\\</code> and block equations in <code>\\[...\\]</code>.
              The app automatically parses KaTeX/LaTeX formatting.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-base">Why is my new test not visible in the app?</h4>
            <p className="text-sm text-muted-foreground">
              Ensure that the Test, its parent Test Series, and the root Exam Category are all marked as <strong>Active</strong>. All levels must be active to show in the app.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-base">How does Bulk Upload work?</h4>
            <p className="text-sm text-muted-foreground">
              The bulk uploader accepts JSON format. Each question must strictly follow the schema containing the `content`, `options` array, `correct_option` index, and optional `explanation`.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
