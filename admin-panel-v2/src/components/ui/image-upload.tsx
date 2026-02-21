"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { ImagePlus, X, Loader2 } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"

interface ImageUploadProps {
  value?: string | null
  onChange: (url: string) => void
  onRemove: () => void
}

export function ImageUpload({ value, onChange, onRemove }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const supabase = createClient()

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Invalid file type. Please upload an image.")
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error("File size too large. Max 5MB.")
      return
    }

    try {
      setIsUploading(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('question-images')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data } = supabase.storage
        .from('question-images')
        .getPublicUrl(filePath)

      onChange(data.publicUrl)
      toast.success("Image uploaded successfully")
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to upload image"
      toast.error(message)
      console.error(error)
    } finally {
      setIsUploading(false)
    }
  }

  if (value) {
    return (
      <div className="relative w-full h-64 border rounded-md overflow-hidden bg-muted/30">
        <Image
          fill
          src={value}
          alt="Question Image"
          className="object-contain"
        />
        <Button
          onClick={onRemove}
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8"
          type="button"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-center w-full">
        <label htmlFor="image-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/10 hover:bg-muted/30 transition-colors border-muted-foreground/25 hover:border-muted-foreground/50">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {isUploading ? (
              <Loader2 className="h-8 w-8 mb-2 animate-spin text-muted-foreground" />
            ) : (
              <ImagePlus className="w-8 h-8 mb-2 text-muted-foreground" />
            )}
            <p className="mb-2 text-sm text-muted-foreground">
              <span className="font-semibold">Click to upload</span> query image
            </p>
            <p className="text-xs text-muted-foreground">PNG, JPG or GIF (MAX. 5MB)</p>
          </div>
          <input
            id="image-upload"
            type="file"
            className="hidden"
            accept="image/*"
            onChange={onUpload}
            disabled={isUploading}
          />
        </label>
      </div>
    </div>
  )
}
