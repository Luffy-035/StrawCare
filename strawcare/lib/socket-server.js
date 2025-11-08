import { Server } from "socket.io";
import { auth } from "@clerk/nextjs/server";
import connectDB from "./db.js";
import Chat from "../models/Chat.js";
import Message from "../models/Message.js";
import Doctor from "../models/Doctor.js";
import Patient from "../models/Patient.js";

let io;

export function getIO() {
  if (!io) {
    // Initialize socket server
    io = new Server({
      cors: {
        origin:
          process.env.NODE_ENV === "production"
            ? process.env.NEXT_PUBLIC_APP_URL
            : "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    // Authentication middleware
    io.use(async (socket, next) => {
      try {
        const userId = socket.handshake.auth.userId;
        const userRole = socket.handshake.auth.userRole;

        if (!userId || !userRole) {
          throw new Error("Missing authentication data");
        }

        socket.userId = userId;
        socket.userRole = userRole;
        next();
      } catch (error) {
        next(new Error("Authentication failed"));
      }
    });

    io.on("connection", (socket) => {
      console.log(`User connected: ${socket.userId} (${socket.userRole})`);

      // Join chat room
      socket.on("join-chat", async (chatId) => {
        try {
          await connectDB();

          const chat = await Chat.findById(chatId).populate(
            "doctorId patientId"
          );

          if (!chat) {
            socket.emit("error", "Chat not found");
            return;
          }

          // Verify user has access to this chat
          const hasAccess =
            (socket.userRole === "doctor" &&
              chat.doctorId.userId === socket.userId) ||
            (socket.userRole === "patient" &&
              chat.patientId.userId === socket.userId);

          if (!hasAccess) {
            socket.emit("error", "Unauthorized access to chat");
            return;
          }

          socket.join(chatId);
          socket.currentChatId = chatId;

          // Load message history
          const messages = await Message.find({ chatId })
            .sort({ createdAt: 1 })
            .limit(50);

          socket.emit("message-history", messages);
          socket
            .to(chatId)
            .emit("user-joined", {
              userId: socket.userId,
              userRole: socket.userRole,
            });
        } catch (error) {
          console.error("Error joining chat:", error);
          socket.emit("error", "Failed to join chat");
        }
      });

      // Handle new messages
      socket.on("send-message", async (data) => {
        try {
          const { chatId, message, messageType = "text" } = data;

          if (!socket.currentChatId || socket.currentChatId !== chatId) {
            socket.emit("error", "Not joined to this chat");
            return;
          }

          await connectDB();

          // Get sender info
          let senderName;
          if (socket.userRole === "doctor") {
            const doctor = await Doctor.findOne({ userId: socket.userId });
            senderName = `${doctor.name}`;
          } else {
            const patient = await Patient.findOne({ userId: socket.userId });
            senderName = patient.name;
          }

          // Save message to database
          const newMessage = await Message.create({
            chatId,
            senderId: socket.userId,
            senderType: socket.userRole,
            senderName,
            message,
            messageType,
          });

          // Update chat last activity
          await Chat.findByIdAndUpdate(chatId, { lastActivity: new Date() });

          // Broadcast message to chat room
          io.to(chatId).emit("new-message", newMessage);
        } catch (error) {
          console.error("Error sending message:", error);
          socket.emit("error", "Failed to send message");
        }
      });

      // Handle typing indicators
      socket.on("typing", (data) => {
        socket.to(data.chatId).emit("user-typing", {
          userId: socket.userId,
          userRole: socket.userRole,
          isTyping: data.isTyping,
        });
      });

      // Handle message read receipts
      socket.on("mark-read", async (data) => {
        try {
          await connectDB();
          await Message.updateMany(
            {
              chatId: data.chatId,
              senderId: { $ne: socket.userId },
              isRead: false,
            },
            { isRead: true }
          );

          socket
            .to(data.chatId)
            .emit("messages-read", { readBy: socket.userId });
        } catch (error) {
          console.error("Error marking messages as read:", error);
        }
      });

      // Handle disconnection
      socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.userId}`);
        if (socket.currentChatId) {
          socket.to(socket.currentChatId).emit("user-left", {
            userId: socket.userId,
            userRole: socket.userRole,
          });
        }
      });
    });
  }

  return io;
}
