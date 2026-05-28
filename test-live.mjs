import WebSocket from 'ws';

const API_KEY = process.env.VITE_GEMINI_API_KEY || '';
const models = ['models/gemini-2.0-flash-exp', 'models/gemini-3.1-flash-live-preview', 'models/gemini-3.1-flash-lite'];

async function testModel(modelName) {
  return new Promise((resolve) => {
    const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
    console.log(`[Test] Connecting to ${url.replace(API_KEY, '***')} for model ${modelName}`);
    
    const ws = new WebSocket(url);
    
    ws.on('open', () => {
      console.log(`[Test] Connected. Sending setup for ${modelName}...`);
      ws.send(JSON.stringify({
        setup: {
          model: modelName,
        }
      }));
    });
    
    ws.on('message', (data) => {
      console.log(`[Test] Response for ${modelName}:`, data.toString());
      ws.close();
      resolve(true);
    });
    
    ws.on('error', (err) => {
      console.error(`[Test] Error for ${modelName}:`, err.message);
      resolve(false);
    });
    
    ws.on('close', (code, reason) => {
      if (code !== 1000 && code !== 1005) {
         console.log(`[Test] Closed with code ${code} for ${modelName}:`, reason.toString());
      }
      resolve(false);
    });
  });
}

async function run() {
  if (!API_KEY) {
    console.log('No API key provided. Set VITE_GEMINI_API_KEY environment variable.');
    return;
  }
  for (const model of models) {
    await testModel(model);
    console.log('---');
  }
}
run();
