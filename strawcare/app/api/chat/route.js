import { NextRequest, NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    
    console.log("Proxying request to AI backend:", body);

    // Use the exact same request that works in Postman
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    const raw = JSON.stringify(body);

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow"
    };

    const response = await fetch(process.env.AI_CHAT, requestOptions);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend error:", response.status, errorText);
      return NextResponse.json(
        { error: `Backend error: ${response.status} ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("Backend response:", data);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { error: "Failed to connect to AI backend: " + error.message },
      { status: 500 }
    );
  }
}
