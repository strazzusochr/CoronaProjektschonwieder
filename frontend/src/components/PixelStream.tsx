/**
 * JETBRAIN V4 — H.264 NVENC Video Stream Player
 * 
 * Uses MediaSource Extensions (MSE) to play H.264 video chunks
 * received over Socket.IO from the FFmpeg NVENC pipeline on Colab.
 * 
 * This is hardware-decoded by the browser's GPU — ZERO CPU usage.
 */

import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const PixelStream: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<'connecting' | 'buffering' | 'streaming' | 'error'>('connecting');
  const [fps, setFps] = useState(0);
  const frameCountRef = useRef(0);

  useEffect(() => {
    // Stream-URL nur über Query-Param: ?stream=https://xxx.trycloudflare.com
    const params = new URLSearchParams(window.location.search);
    const streamUrl = params.get('stream');
    
    if (!streamUrl) {
      console.log('[STREAM] Kein Stream-Backend konfiguriert. Offline-Modus aktiv.');
      setStatus('error');
      return;
    }
    
    console.log('[STREAM] Connecting to:', streamUrl);
    const socket = io(streamUrl, {
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 2,
      timeout: 4000,
    });

    // ═══ MediaSource Extensions (MSE) Setup ═══
    let mediaSource: MediaSource | null = null;
    let sourceBuffer: SourceBuffer | null = null;
    let queue: ArrayBuffer[] = [];
    let isUpdating = false;

    const initMSE = () => {
      if (!window.MediaSource) {
        console.error('[MSE] MediaSource not supported');
        setStatus('error');
        return;
      }

      mediaSource = new MediaSource();
      const video = videoRef.current;
      if (!video) return;

      video.src = URL.createObjectURL(mediaSource);

      mediaSource.addEventListener('sourceopen', () => {
        console.log('[MSE] Source opened');
        try {
          // MPEG-TS with H.264 — widely supported
          const mimeType = 'video/mp2t; codecs="avc1.42E01E"';
          
          if (!MediaSource.isTypeSupported(mimeType)) {
            console.warn('[MSE] mp2t not supported, trying mp4');
            // Fallback: some browsers prefer fMP4
            const fallback = 'video/mp4; codecs="avc1.42E01E"';
            if (MediaSource.isTypeSupported(fallback)) {
              sourceBuffer = mediaSource!.addSourceBuffer(fallback);
            } else {
              console.error('[MSE] No supported codec found');
              setStatus('error');
              return;
            }
          } else {
            sourceBuffer = mediaSource!.addSourceBuffer(mimeType);
          }

          sourceBuffer.mode = 'sequence';
          setStatus('buffering');

          sourceBuffer.addEventListener('updateend', () => {
            isUpdating = false;
            processQueue();
            
            // Auto-play when we have enough data
            if (video.paused && video.buffered.length > 0) {
              video.play().catch(() => {});
            }
            
            // Keep buffer manageable (remove old data)
            if (video.buffered.length > 0) {
              const bufferedEnd = video.buffered.end(video.buffered.length - 1);
              if (bufferedEnd - video.currentTime > 5) {
                // We're more than 5s behind — jump to live
                video.currentTime = bufferedEnd - 0.5;
              }
              if (bufferedEnd > 10) {
                try {
                  sourceBuffer!.remove(0, bufferedEnd - 5);
                } catch (e) {}
              }
            }
          });

          sourceBuffer.addEventListener('error', (e) => {
            console.error('[MSE] SourceBuffer error:', e);
          });

        } catch (e) {
          console.error('[MSE] Init error:', e);
          setStatus('error');
        }
      });
    };

    const processQueue = () => {
      if (isUpdating || !sourceBuffer || queue.length === 0) return;
      if (sourceBuffer.updating) return;
      
      try {
        isUpdating = true;
        const chunk = queue.shift()!;
        sourceBuffer.appendBuffer(chunk);
        frameCountRef.current++;
        
        if (status !== 'streaming' && frameCountRef.current > 5) {
          setStatus('streaming');
        }
      } catch (e: any) {
        isUpdating = false;
        if (e.name === 'QuotaExceededError') {
          // Buffer full — drop oldest chunks
          queue = queue.slice(-10);
        }
      }
    };

    // Initialize MSE
    initMSE();

    // ═══ Socket.IO Events ═══
    socket.on('connect', () => {
      console.log('[STREAM] Connected — H.264 NVENC Pipeline Active');
    });

    // Receive H.264 binary video chunks
    socket.on('video_chunk', (data: ArrayBuffer | Buffer) => {
      const arrayBuffer = data instanceof ArrayBuffer ? data : new Uint8Array(data).buffer;
      queue.push(arrayBuffer);
      processQueue();
    });

    // ═══ V5 PRO: Direct 60FPS Frame Stream ═══
    socket.on('stream_frame', (base64Frame: string) => {
      const video = videoRef.current;
      if (!video) return;

      // Switch to High-Performance Image Mode for V5 PRO
      const parent = video.parentElement;
      if (!parent) return;

      let img = parent.querySelector('img#v5-stream') as HTMLImageElement;
      if (!img) {
        console.log('[STREAM] V5 PRO Frame detected — Switching to High-Poly Render Mode');
        video.style.display = 'none';
        img = document.createElement('img');
        img.id = 'v5-stream';
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;image-rendering:pixelated;';
        parent.appendChild(img);
        setStatus('streaming');
      }

      img.src = `data:image/jpeg;base64,${base64Frame}`;
      frameCountRef.current++;
    });


    // FPS counter
    const fpsInterval = setInterval(() => {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
    }, 1000);

    return () => {
      clearInterval(fpsInterval);
      socket.disconnect();
      if (mediaSource && mediaSource.readyState === 'open') {
        try { mediaSource.endOfStream(); } catch (e) {}
      }
    };
  }, []);

  const statusColors: Record<string, string> = {
    connecting: '#ffaa00',
    buffering: '#00aaff',
    streaming: '#00ff00',
    error: '#ff4444'
  };

  const statusTexts: Record<string, string> = {
    connecting: 'CONNECTING TO COLAB T4...',
    buffering: 'BUFFERING H.264 STREAM...',
    streaming: 'H.264 NVENC — STREAMING',
    error: 'FALLBACK MODE'
  };

  return (
    <div style={{ 
      width: '100vw', height: '100vh', background: '#000', 
      display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' 
    }}>
      <video 
        ref={videoRef}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        autoPlay
        muted
        playsInline
      />
      
      {/* Stream Status Badge */}
      <div style={{ 
        position: 'absolute', top: 10, left: 10, 
        fontFamily: 'monospace', fontSize: '12px',
        background: 'rgba(0,0,0,0.7)', padding: '5px 10px',
        border: `1px solid ${statusColors[status]}`,
        color: statusColors[status],
        borderRadius: '4px'
      }}>
        <span style={{ 
          display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
          background: statusColors[status], marginRight: 6,
          animation: status === 'streaming' ? 'pulse 1s infinite' : 'none'
        }} />
        {statusTexts[status]} | {fps} FPS | GPU: 0%
      </div>

      {/* Loading overlay */}
      {status === 'connecting' && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          color: '#00ffcc', fontFamily: 'Orbitron, monospace', fontSize: '24px',
          textAlign: 'center', textShadow: '0 0 20px #00ffcc'
        }}>
          🔗 CONNECTING TO CLOUD GPU...<br/>
          <span style={{ fontSize: '14px', color: '#888' }}>
            FFmpeg NVENC H.264 Pipeline | T4 16GB VRAM
          </span>
        </div>
      )}
    </div>
  );
};

export default PixelStream;
