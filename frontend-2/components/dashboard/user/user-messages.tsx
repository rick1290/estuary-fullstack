"use client"

import { useState } from "react"
import {
  Box,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Divider,
  Badge,
  Button,
} from "@mui/material"
import { ArrowForward as ArrowForwardIcon } from "@mui/icons-material"

// Mock messages data
const messagesData = [
  {
    id: 1,
    sender: "Dr. Sarah Johnson",
    avatar: "/practitioner-1.jpg",
    preview: "Looking forward to our session tomorrow! Please let me know if you have any questions before we meet.",
    timestamp: "2023-06-14T10:30:00",
    unread: true,
  },
  {
    id: 2,
    sender: "Michael Chen",
    avatar: "/practitioner-2.jpg",
    preview: "I've shared some pre-workshop materials for you to review before our stress management workshop.",
    timestamp: "2023-06-13T15:45:00",
    unread: false,
  },
  {
    id: 3,
    sender: "Emma Wilson",
    avatar: "/practitioner-3.jpg",
    preview: "Thank you for booking the yoga session. I recommend wearing comfortable clothes and bringing water.",
    timestamp: "2023-06-12T09:15:00",
    unread: false,
  },
]

export default function UserMessages() {
  const [messages] = useState(messagesData)

  const formatTimestamp = (timestamp) => {
    const messageDate = new Date(timestamp)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return messageDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (diffDays === 1) {
      return "Yesterday"
    } else if (diffDays < 7) {
      return messageDate.toLocaleDateString([], { weekday: "long" })
    } else {
      return messageDate.toLocaleDateString([], { month: "short", day: "numeric" })
    }
  }

  return (
    <Box>
      {messages.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            You have no messages
          </Typography>
        </Box>
      ) : (
        <>
          <List sx={{ width: "100%", bgcolor: "background.paper" }}>
            {messages.map((message, index) => (
              <Box key={message.id}>
                <ListItem alignItems="flex-start" sx={{ py: 1.5 }}>
                  <ListItemAvatar>
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                      variant="dot"
                      color="primary"
                      invisible={!message.unread}
                    >
                      <Avatar alt={message.sender} src={message.avatar} />
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography
                          variant="subtitle2"
                          component="span"
                          sx={{ fontWeight: message.unread ? "bold" : "regular" }}
                        >
                          {message.sender}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatTimestamp(message.timestamp)}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography
                        variant="body2"
                        color="text.primary"
                        sx={{
                          display: "-webkit-box",
                          overflow: "hidden",
                          WebkitBoxOrient: "vertical",
                          WebkitLineClamp: 2,
                          fontWeight: message.unread ? "medium" : "regular",
                        }}
                      >
                        {message.preview}
                      </Typography>
                    }
                  />
                </ListItem>
                {index < messages.length - 1 && <Divider variant="inset" component="li" />}
              </Box>
            ))}
          </List>

          <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            <Button endIcon={<ArrowForwardIcon />}>View All Messages</Button>
          </Box>
        </>
      )}
    </Box>
  )
}
