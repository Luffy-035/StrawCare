import { NextResponse } from "next/server";
import { RtcTokenBuilder, RtcRole } from "agora-access-token";

export async function POST(request) {
  try {

    const { channelName, callType, sharedUID } = await request.json();

    if (!channelName) {
      return NextResponse.json({ error: "Channel name is required" }, { status: 400 });
    }

    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    if (!appId || !appCertificate) {
      return NextResponse.json({ error: "Agora configuration missing" }, { status: 500 });
    }

    // FIXED: Generate TWO tokens for the same channel - one for each participant
    const initiatorUID = sharedUID || Math.floor(Math.random() * 1000000);
    const receiverUID = initiatorUID + 1; // Sequential UID for receiver

    const role = RtcRole.PUBLISHER;
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Generate tokens for both users
    const initiatorToken = RtcTokenBuilder.buildTokenWithUid(
      appId, appCertificate, channelName, initiatorUID, role, privilegeExpiredTs
    );

    const receiverToken = RtcTokenBuilder.buildTokenWithUid(
      appId, appCertificate, channelName, receiverUID, role, privilegeExpiredTs
    );

    console.log("Tokens generated:", {
      channelName,
      initiatorUID,
      receiverUID,
      tokenLengths: { initiator: initiatorToken?.length, receiver: receiverToken?.length }
    });

    return NextResponse.json({
      initiatorToken,
      receiverToken,
      initiatorUID,
      receiverUID,
      channelName,
      appId,
      success: true
    });

  } catch (error) {
    console.error("Token generation error:", error);
    return NextResponse.json({ error: `Failed to generate token: ${error.message}` }, { status: 500 });
  }
}
