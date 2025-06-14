import { NextResponse } from "next/server"

// This would be your Daily.co API key stored as an environment variable
const DAILY_API_KEY = process.env.DAILY_API_KEY

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, properties } = body

    // Validate request
    if (!name) {
      return NextResponse.json({ error: "Room name is required" }, { status: 400 })
    }

    // Set default properties if not provided
    const roomProperties = {
      privacy: "private", // private rooms require a token to join
      start_audio_off: false,
      start_video_off: false,
      enable_chat: true,
      enable_knocking: true,
      enable_screenshare: true,
      ...properties,
    }

    // Create a room using Daily.co API
    const response = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        name,
        properties: roomProperties,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json({ error: errorData.info || "Failed to create room" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error creating Daily.co room:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const name = searchParams.get("name")

    if (!name) {
      return NextResponse.json({ error: "Room name is required" }, { status: 400 })
    }

    // Get room details using Daily.co API
    const response = await fetch(`https://api.daily.co/v1/rooms/${name}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: "Room not found" }, { status: 404 })
      }
      const errorData = await response.json()
      return NextResponse.json({ error: errorData.info || "Failed to get room" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error getting Daily.co room:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
