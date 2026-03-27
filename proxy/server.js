const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  maxHttpBufferSize: 1e8 // Increase for 1080p 60fps chunks
});

io.on('connection', (socket) => {
  console.log('--- V5 PRO AAA STREAM: Client connected', socket.id);
  
  // H.264 Binary Chunks (from FFmpeg/Renderer)
  socket.on('video_chunk', (chunk) => {
    // Broadcast to all thin clients
    socket.broadcast.emit('video_chunk', chunk);
  });

  // Legacy MJPEG frames (as fallback)
  socket.on('frame', (base64Frame) => {
    socket.broadcast.emit('stream_frame', base64Frame);
  });

  socket.on('disconnect', () => {
    console.log('--- V5 PRO AAA STREAM: Client disconnected', socket.id);
  });
});

const PORT = 3002;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`V5 PRO AAA: High-Performance Stream Proxy on Port ${PORT}`);
});
