import { NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher";

export async function POST(request) {
  try {

    const { channel, event, data } = await request.json();

    await pusherServer.trigger(channel, event, data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Pusher event error:", error);
    return NextResponse.json(
      { error: "Failed to send event" },
      { status: 500 }
    );
  }
}
