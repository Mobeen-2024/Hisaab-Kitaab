const WebSocket = require('ws');
require('dotenv').config();

const apiKey = process.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
    console.log("No API key found!");
    process.exit(1);
}

const ws = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`);

ws.on('open', () => {
  console.log('OPEN');
  ws.send(JSON.stringify({
    setup: {
      model: 'models/gemini-2.0-flash-exp',
      generationConfig: {
        responseModalities: ['TEXT']
      }
    }
  }));
});

ws.on('message', (d) => {
  console.log('MSG', d.toString());
});

ws.on('close', (c, r) => {
  console.log('CLOSE', c, r.toString());
});

ws.on('error', (e) => {
  console.log('ERROR', e);
});
