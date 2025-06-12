import { NextResponse } from "next/server"

// This would be your Daily.co API key stored as an environment variable
const DAILY_API_KEY = process.env.DAILY_API_KEY

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { roomName, userInfo, expiryMinutes = 60 } = body

    // Validate request
    if (!roomName) {
      return NextResponse.json({ error: "Room name is required" }, { status: 400 })
    }

    // Calculate expiry (default: 60 minutes from now)
    const exp = Math.floor(Date.now() / 1000) + expiryMinutes * 60

    // Create a meeting token using Daily.co API
    const response = await fetch("https://api.daily.co/v1/meeting-tokens", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          exp,
          user_name: userInfo?.name,
          user_id: userInfo?.id,
          is_owner: userInfo?.role === "practitioner",
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        { error: errorData.info || "Failed to create meeting token" },
        { status: response.status },
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error creating Daily.co meeting token:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
