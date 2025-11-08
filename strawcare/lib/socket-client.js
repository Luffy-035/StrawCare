"use client";

import { io } from 'socket.io-client';

class SocketClient {
  constructor() {
    this.socket = null;
    this.connected = false;
  }

  connect(userId, userRole) {
    if (this.socket) {
      return this.socket;
    }

    this.socket = io(process.env.NODE_ENV === 'production' 
      ? process.env.NEXT_PUBLIC_APP_URL 
      : 'http://localhost:3000', {
      auth: {
        token: 'your-auth-token', // You'll need to get this from Clerk
        userId,
        userRole
      }
    });

    this.socket.on('connect', () => {
      console.log('Connected to socket server');
      this.connected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from socket server');
      this.connected = false;
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  joinChat(chatId) {
    if (this.socket && this.connected) {
      this.socket.emit('join-chat', chatId);
    }
  }

  sendMessage(chatId, message, messageType = 'text') {
    if (this.socket && this.connected) {
      this.socket.emit('send-message', {
        chatId,
        message,
        messageType
      });
    }
  }

  markMessagesAsRead(chatId) {
    if (this.socket && this.connected) {
      this.socket.emit('mark-read', { chatId });
    }
  }

  setTyping(chatId, isTyping) {
    if (this.socket && this.connected) {
      this.socket.emit('typing', { chatId, isTyping });
    }
  }
}

const socketClient = new SocketClient();
export default socketClient;
