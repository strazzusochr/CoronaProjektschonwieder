import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const PixelStream: React.FC = () => {
  const [src, setSrc] = useState<string>('');

  useEffect(() => {
    // Connect to the Node.js Stream Proxy (MJPEG Broadcasting)
    const socket = io('http://localhost:3002');
    
    socket.on('connect', () => {
      console.log('Connected to Pixel Stream Proxy (0% GPU Load)');
    });

    socket.on('stream_frame', (base64Frame: string) => {
      setSrc(`data:image/jpeg;base64,${base64Frame}`);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
      {src ? (
        <img 
          src={src} 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          alt="Cloud Render Stream"
        />
      ) : (
        <div style={{ color: '#00ffcc', fontFamily: 'monospace', fontSize: '18px' }}>
          V4 PRO: CONNECTING CLOUD GPU... (WAITING FOR RENDERER)
        </div>
      )}
      
      <div style={{ position: 'absolute', top: 10, left: 10, color: '#00ffcc', fontFamily: 'monospace', background: 'rgba(0,0,0,0.5)', padding: '5px' }}>
        V4 PRO: PIXEL STREAMING — LOCAL GPU LOAD: 0%
      </div>
    </div>
  );
};

export default PixelStream;
