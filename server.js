const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const rooms = new Map();

io.on("connection", (socket) => {
  socket.emit("me", socket.id);

  socket.on("disconnect", () => {
    socket.broadcast.emit("callEnded");
  });

  socket.on("callUser", (data) => {
    io.to(data.userToCall).emit("callUser", {
      signal: data.signalData,
      from: data.from,
      name: data.name,
    });
  });

  socket.on("answerCall", (data) => {
    io.to(data.to).emit("callAccepted", data.signal);
    console.log("Call accepted");
  });

  socket.on("sendIceCandidate", (data) => {
    io.to(data.to).emit("receiveIceCandidate", {
      candidate: data.candidate,
    });
  });

  socket.on("createRoom", () => {
    const roomId = generateRoomId();
    rooms.set(roomId, new Set());
    //socket.join(roomId);
    console.log("Room created with ID:", roomId);
    socket.emit("roomCreated", roomId);
  });

  socket.on("joinRoom", (roomId) => {
    if (rooms.has(roomId)) {
      socket.join(roomId);
      rooms.get(roomId).add(socket.id);
      io.to(roomId).emit("userJoined", Array.from(rooms.get(roomId)));
      console.log("User joined room:", roomId);
    } else {
      socket.emit("invalidRoom");
    }
  });

  socket.on("leaveRoom", (roomId) => {
    if (rooms.has(roomId)) {
      rooms.get(roomId).delete(socket.id);
      socket.leave(roomId);
      io.to(roomId).emit("userLeft", Array.from(rooms.get(roomId)));
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

function generateRoomId() {
  return Math.random().toString(36).substring(7);
}

