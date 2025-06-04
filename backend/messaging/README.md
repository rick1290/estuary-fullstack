# Real-time Chat System

This module provides a real-time chat system using Django Channels and WebSockets, replacing the previous Supabase implementation.

## Overview

The chat system allows:
- Practitioners to message users/clients and vice versa
- Chat functionality specifically for booked sessions
- Real-time message delivery, typing indicators, and read receipts

## Backend Setup

The backend is already configured with:
1. WebSocket consumers for handling real-time messages
2. Authentication middleware for secure connections
3. Channel layer using Redis for scalable message distribution

## Connecting from Next.js Frontend

### Installation

Install the required dependencies in your Next.js project:

```bash
npm install --save next-websocket
# or
yarn add next-websocket
```

### Usage Example

Here's how to connect to the WebSocket chat from your Next.js application:

```jsx
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth'; // Your authentication hook

const ChatComponent = ({ conversationId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const socketRef = useRef(null);
  const { accessToken } = useAuth();
  
  useEffect(() => {
    // Connect to WebSocket with authentication token
    const socketUrl = `${process.env.NEXT_PUBLIC_WS_BASE_URL}/ws/chat/${conversationId}/?token=${accessToken}`;
    socketRef.current = new WebSocket(socketUrl);
    
    // Handle connection open
    socketRef.current.onopen = () => {
      console.log('WebSocket connection established');
    };
    
    // Handle incoming messages
    socketRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'chat_message':
          setMessages((prevMessages) => [...prevMessages, data]);
          // Send read receipt
          sendReadReceipt(data.message_id);
          break;
          
        case 'typing_indicator':
          setTypingUsers((prevTypingUsers) => ({
            ...prevTypingUsers,
            [data.user_id]: data.is_typing ? data.username : null
          }));
          break;
          
        case 'read_receipt':
          // Update read status for messages
          setMessages((prevMessages) => 
            prevMessages.map(msg => 
              msg.message_id === data.message_id 
                ? { ...msg, read_by: [...(msg.read_by || []), data.user_id] }
                : msg
            )
          );
          break;
          
        case 'message_edited':
          // Update edited message
          setMessages((prevMessages) => 
            prevMessages.map(msg => 
              msg.message_id === data.message_id 
                ? { ...msg, content: data.content, is_edited: true }
                : msg
            )
          );
          break;
          
        case 'user_status':
          // Handle user online/offline status
          console.log(`User ${data.username} is ${data.status}`);
          break;
      }
    };
    
    // Handle connection close
    socketRef.current.onclose = () => {
      console.log('WebSocket connection closed');
    };
    
    // Clean up on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [conversationId, accessToken]);
  
  // Send a new message
  const sendMessage = () => {
    if (newMessage.trim() && socketRef.current) {
      const messageData = {
        type: 'chat_message',
        content: newMessage.trim(),
        attachments: null
      };
      
      socketRef.current.send(JSON.stringify(messageData));
      setNewMessage('');
    }
  };
  
  // Send typing indicator
  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      sendTypingIndicator(true);
      
      // Reset typing indicator after 3 seconds of inactivity
      setTimeout(() => {
        setIsTyping(false);
        sendTypingIndicator(false);
      }, 3000);
    }
  };
  
  // Send typing indicator to server
  const sendTypingIndicator = (isTyping) => {
    if (socketRef.current) {
      const typingData = {
        type: 'typing_indicator',
        is_typing: isTyping
      };
      
      socketRef.current.send(JSON.stringify(typingData));
    }
  };
  
  // Send read receipt to server
  const sendReadReceipt = (messageId) => {
    if (socketRef.current) {
      const receiptData = {
        type: 'read_receipt',
        message_id: messageId
      };
      
      socketRef.current.send(JSON.stringify(receiptData));
    }
  };
  
  // Get active typing users
  const getTypingIndicator = () => {
    const typingUsernames = Object.values(typingUsers).filter(Boolean);
    
    if (typingUsernames.length === 0) {
      return null;
    } else if (typingUsernames.length === 1) {
      return `${typingUsernames[0]} is typing...`;
    } else {
      return `${typingUsernames.join(', ')} are typing...`;
    }
  };
  
  return (
    <div className="chat-container">
      <div className="messages-container">
        {messages.map((msg) => (
          <div key={msg.message_id} className="message">
            <div className="message-header">
              <span className="sender">{msg.sender_name}</span>
              <span className="timestamp">{new Date(msg.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="message-content">{msg.content}</div>
            {msg.is_edited && <span className="edited-indicator">(edited)</span>}
          </div>
        ))}
      </div>
      
      {getTypingIndicator() && (
        <div className="typing-indicator">{getTypingIndicator()}</div>
      )}
      
      <div className="message-input">
        <input
          type="text"
          value={newMessage}
          onChange={handleTyping}
          placeholder="Type a message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
};

export default ChatComponent;

### Environment Configuration

Add the following to your Next.js `.env.local` file:

```
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8000
```

For production, use secure WebSockets:

```
NEXT_PUBLIC_WS_BASE_URL=wss://your-domain.com
```

## API Endpoints

The existing REST API endpoints can still be used for:

1. Fetching conversation history
2. Creating new conversations
3. Managing conversation participants

## Redis Setup

### Development Options

You have two options for development:

1. **With local Redis** (recommended for full testing):
   ```bash
   # Install Redis (macOS)
   brew install redis

   # Start Redis server
   brew services start redis
   ```

2. **Without Redis** (quick setup):
   - The system will automatically fall back to an in-memory channel layer if Redis is not configured
   - This works fine for development but doesn't persist between server restarts

### Production Recommendation: Upstash Redis

For production, we recommend **Upstash Redis** because:

1. **Perfect for Supabase users**: Since you're already using Supabase for your database, Upstash follows the same serverless model - no servers to manage

2. **Generous free tier**: 
   - Up to 10,000 commands per day
   - 256MB database size
   - Sufficient for small to medium applications

3. **Simple pricing**: Pay only for what you use beyond the free tier

4. **Global distribution**: Low latency access from anywhere

### Setup Process for Production

1. Sign up at [Upstash](https://upstash.com/)
2. Create a new Redis database
3. Copy the Redis connection string from your dashboard
4. Add it to your production environment:
   ```
   REDIS_URL=redis://default:password@your-endpoint.upstash.io:port
   ```

This approach gives you:
- Easy local development (with or without Redis)
- Simple production deployment
- Consistent environment variables between development and production
- A serverless architecture that aligns with your existing Supabase setup

## Next.js Integration Guide

### Creating a Custom WebSocket Hook

For a clean implementation in Next.js, create a reusable hook to manage WebSocket connections:

```jsx
// hooks/useWebSocket.js
import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebSocket(conversationId, token) {
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const socketRef = useRef(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 5;
  
  // Connect to WebSocket
  useEffect(() => {
    if (!conversationId || !token) return;
    
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_BASE_URL}/ws/chat/${conversationId}/?token=${token}`;
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      setConnectionStatus('connected');
      setRetryCount(0); // Reset retry count on successful connection
      console.log('WebSocket connected');
    };
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'chat_message':
          setMessages((prev) => [...prev, data]);
          break;
          
        case 'typing_indicator':
          setTypingUsers((prev) => ({
            ...prev,
            [data.user_id]: data.is_typing ? data.username : null
          }));
          break;
          
        case 'read_receipt':
          setMessages((prev) => 
            prev.map(msg => 
              msg.message_id === data.message_id 
                ? { ...msg, read_by: [...(msg.read_by || []), data.user_id] }
                : msg
            )
          );
          break;
          
        case 'message_edited':
          setMessages((prev) => 
            prev.map(msg => 
              msg.message_id === data.message_id 
                ? { ...msg, content: data.content, is_edited: true }
                : msg
            )
          );
          break;
      }
    };
    
    socket.onclose = () => {
      setConnectionStatus('disconnected');
      console.log('WebSocket disconnected');
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('error');
    };
    
    socketRef.current = socket;
    
    // Cleanup on unmount
    return () => {
      socket.close();
    };
  }, [conversationId, token, retryCount]);
  
  // Reconnection logic
  useEffect(() => {
    if (connectionStatus === 'disconnected' && retryCount < maxRetries) {
      const timer = setTimeout(() => {
        console.log(`Attempting to reconnect (${retryCount + 1}/${maxRetries})...`);
        setRetryCount(prev => prev + 1);
      }, 3000 * (retryCount + 1)); // Exponential backoff
      
      return () => clearTimeout(timer);
    }
  }, [connectionStatus, retryCount, maxRetries]);
  
  // Send message
  const sendMessage = useCallback((content) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'chat_message',
        content
      }));
      return true;
    }
    return false;
  }, []);
  
  // Send typing indicator
  const sendTypingIndicator = useCallback((isTyping) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'typing_indicator',
        is_typing: isTyping
      }));
    }
  }, []);
  
  // Send read receipt
  const sendReadReceipt = useCallback((messageId) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'read_receipt',
        message_id: messageId
      }));
    }
  }, []);
  
  return {
    messages,
    typingUsers,
    connectionStatus,
    sendMessage,
    sendTypingIndicator,
    sendReadReceipt
  };
}
```

### Integrating with SWR or React Query

For optimal data fetching and state management, combine WebSockets with SWR or React Query:

```jsx
// hooks/useConversation.js
import useSWR from 'swr';
import { useWebSocket } from './useWebSocket';
import { useAuth } from './useAuth';

export function useConversation(conversationId) {
  const { token } = useAuth();
  
  // Fetch conversation history with SWR
  const { data: historyData, error, mutate } = useSWR(
    conversationId ? `/api/conversations/${conversationId}/messages` : null,
    async (url) => {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch messages');
      return res.json();
    }
  );
  
  // Connect to WebSocket for real-time updates
  const {
    messages: wsMessages,
    typingUsers,
    connectionStatus,
    sendMessage,
    sendTypingIndicator,
    sendReadReceipt
  } = useWebSocket(conversationId, token);
  
  // Combine historical messages with real-time messages
  const allMessages = React.useMemo(() => {
    if (!historyData) return wsMessages;
    
    const historicalMessages = historyData.results || [];
    
    // Merge and deduplicate messages
    const messageMap = new Map();
    
    [...historicalMessages, ...wsMessages].forEach(msg => {
      messageMap.set(msg.message_id, msg);
    });
    
    return Array.from(messageMap.values()).sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );
  }, [historyData, wsMessages]);
  
  return {
    messages: allMessages,
    typingUsers,
    connectionStatus,
    isLoading: !error && !historyData,
    isError: !!error,
    sendMessage,
    sendTypingIndicator,
    sendReadReceipt,
    refreshMessages: mutate
  };
}
```

### Creating a Chat Component

```jsx
// components/Chat.jsx
import { useState, useEffect, useRef } from 'react';
import { useConversation } from '../hooks/useConversation';
import { useAuth } from '../hooks/useAuth';

export default function Chat({ conversationId }) {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  
  const {
    messages,
    typingUsers,
    connectionStatus,
    isLoading,
    sendMessage,
    sendTypingIndicator,
    sendReadReceipt
  } = useConversation(conversationId);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Mark messages as read when they appear
  useEffect(() => {
    messages.forEach(msg => {
      if (msg.sender_id !== user.id && !msg.read_by?.includes(user.id)) {
        sendReadReceipt(msg.message_id);
      }
    });
  }, [messages, sendReadReceipt, user.id]);
  
  // Handle typing indicator
  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      sendTypingIndicator(true);
    }
    
    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTypingIndicator(false);
    }, 3000);
  };
  
  // Handle send message
  const handleSendMessage = () => {
    if (newMessage.trim() && connectionStatus === 'connected') {
      sendMessage(newMessage.trim());
      setNewMessage('');
      
      // Clear typing indicator
      setIsTyping(false);
      sendTypingIndicator(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };
  
  // Get active typing users
  const getTypingIndicator = () => {
    const typingUsernames = Object.values(typingUsers).filter(Boolean);
    
    if (typingUsernames.length === 0) {
      return null;
    } else if (typingUsernames.length === 1) {
      return `${typingUsernames[0]} is typing...`;
    } else {
      return `${typingUsernames.join(', ')} are typing...`;
    }
  };
  
  if (isLoading) return <div>Loading conversation...</div>;
  
  return (
    <div className="chat-container">
      <div className={`status-indicator ${connectionStatus}`}>
        {connectionStatus === 'connected' ? 'Connected' : 'Reconnecting...'}
      </div>
      
      <div className="messages-container">
        {messages.map((msg) => (
          <div 
            key={msg.message_id} 
            className={`message ${msg.sender_id === user.id ? 'sent' : 'received'}`}
          >
            <div className="message-header">
              <span className="sender">{msg.sender_name}</span>
              <span className="timestamp">{new Date(msg.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="message-content">{msg.content}</div>
            {msg.is_edited && <span className="edited-indicator">(edited)</span>}
            {msg.read_by?.includes(user.id) && <span className="read-indicator">Read</span>}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {getTypingIndicator() && (
        <div className="typing-indicator">{getTypingIndicator()}</div>
      )}
      
      <div className="message-input">
        <input
          type="text"
          value={newMessage}
          onChange={handleTyping}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Type a message..."
          disabled={connectionStatus !== 'connected'}
        />
        <button 
          onClick={handleSendMessage}
          disabled={connectionStatus !== 'connected' || !newMessage.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
```

### Styling Your Chat Component

Create a modern, responsive chat UI with CSS or Tailwind:

```css
/* styles/Chat.module.css */
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 500px;
  border: 1px solid #e1e1e1;
  border-radius: 8px;
  overflow: hidden;
}

.status-indicator {
  padding: 8px 16px;
  font-size: 14px;
  text-align: center;
}

.status-indicator.connected {
  background-color: #d4edda;
  color: #155724;
}

.status-indicator.disconnected,
.status-indicator.error {
  background-color: #f8d7da;
  color: #721c24;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  max-width: 70%;
  padding: 12px;
  border-radius: 12px;
  position: relative;
}

.message.sent {
  align-self: flex-end;
  background-color: #dcf8c6;
  border-bottom-right-radius: 4px;
}

.message.received {
  align-self: flex-start;
  background-color: #f1f0f0;
  border-bottom-left-radius: 4px;
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 12px;
  color: #666;
}

.message-content {
  word-break: break-word;
}

.edited-indicator,
.read-indicator {
  font-size: 11px;
  color: #888;
  margin-top: 4px;
  text-align: right;
}

.typing-indicator {
  padding: 8px 16px;
  font-style: italic;
  color: #666;
  font-size: 14px;
}

.message-input {
  display: flex;
  padding: 12px;
  border-top: 1px solid #e1e1e1;
  background-color: #f9f9f9;
}

.message-input input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 20px;
  outline: none;
}

.message-input button {
  margin-left: 8px;
  padding: 10px 16px;
  background-color: #0070f3;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
}

.message-input button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
```

### Production Deployment Checklist

Before deploying to production, ensure:

1. **Environment Variables**:
   ```
   # .env.production
   NEXT_PUBLIC_WS_BASE_URL=wss://your-domain.com
   ```

2. **SSL Configuration**:
   - WebSockets must use `wss://` in production (secure WebSockets)
   - Ensure your Django server has valid SSL certificates

3. **Token Management**:
   - Implement token refresh logic to handle JWT expiration
   - Store tokens securely (HttpOnly cookies recommended)

4. **Error Handling**:
   - Add comprehensive error states in your components
   - Implement reconnection logic with exponential backoff

5. **Performance Optimization**:
   - Implement message pagination for large conversations
   - Consider using WebSocket message compression

6. **Offline Support**:
   - Add offline detection and message queueing
   - Sync queued messages when connection is restored

7. **Testing**:
   - Test on various devices and network conditions
   - Verify reconnection behavior works as expected

### Advanced Features

Once your basic chat is working, consider these enhancements:

1. **Message Attachments**:
   - Implement file uploads via REST API
   - Send attachment references via WebSocket

2. **Message Reactions**:
   - Add emoji reactions to messages
   - Implement via WebSocket events

3. **Message Threading**:
   - Allow replies to specific messages
   - Track parent-child relationships

4. **Group Conversations**:
   - Manage participant lists
   - Show typing indicators for multiple users

5. **Presence Indicators**:
   - Show online/offline status
   - Implement "last seen" functionality

6. **Push Notifications**:
   - Integrate with a push notification service
   - Notify users of new messages when app is closed

By following this guide, you'll have a robust, real-time chat implementation in your Next.js application that leverages the Django Channels backend we've set up.

## Testing the Implementation

To test the real-time chat implementation:

1. **Start Redis** (if using local Redis):
   ```bash
   brew services start redis
   ```

2. **Run the Django server with Daphne** (ASGI server):
   ```bash
   daphne estuary.asgi:application -p 8000
   ```

3. **Connect from your Next.js frontend** using the WebSocket client example above

4. **Monitor WebSocket connections** in your Django console logs
