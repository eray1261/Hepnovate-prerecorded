import express from 'express';
import { createServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import { createClient, LiveTranscriptionEvents, ListenLiveClient } from '@deepgram/sdk';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// ✅ Fix: Set CSP Headers Correctly for WebSockets
app.use((_req, res, next) => {
  res.setHeader("Content-Security-Policy", "default-src 'self'; connect-src 'self' ws: wss:;");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// ✅ Debug: Print CSP Directives in Logs
console.log("🔍 Applying CSP Headers: default-src 'self'; connect-src 'self' ws: wss:;");

const server = createServer(app);
const wss = new WebSocketServer({ server });

if (!process.env.DEEPGRAM_API_KEY) {
  throw new Error('❌ DEEPGRAM_API_KEY is not defined in environment variables.');
}

const deepgramClient = createClient(process.env.DEEPGRAM_API_KEY);

const setupDeepgram = (ws: WebSocket): ListenLiveClient => {
  const deepgram = deepgramClient.listen.live({
    language: 'en',
    punctuate: true,
    smart_format: true,
    model: 'nova-2',
  });

  const keepAlive = setInterval(() => {
    if (deepgram.getReadyState() === 1) {
      console.log('🔄 Deepgram: Keepalive');
      deepgram.keepAlive();
    }
  }, 10 * 1000);

  deepgram.addListener(LiveTranscriptionEvents.Open, () => {
    console.log('✅ Deepgram: Connected');

    deepgram.addListener(LiveTranscriptionEvents.Transcript, (data) => {
      console.log('🎙️ Deepgram: Transcript received');
      ws.send(JSON.stringify(data));
    });

    deepgram.addListener(LiveTranscriptionEvents.Close, () => {
      console.log('🔴 Deepgram: Disconnected');
      clearInterval(keepAlive);
      deepgram.finish();
    });

    deepgram.addListener(LiveTranscriptionEvents.Error, (error) => {
      console.error('❌ Deepgram Error:', error);
    });
  });

  return deepgram;
};

wss.on('connection', (ws) => {
  console.log('🟢 Client connected');
  let deepgram: ListenLiveClient | undefined = setupDeepgram(ws);

  ws.on('message', (message) => {
    const data = message.toString();

    if (deepgram && deepgram.getReadyState() === 1) {
      deepgram.send(data);
    } else {
      console.log('🔁 Reconnecting to Deepgram...');
      deepgram?.finish();
      deepgram?.removeAllListeners();
      deepgram = setupDeepgram(ws);
    }
  });

  ws.on('close', () => {
    console.log('🔴 Client disconnected');
    deepgram?.finish();
    deepgram?.removeAllListeners();
    deepgram = undefined;

    if (ws.readyState !== WebSocket.CLOSED) {
      ws.terminate();
    }
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 WebSocket server running on port ${PORT}`);
});
