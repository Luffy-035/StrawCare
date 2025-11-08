"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";

export default function VideoCallComponent({ 
  callData, 
  isVideo, 
  onCallEnd, 
  onCallDuration 
}) {
  const [client, setClient] = useState(null);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(isVideo);
  const [callStartTime] = useState(Date.now());
  const [AgoraRTC, setAgoraRTC] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionState, setConnectionState] = useState('connecting');
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Dynamically import Agora SDK
  useEffect(() => {
    const loadAgoraSDK = async () => {
      try {
        const AgoraRTCModule = await import("agora-rtc-sdk-ng");
        const AgoraRTCInstance = AgoraRTCModule.default;
        setAgoraRTC(AgoraRTCInstance);
        
        const clientInstance = AgoraRTCInstance.createClient({ 
          mode: "rtc", 
          codec: "vp8" 
        });
        setClient(clientInstance);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to load Agora SDK:", error);
        setIsLoading(false);
      }
    };

    loadAgoraSDK();
  }, []);

  useEffect(() => {
    if (!client || !AgoraRTC || isLoading) return;

    const initCall = async () => {
      try {
        console.log("Joining channel:", callData);
        setConnectionState('connecting');
        
        // Setup event handlers BEFORE joining
        setupEventHandlers(client, AgoraRTC);
        
        // Join channel
        await client.join(
          callData.appId,
          callData.channelName,
          callData.token,
          callData.uid
        );

        console.log("Successfully joined channel");
        setConnectionState('connected');

        // FIXED: Add delay to ensure channel is fully joined
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Create and publish audio track
        await setupLocalTracks(AgoraRTC);

      } catch (error) {
        console.error("Error initializing call:", error);
        setConnectionState('failed');
        handleEndCall();
      }
    };

    initCall();

    return () => {
      cleanup();
    };
  }, [client, AgoraRTC, isLoading]);

  const setupEventHandlers = (client, AgoraRTC) => {
    // FIXED: Enhanced user-published handler with retries
    client.on("user-published", async (user, mediaType) => {
      console.log("User published:", user.uid, mediaType);
      
      try {
        await client.subscribe(user, mediaType);
        console.log("Successfully subscribed to:", user.uid, mediaType);
        
        if (mediaType === "video") {
          await handleRemoteVideo(user);
        }
        
        if (mediaType === "audio") {
          user.audioTrack?.play();
          console.log("Remote audio started playing");
        }
        
        // Update remote users
        setRemoteUsers(prev => {
          const filtered = prev.filter(u => u.uid !== user.uid);
          return [...filtered, user];
        });
        
      } catch (error) {
        console.error("Error handling user-published:", error);
        // FIXED: Retry subscription after delay
        setTimeout(async () => {
          try {
            await client.subscribe(user, mediaType);
            if (mediaType === "video") await handleRemoteVideo(user);
            if (mediaType === "audio") user.audioTrack?.play();
          } catch (retryError) {
            console.error("Retry failed:", retryError);
          }
        }, 1000);
      }
    });

    client.on("user-unpublished", (user, mediaType) => {
      console.log("User unpublished:", user.uid, mediaType);
      if (mediaType === "video") {
        // Clear remote video display
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
      }
    });

    client.on("user-left", (user) => {
      console.log("User left:", user.uid);
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    });

    // FIXED: Add connection state handlers
    client.on("connection-state-change", (curState, revState) => {
      console.log("Connection state changed:", revState, "->", curState);
      setConnectionState(curState);
    });
  };

  const setupLocalTracks = async (AgoraRTC) => {
    try {
      // Create audio track
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      setLocalAudioTrack(audioTrack);
      await client.publish(audioTrack);
      console.log("Audio track published");

      // Create video track if needed
      if (isVideo) {
        const videoTrack = await AgoraRTC.createCameraVideoTrack({
          optimizationMode: "motion", // Better for video calls
          encoderConfig: "360p_7" // Good balance of quality/performance
        });
        setLocalVideoTrack(videoTrack);
        await client.publish(videoTrack);
        
        // FIXED: Ensure video element is ready before playing
        await ensureVideoReady(localVideoRef.current);
        videoTrack.play(localVideoRef.current);
        console.log("Video track published and playing");
      }
    } catch (error) {
      console.error("Error setting up local tracks:", error);
    }
  };

  // FIXED: Enhanced remote video handler with retry logic
  const handleRemoteVideo = async (user) => {
    if (!user.videoTrack || !remoteVideoRef.current) return;

    try {
      // Ensure video element is ready
      await ensureVideoReady(remoteVideoRef.current);
      
      // FIXED: Clear previous srcObject first
      if (remoteVideoRef.current.srcObject) {
        remoteVideoRef.current.srcObject = null;
      }
      
      // Small delay to ensure cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Play remote video with retry mechanism
      await playVideoWithRetry(user.videoTrack, remoteVideoRef.current);
      console.log("Remote video started playing for user:", user.uid);
      
    } catch (error) {
      console.error("Error handling remote video:", error);
      // Retry after delay
      setTimeout(() => handleRemoteVideo(user), 1000);
    }
  };

  // FIXED: Video ready state checker
  const ensureVideoReady = (videoElement) => {
    return new Promise((resolve) => {
      if (videoElement.readyState >= 1) {
        resolve();
      } else {
        const handleReady = () => {
          videoElement.removeEventListener('loadedmetadata', handleReady);
          resolve();
        };
        videoElement.addEventListener('loadedmetadata', handleReady);
        // Fallback timeout
        setTimeout(resolve, 2000);
      }
    });
  };

  // FIXED: Play video with retry mechanism
  const playVideoWithRetry = async (videoTrack, videoElement, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        videoTrack.play(videoElement);
        // Wait a bit to see if it actually starts
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check if video is actually playing
        if (videoElement.srcObject && !videoElement.paused) {
          return; // Success
        }
      } catch (error) {
        console.error(`Video play attempt ${i + 1} failed:`, error);
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    throw new Error("Failed to play video after retries");
  };

  const cleanup = async () => {
    try {
      if (localAudioTrack) {
        localAudioTrack.stop();
        localAudioTrack.close();
      }
      if (localVideoTrack) {
        localVideoTrack.stop();
        localVideoTrack.close();
      }
      if (client) {
        await client.leave();
      }
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  };

  const handleEndCall = async () => {
    const callDuration = Math.floor((Date.now() - callStartTime) / 1000);
    const minutes = Math.floor(callDuration / 60);
    const seconds = callDuration % 60;
    const durationText = minutes > 0 
      ? `${minutes}m ${seconds}s` 
      : `${seconds}s`;
    
    await cleanup();
    onCallDuration(durationText);
    onCallEnd();
  };

  // FIXED: Enhanced toggle functions with restart capability
  const toggleMic = async () => {
    if (localAudioTrack) {
      try {
        await localAudioTrack.setEnabled(!micOn);
        setMicOn(!micOn);
      } catch (error) {
        console.error("Error toggling mic:", error);
        // If toggle fails, try to restart track
        if (!micOn) {
          try {
            const newAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
            setLocalAudioTrack(newAudioTrack);
            await client.publish(newAudioTrack);
            setMicOn(true);
          } catch (restartError) {
            console.error("Failed to restart audio track:", restartError);
          }
        }
      }
    }
  };

  const toggleCamera = async () => {
    if (localVideoTrack) {
      try {
        await localVideoTrack.setEnabled(!cameraOn);
        setCameraOn(!cameraOn);
        
        // FIXED: If turning camera back on, ensure video plays
        if (!cameraOn && localVideoRef.current) {
          await new Promise(resolve => setTimeout(resolve, 300));
          await ensureVideoReady(localVideoRef.current);
          localVideoTrack.play(localVideoRef.current);
        }
      } catch (error) {
        console.error("Error toggling camera:", error);
        // If toggle fails, try to restart track
        if (!cameraOn) {
          try {
            const newVideoTrack = await AgoraRTC.createCameraVideoTrack({
              optimizationMode: "motion",
              encoderConfig: "360p_7"
            });
            setLocalVideoTrack(newVideoTrack);
            await client.publish(newVideoTrack);
            await ensureVideoReady(localVideoRef.current);
            newVideoTrack.play(localVideoRef.current);
            setCameraOn(true);
          } catch (restartError) {
            console.error("Failed to restart video track:", restartError);
          }
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="absolute inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Initializing call...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-black z-50 flex flex-col">
      {/* Connection Status */}
      {connectionState === 'connecting' && (
        <div className="absolute top-4 left-4 bg-yellow-600 text-white px-3 py-1 rounded text-sm">
          Connecting...
        </div>
      )}
      
      {connectionState === 'failed' && (
        <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded text-sm">
          Connection Failed
        </div>
      )}

      {/* Video Area */}
      <div className="flex-1 relative">
        {isVideo ? (
          <>
            {/* Remote Video (Main) */}
            <video
              ref={remoteVideoRef} 
              className="w-full h-full bg-zinc-800 object-cover"
              autoPlay
              playsInline
              muted={false}
            />
            
            {/* Show waiting message if no remote users */}
            {remoteUsers.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-800/50">
                <div className="text-white text-center">
                  <div className="w-24 h-24 bg-zinc-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Video className="h-12 w-12 text-zinc-400" />
                  </div>
                  <p>Waiting for other participant...</p>
                </div>
              </div>
            )}
            
            {/* Local Video (Picture in Picture) */}
            {localVideoTrack && (
              <video
                ref={localVideoRef} 
                className="absolute top-4 right-4 w-48 h-36 bg-zinc-800 rounded-lg border-2 border-zinc-700 object-cover"
                autoPlay
                playsInline
                muted={true}
              />
            )}
          </>
        ) : (
          // Audio Call UI
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-white">
              <div className="w-32 h-32 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mic className="h-16 w-16 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Voice Call</h3>
              <p className="text-zinc-400">
                {remoteUsers.length > 0 ? "Connected" : "Connecting..."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Call Controls */}
      <div className="flex justify-center items-center p-6 space-x-4 bg-zinc-900/80">
        <Button
          onClick={toggleMic}
          size="lg"
          variant="outline"
          className={`rounded-full p-4 ${
            micOn 
              ? "bg-zinc-700 hover:bg-zinc-600 text-white" 
              : "bg-red-600 hover:bg-red-700 text-white"
          }`}
        >
          {micOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
        </Button>

        {isVideo && (
          <Button
            onClick={toggleCamera}
            size="lg"
            variant="outline"
            className={`rounded-full p-4 ${
              cameraOn 
                ? "bg-zinc-700 hover:bg-zinc-600 text-white" 
                : "bg-red-600 hover:bg-red-700 text-white"
            }`}
          >
            {cameraOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
          </Button>
        )}

        <Button
          onClick={handleEndCall}
          size="lg"
          className="rounded-full p-4 bg-red-600 hover:bg-red-700 text-white"
        >
          <PhoneOff className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
