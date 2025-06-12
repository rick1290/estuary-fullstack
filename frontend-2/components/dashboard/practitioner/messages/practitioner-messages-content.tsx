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
  TextField,
  IconButton,
  InputAdornment,
  Paper,
} from "@mui/material"
import {
  Search as SearchIcon,
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  EmojiEmotions as EmojiIcon,
} from "@mui/icons-material"

// Mock data for conversations
const conversations = [
  {
    id: "1",
    name: "Sarah Johnson",
    avatar: "/practitioner-1.jpg",
    lastMessage: "Looking forward to our session tomorrow!",
    time: "10:30 AM",
    unread: 2,
  },
  {
    id: "2",
    name: "Michael Chen",
    avatar: "/practitioner-2.jpg",
    lastMessage: "Thank you for the meditation resources.",
    time: "Yesterday",
    unread: 0,
  },
  {
    id: "3",
    name: "Emma Wilson",
    avatar: "/practitioner-3.jpg",
    lastMessage: "Can we reschedule our appointment?",
    time: "Monday",
    unread: 1,
  },
  {
    id: "4",
    name: "David Rodriguez",
    avatar: "/practitioner-4.jpg",
    lastMessage: "The workshop was amazing!",
    time: "Aug 15",
    unread: 0,
  },
]

// Mock data for messages
const messages = [
  {
    id: "1",
    sender: "client",
    text: "Hi there! I'm interested in booking a session with you.",
    time: "10:00 AM",
  },
  {
    id: "2",
    sender: "practitioner",
    text: "Hello! I'd be happy to help you with that. What type of session are you looking for?",
    time: "10:05 AM",
  },
  {
    id: "3",
    sender: "client",
    text: "I'm looking for a one-on-one meditation session. I've been feeling stressed lately and need some guidance.",
    time: "10:10 AM",
  },
  {
    id: "4",
    sender: "practitioner",
    text: "I understand. Meditation can be very helpful for stress management. I have several openings next week if you'd like to schedule something.",
    time: "10:15 AM",
  },
  {
    id: "5",
    sender: "client",
    text: "That sounds great! What days and times do you have available?",
    time: "10:20 AM",
  },
  {
    id: "6",
    sender: "practitioner",
    text: "I have availability on Tuesday at 2 PM, Wednesday at 10 AM, and Thursday at 4 PM. Would any of those work for you?",
    time: "10:25 AM",
  },
  {
    id: "7",
    sender: "client",
    text: "Wednesday at 10 AM would be perfect!",
    time: "10:30 AM",
  },
]

export default function PractitionerMessagesContent() {
  const [selectedConversation, setSelectedConversation] = useState(conversations[0])
  const [messageText, setMessageText] = useState("")

  const handleSendMessage = () => {
    if (messageText.trim()) {
      // In a real app, this would send the message to the API
      console.log("Sending message:", messageText)
      setMessageText("")
    }
  }

  return (
    <Box sx={{ display: "flex", width: "100%", height: "100%" }}>
      {/* Conversations List */}
      <Box
        sx={{
          width: "30%",
          borderRight: "1px solid",
          borderColor: "divider",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
          <TextField
            fullWidth
            placeholder="Search conversations"
            variant="outlined"
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>
        <List sx={{ flexGrow: 1, overflow: "auto" }}>
          {conversations.map((conversation) => (
            <ListItem
              key={conversation.id}
              button
              selected={selectedConversation.id === conversation.id}
              onClick={() => setSelectedConversation(conversation)}
              sx={{
                borderBottom: "1px solid",
                borderColor: "divider",
                "&.Mui-selected": {
                  backgroundColor: "primary.light",
                },
              }}
            >
              <ListItemAvatar>
                <Avatar src={conversation.avatar} alt={conversation.name} />
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="subtitle2">{conversation.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {conversation.time}
                    </Typography>
                  </Box>
                }
                secondary={
                  <Typography
                    variant="body2"
                    color={conversation.unread > 0 ? "text.primary" : "text.secondary"}
                    sx={{
                      fontWeight: conversation.unread > 0 ? "bold" : "normal",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {conversation.lastMessage}
                  </Typography>
                }
              />
              {conversation.unread > 0 && (
                <Box
                  sx={{
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    borderRadius: "50%",
                    width: 20,
                    height: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    ml: 1,
                  }}
                >
                  <Typography variant="caption">{conversation.unread}</Typography>
                </Box>
              )}
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Conversation Detail */}
      <Box
        sx={{
          width: "70%",
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        {/* Conversation Header */}
        <Box
          sx={{
            p: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Avatar src={selectedConversation.avatar} alt={selectedConversation.name} sx={{ mr: 2 }} />
          <Box>
            <Typography variant="subtitle1">{selectedConversation.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              Online
            </Typography>
          </Box>
        </Box>

        {/* Messages */}
        <Box
          sx={{
            flexGrow: 1,
            overflow: "auto",
            p: 2,
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          {messages.map((message) => (
            <Box
              key={message.id}
              sx={{
                alignSelf: message.sender === "practitioner" ? "flex-end" : "flex-start",
                maxWidth: "70%",
              }}
            >
              <Paper
                elevation={1}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: message.sender === "practitioner" ? "primary.light" : "background.paper",
                }}
              >
                <Typography variant="body2">{message.text}</Typography>
              </Paper>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                {message.time}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Message Input */}
        <Box
          sx={{
            p: 2,
            borderTop: "1px solid",
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <IconButton>
            <AttachFileIcon />
          </IconButton>
          <IconButton>
            <EmojiIcon />
          </IconButton>
          <TextField
            fullWidth
            placeholder="Type a message..."
            variant="outlined"
            size="small"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleSendMessage()
              }
            }}
          />
          <IconButton color="primary" onClick={handleSendMessage} disabled={!messageText.trim()}>
            <SendIcon />
          </IconButton>
        </Box>
      </Box>
    </Box>
  )
}
