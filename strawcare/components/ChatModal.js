"use client";

import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send, MessageCircle, User, Stethoscope,
  Image as ImageIcon, Loader2, X, Phone, Video,
  PhoneIncoming
} from "lucide-react";
import { pusherClient } from "@/lib/pusher";
import {
  createOrGetChat,
  getChatMessages,
  sendMessage,
  sendImageMessage,
} from "@/actions/chatActions";
import VideoCallComponent from "./VideoCallComponent";

export default function ChatModal({ appointment, isOpen, onClose }) {
  const { user } = useUser();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatId, setChatId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Image upload states
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Call states
  const [callState, setCallState] = useState('idle'); // idle, initiating, ringing, connected
  const [incomingCall, setIncomingCall] = useState(null);
  const [callData, setCallData] = useState(null);
  const [isVideo, setIsVideo] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const userRole = user?.publicMetadata?.role;
  const isDoctor = userRole === "doctor";
  const otherUser = isDoctor ? appointment.patient : appointment.doctor;

  // Initialize chat when modal opens
  useEffect(() => {
    if (isOpen && appointment) {
      initializeChat();
    }

    return () => {
      if (chatId) {
        pusherClient.unsubscribe(`chat-${chatId}`);
      }
    };
  }, [isOpen, appointment]);

  // Setup Pusher connection
  useEffect(() => {
    if (chatId) {
      const channel = pusherClient.subscribe(`chat-${chatId}`);

      channel.bind("new-message", (message) => {
        console.log("Received new message:", message);
        setMessages((prev) => [...prev, message]);
        scrollToBottom();
      });

      // Call-related events
      channel.bind("call-initiated", (callInfo) => {
        console.log("Incoming call:", callInfo);
        if (callInfo.initiatorId !== user.id) {
          setIncomingCall(callInfo);
          setCallState('ringing');
        }
      });

      channel.bind("call-response", (response) => {
        console.log("Call response:", response);
        if (response.accepted) {
          setCallState('connected');
          setIncomingCall(null);
        } else {
          setCallState('idle');
          setIncomingCall(null);
          setCallData(null);
        }
      });

      channel.bind("call-ended", () => {
        console.log("Call ended by remote user");
        setCallState('idle');
        setIncomingCall(null);
        setCallData(null);
      });

      return () => {
        pusherClient.unsubscribe(`chat-${chatId}`);
      };
    }
  }, [chatId, user.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeChat = async () => {
    try {
      setLoading(true);
      const chat = await createOrGetChat(appointment._id);
      setChatId(chat._id);
      const existingMessages = await getChatMessages(chat._id);
      setMessages(existingMessages);
    } catch (error) {
      console.error("Error initializing chat:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatId || sending) return;

    setSending(true);
    const senderName = isDoctor
      ? `${appointment.doctor?.name || "Doctor"}`
      : appointment.patient?.name || "Patient";

    try {
      await sendMessage(chatId, newMessage.trim(), user.id, senderName, userRole);
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  // Call Functions
  const initiateCall = async (callType) => {
    if (callState !== 'idle') return;

    try {
      setCallState('initiating');
      setIsVideo(callType === 'video');

      const channelName = `${chatId}-${Date.now()}`;

      // Get tokens for both participants
      const response = await fetch('/api/generate-agora-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelName, callType })
      });

      if (!response.ok) {
        throw new Error('Failed to generate token');
      }

      const tokenData = await response.json();

      // FIXED: Prepare call data with BOTH tokens
      const callInfo = {
        // Initiator uses initiator token
        token: tokenData.initiatorToken,
        uid: tokenData.initiatorUID,
        // Receiver will use receiver token
        receiverToken: tokenData.receiverToken,
        receiverUID: tokenData.receiverUID,
        channelName: tokenData.channelName,
        appId: tokenData.appId,
        callType,
        initiatorId: user.id,
        initiatorName: isDoctor ? appointment.doctor?.name : appointment.patient?.name
      };

      setCallData({
        token: callInfo.token,
        uid: callInfo.uid,
        channelName: callInfo.channelName,
        appId: callInfo.appId
      });

      // Send call invitation with BOTH tokens via Pusher
      await fetch('/api/send-pusher-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: `chat-${chatId}`,
          event: 'call-initiated',
          data: callInfo
        })
      });

      setCallState('connected');

    } catch (error) {
      console.error('Error initiating call:', error);
      setCallState('idle');
      alert('Failed to start call. Please try again.');
    }
  };


  const acceptCall = async () => {
    if (!incomingCall) return;

    try {
      // FIXED: Use the receiver token from the incoming call
      setCallData({
        token: incomingCall.receiverToken,
        uid: incomingCall.receiverUID,
        channelName: incomingCall.channelName,
        appId: incomingCall.appId
      });

      setIsVideo(incomingCall.callType === 'video');
      setCallState('connected');

      await fetch('/api/send-pusher-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: `chat-${chatId}`,
          event: 'call-response',
          data: { accepted: true }
        })
      });

      setIncomingCall(null);
    } catch (error) {
      console.error('Error accepting call:', error);
      declineCall();
    }
  };


  const declineCall = async () => {
    if (!incomingCall) return;

    try {
      await fetch('/api/send-pusher-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: `chat-${chatId}`,
          event: 'call-response',
          data: { accepted: false }
        })
      });
    } catch (error) {
      console.error('Error declining call:', error);
    }

    setIncomingCall(null);
    setCallState('idle');
  };

  const endCall = async (duration) => {
    try {
      // Send call ended event
      await fetch('/api/send-pusher-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: `chat-${chatId}`,
          event: 'call-ended',
          data: {}
        })
      });

      // Send call duration message
      const senderName = isDoctor
        ? `${appointment.doctor?.name || "Doctor"}`
        : appointment.patient?.name || "Patient";

      const callMessage = `📞 ${isVideo ? 'Video' : 'Voice'} call ended • Duration: ${duration}`;
      await sendMessage(chatId, callMessage, user.id, senderName, userRole);

    } catch (error) {
      console.error('Error ending call:', error);
    }

    setCallState('idle');
    setCallData(null);
    setIncomingCall(null);
  };

  // Image upload functions (keep existing ones)
  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      alert("Please select a valid image file (JPEG, PNG, WebP, or GIF)");
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("File size must be less than 5MB");
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleImageUpload = async () => {
    if (!selectedImage || !chatId || uploading) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedImage);
      formData.append('chatId', chatId);

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const { imageUrl, publicId } = await response.json();

      const senderName = isDoctor
        ? `${appointment.doctor?.name || "Doctor"}`
        : appointment.patient?.name || "Patient";

      await sendImageMessage(chatId, imageUrl, publicId, user.id, senderName, userRole);

      setSelectedImage(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleCancelImageUpload = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleClose = () => {
    if (chatId) {
      pusherClient.unsubscribe(`chat-${chatId}`);
    }
    setChatId(null);
    setMessages([]);
    setLoading(true);
    setSending(false);
    setSelectedImage(null);
    setPreviewUrl(null);
    setUploading(false);
    setCallState('idle');
    setCallData(null);
    setIncomingCall(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  const renderMessage = (message, index) => {
    const isOwnMessage = message.senderId === user?.id;

    return (
      <div
        key={message._id || index}
        className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
      >
        <div
          className={`max-w-[70%] rounded-lg px-3 py-2 ${isOwnMessage
            ? "bg-emerald-600 text-white"
            : "bg-zinc-800 text-zinc-300"
            }`}
        >
          <div className="flex items-center space-x-1 mb-1">
            {message.senderType === "doctor" ? (
              <Stethoscope className="h-3 w-3" />
            ) : (
              <User className="h-3 w-3" />
            )}
            <span className="text-xs font-medium">{message.senderName}</span>
            <span className="text-xs text-zinc-400">
              {formatTime(message.createdAt)}
            </span>
          </div>

          {message.imageUrl ? (
            <div className="space-y-2">
              <img
                src={message.imageUrl}
                alt="Uploaded image"
                className="max-w-full h-auto rounded cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(message.imageUrl, '_blank')}
                loading="lazy"
              />
            </div>
          ) : (
            <p className="text-sm">{message.message}</p>
          )}
        </div>
      </div>
    );
  };

  // If in call, show call component
  if (callState === 'connected' && callData) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl h-[80vh] p-0 bg-black border-zinc-700">
          <VideoCallComponent
            callData={callData}
            isVideo={isVideo}
            onCallEnd={() => setCallState('idle')}
            onCallDuration={endCall}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl h-[600px] flex flex-col p-0 bg-zinc-900 border-zinc-700">
          <DialogHeader className="flex-shrink-0 p-4 border-b border-zinc-700">
            <DialogTitle className="flex items-center justify-between text-white">
              <div className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5 text-emerald-400" />
                <span>
                  Chat with{" "}
                  {isDoctor
                    ? otherUser?.name || "Patient"
                    : otherUser?.name || "Doctor"}
                </span>
              </div>

              {/* Call Controls */}
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => initiateCall('audio')}
                  className="bg-zinc-800 hover:bg-zinc-700"
                  disabled={callState !== 'idle'}
                >
                  <Phone className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => initiateCall('video')}
                  className="bg-zinc-800 hover:bg-zinc-700"
                  disabled={callState !== 'idle'}
                >
                  <Video className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Appointment on{" "}
              {new Date(appointment.appointmentDate).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>

          {/* Call Status */}
          {callState === 'initiating' && (
            <div className="p-4 bg-blue-600 text-white text-center">
              Initiating call...
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full w-full">
                <div className="p-4">
                  {loading ? (
                    <div className="flex items-center justify-center h-full min-h-[300px]">
                      <div className="text-zinc-400">Loading chat...</div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full min-h-[300px] text-center">
                      <div className="space-y-2">
                        <MessageCircle className="h-12 w-12 text-zinc-500 mx-auto" />
                        <p className="text-zinc-400">No messages yet</p>
                        <p className="text-sm text-zinc-500">
                          Start the conversation!
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message, index) => renderMessage(message, index))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Image Preview Area */}
            {previewUrl && (
              <div className="flex-shrink-0 border-t border-zinc-700 p-4 bg-zinc-800">
                <div className="flex items-start space-x-3">
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-20 h-20 object-cover rounded"
                    />
                    <button
                      onClick={handleCancelImageUpload}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-sm text-zinc-300">Ready to send image</p>
                    <div className="flex space-x-2">
                      <Button
                        onClick={handleImageUpload}
                        disabled={uploading}
                        className="bg-emerald-600 hover:bg-emerald-700"
                        size="sm"
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          'Send Image'
                        )}
                      </Button>
                      <Button
                        onClick={handleCancelImageUpload}
                        variant="outline"
                        size="sm"
                        className="bg-zinc-700 hover:bg-zinc-600"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Message Input */}
            <div className="flex-shrink-0 border-t border-zinc-700 p-4">
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-zinc-800 hover:bg-zinc-700"
                  disabled={loading || uploading || !!selectedImage || callState !== 'idle'}
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>

                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:border-emerald-400 focus:ring-emerald-400"
                  disabled={loading || sending || !!selectedImage || callState !== 'idle'}
                />

                <Button
                  type="submit"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={!newMessage.trim() || loading || sending || !!selectedImage || callState !== 'idle'}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Incoming Call Modal */}
      {incomingCall && (
        <Dialog open={true}>
          <DialogContent className="max-w-md bg-zinc-900 border-zinc-700">
            <DialogHeader>
              <DialogTitle className="text-white text-center flex items-center justify-center space-x-2">
                <PhoneIncoming className="h-6 w-6 text-green-500" />
                <span>Incoming {incomingCall.callType} call</span>
              </DialogTitle>
              <DialogDescription className="text-center text-zinc-400">
                From {incomingCall.initiatorName}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center space-x-4 mt-4">
              <Button
                onClick={acceptCall}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Accept
              </Button>
              <Button
                onClick={declineCall}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Decline
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
