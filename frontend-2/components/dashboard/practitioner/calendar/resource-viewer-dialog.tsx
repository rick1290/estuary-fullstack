"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  FileText,
  LinkIcon,
  FileImage,
  Video,
  FileArchive,
  Paperclip,
  Globe,
  FileCode,
  MessageSquare,
  Download,
  Copy,
  Check,
  Share2,
} from "lucide-react"

interface ResourceViewerDialogProps {
  resource: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ResourceViewerDialog({ resource, open, onOpenChange }: ResourceViewerDialogProps) {
  const [copied, setCopied] = useState(false)

  if (!resource) return null

  // Get the appropriate icon based on resource type
  const getResourceIcon = (type: string) => {
    switch (type) {
      case "document":
        return <FileText className="h-6 w-6" />
      case "image":
        return <FileImage className="h-6 w-6" />
      case "video":
        return <Video className="h-6 w-6" />
      case "link":
        return <Globe className="h-6 w-6" />
      case "post":
        return <MessageSquare className="h-6 w-6" />
      case "code":
        return <FileCode className="h-6 w-6" />
      case "archive":
        return <FileArchive className="h-6 w-6" />
      default:
        return <Paperclip className="h-6 w-6" />
    }
  }

  const handleCopy = () => {
    if (resource.content) {
      navigator.clipboard.writeText(resource.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {getResourceIcon(resource.type)}
            <DialogTitle>{resource.name}</DialogTitle>
          </div>
          <DialogDescription>
            {resource.description || `Added on ${new Date(resource.dateAdded).toLocaleDateString()}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}</Badge>
              {resource.sharedWithClients && <Badge variant="outline">Shared with clients</Badge>}
            </div>
            <div className="flex items-center gap-2">
              {resource.type === "post" || resource.type === "code" ? (
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              ) : (
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              )}
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-1" />
                Share
              </Button>
            </div>
          </div>

          <Separator />

          {resource.type === "post" || resource.type === "code" ? (
            <div className={`p-4 rounded-md border ${resource.type === "code" ? "bg-muted" : ""}`}>
              <pre className={`whitespace-pre-wrap ${resource.type === "code" ? "font-mono text-sm" : ""}`}>
                {resource.content}
              </pre>
            </div>
          ) : resource.type === "link" ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Resource URL:</p>
              <div className="flex items-center gap-2">
                <input type="text" value={resource.url} readOnly className="flex-1 p-2 text-sm bg-muted rounded-md" />
                <Button variant="outline" size="sm" asChild>
                  <a href={resource.url} target="_blank" rel="noopener noreferrer">
                    <LinkIcon className="h-4 w-4 mr-1" />
                    Open
                  </a>
                </Button>
              </div>
            </div>
          ) : resource.type === "image" ? (
            <div className="flex justify-center">
              <img
                src={resource.url || "/placeholder.svg?height=300&width=500&query=image"}
                alt={resource.name}
                className="max-h-[400px] object-contain rounded-md"
              />
            </div>
          ) : resource.type === "video" ? (
            <div className="aspect-video bg-black rounded-md flex items-center justify-center">
              <Video className="h-12 w-12 text-white opacity-50" />
            </div>
          ) : (
            <div className="p-8 border rounded-md flex flex-col items-center justify-center">
              {getResourceIcon(resource.type)}
              <p className="mt-2 text-sm text-muted-foreground">Preview not available</p>
              <Button variant="outline" size="sm" className="mt-4">
                <Download className="h-4 w-4 mr-1" />
                Download to view
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
