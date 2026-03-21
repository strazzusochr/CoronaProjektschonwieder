const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

io.on('connection', (socket) => {
  console.log('--- V4 PRO PIXEL STREAM: Client/Renderer connected', socket.id);
  
  // The Headless Renderer sends frames here
  socket.on('frame', (base64Frame) => {
    // Broadcast the frame to all listening Thin Clients (0% GPU Load clients)
    socket.broadcast.emit('stream_frame', base64Frame);
  });

  socket.on('disconnect', () => {
    console.log('--- V4 PRO PIXEL STREAM: Client disconnected', socket.id);
  });
});

const PORT = 3002;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`V4 PRO: Pixel Streaming MJPEG Broadcast Server on Port ${PORT}`);
});
