// Helper functions for Daily.co operations

/**
 * Creates a Daily.co room
 */
export async function createRoom(name: string, properties?: any) {
  try {
    const response = await fetch("/api/video-rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        properties,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to create room")
    }

    return await response.json()
  } catch (error) {
    console.error("Error creating room:", error)
    throw error
  }
}

/**
 * Gets a Daily.co room by name
 */
export async function getRoom(name: string) {
  try {
    const response = await fetch(`/api/video-rooms?name=${encodeURIComponent(name)}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to get room")
    }

    return await response.json()
  } catch (error) {
    console.error("Error getting room:", error)
    throw error
  }
}

/**
 * Creates a Daily.co meeting token for a room
 */
export async function createMeetingToken(roomName: string, userInfo?: any, expiryMinutes?: number) {
  try {
    const response = await fetch("/api/video-tokens", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        roomName,
        userInfo,
        expiryMinutes,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to create meeting token")
    }

    return await response.json()
  } catch (error) {
    console.error("Error creating meeting token:", error)
    throw error
  }
}

/**
 * Generates a unique room name for Daily.co
 */
export function generateRoomName(prefix = "estuary") {
  const randomString = Math.random().toString(36).substring(2, 10)
  return `${prefix}-${randomString}`
}
