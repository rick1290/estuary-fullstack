"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  FileText,
  FileImage,
  Video,
  FileArchive,
  Paperclip,
  Globe,
  FileCode,
  MessageSquare,
  ExternalLink,
  Download,
  Eye,
} from "lucide-react"

interface ResourceCardProps {
  resource: {
    id: string
    name: string
    type: string
    url?: string
    dateAdded: string
    sharedWithClients: boolean
    description?: string
    content?: string
  }
  onView: (resource: any) => void
  onDelete: (id: string) => void
}

export default function ResourceCard({ resource, onView, onDelete }: ResourceCardProps) {
  // Get the appropriate icon based on resource type
  const getResourceIcon = (type: string) => {
    switch (type) {
      case "document":
        return <FileText className="h-5 w-5" />
      case "image":
        return <FileImage className="h-5 w-5" />
      case "video":
        return <Video className="h-5 w-5" />
      case "link":
        return <Globe className="h-5 w-5" />
      case "post":
        return <MessageSquare className="h-5 w-5" />
      case "code":
        return <FileCode className="h-5 w-5" />
      case "archive":
        return <FileArchive className="h-5 w-5" />
      default:
        return <Paperclip className="h-5 w-5" />
    }
  }

  // Get the appropriate action button based on resource type
  const getActionButton = () => {
    switch (resource.type) {
      case "link":
        return (
          <Button variant="outline" size="sm" asChild>
            <a href={resource.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-1" />
              Open Link
            </a>
          </Button>
        )
      case "document":
      case "image":
      case "video":
      case "archive":
        return (
          <Button variant="outline" size="sm" onClick={() => onView(resource)}>
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
        )
      case "post":
      case "code":
        return (
          <Button variant="outline" size="sm" onClick={() => onView(resource)}>
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
        )
      default:
        return (
          <Button variant="outline" size="sm" onClick={() => onView(resource)}>
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
        )
    }
  }

  // Get the type label
  const getTypeLabel = (type: string) => {
    switch (type) {
      case "document":
        return "Document"
      case "image":
        return "Image"
      case "video":
        return "Video"
      case "link":
        return "Link"
      case "post":
        return "Post"
      case "code":
        return "Code"
      case "archive":
        return "Archive"
      default:
        return "File"
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-muted rounded-md p-2">{getResourceIcon(resource.type)}</div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{resource.name}</p>
                <Badge variant="outline" className="text-xs">
                  {getTypeLabel(resource.type)}
                </Badge>
              </div>
              {resource.description && (
                <p className="text-sm text-muted-foreground line-clamp-1">{resource.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Added on {new Date(resource.dateAdded).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {resource.sharedWithClients && <Badge variant="outline">Shared with clients</Badge>}
            {getActionButton()}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
