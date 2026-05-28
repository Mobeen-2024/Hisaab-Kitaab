import { GoogleGenAI } from '@google/genai';
import { getLiveApiKey } from '../lib/ai';

export interface LiveVoiceCallbacks {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onTextReceived?: (text: string) => void;
  onAudioReceived?: (base64Audio: string) => void;
  onToolCall?: (name: string, args: any, callId: string) => Promise<any>;
  onError?: (err: Error) => void;
}

export class LiveVoiceService {
  private callbacks: LiveVoiceCallbacks = {};
  private connected = false;
  private systemInstruction = '';
  private tools: any[] = [];
  
  // Keep conversation history for context during text chat
  private history: any[] = [];

  async connect(
    systemInstruction: string,
    tools: any[],
    callbacks: LiveVoiceCallbacks
  ): Promise<void> {
    this.disconnect();
    this.callbacks = callbacks;
    this.systemInstruction = systemInstruction;
    this.tools = tools;
    this.history = [];

    try {
      // We don't actually open a websocket, just mark as connected.
      this.connected = true;
      console.log('[LiveVoice] "Connected" to HTTP standard generateContent');
      if (this.callbacks.onConnect) {
        this.callbacks.onConnect();
      }
    } catch (err: any) {
      console.error('[LiveVoice] connect() failed:', err);
      if (this.callbacks.onError) {
        this.callbacks.onError(err);
      }
      throw err;
    }
  }

  sendAudioChunk(base64Chunk: string): void {
    // We ignore raw audio chunks. The mic hook will use SpeechRecognition
    // to transcribe the user's voice to text, and call sendTextMessage instead.
  }

  async sendTextMessage(text: string): Promise<void> {
    if (!this.connected) {
      console.warn('[LiveVoice] sendTextMessage called but not connected');
      return;
    }
    
    // Add user message to history
    this.history.push({ role: 'user', parts: [{ text }] });

    try {
      const apiKey = await getLiveApiKey();
      const ai = new GoogleGenAI({ apiKey });
      const sdkTools = this.tools.length > 0 ? [{ functionDeclarations: this.tools }] : undefined;

      console.log('[LiveVoice] Sending HTTP request to gemini-3.1-flash-lite...');
      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-3.1-flash-lite', // Using standard model which supports free tier
        contents: this.history,
        config: {
          systemInstruction: this.systemInstruction,
          tools: sdkTools,
        }
      });

      let fullResponse = '';
      let functionCallMade = false;

      for await (const chunk of responseStream) {
        if (chunk.text && this.callbacks.onTextReceived) {
          fullResponse += chunk.text;
          this.callbacks.onTextReceived(chunk.text);
        }
        
        // Handle tool calls if any
        if (chunk.functionCalls && chunk.functionCalls.length > 0) {
          functionCallMade = true;
          for (const call of chunk.functionCalls) {
            if (this.callbacks.onToolCall) {
              const callId = call.id ?? call.name;
              try {
                const result = await this.callbacks.onToolCall(call.name, call.args, callId);
                // In standard HTTP we'd need to send another request with the result to continue.
                // For this basic implementation we'll just push it to history.
                this.history.push({ 
                  role: 'model', 
                  parts: [{ functionCall: call }] 
                });
                this.history.push({
                  role: 'user',
                  parts: [{ functionResponse: { name: call.name, id: callId, response: result } }]
                });
                // Trigger a follow up request
                this.sendTextMessage("Please continue based on the function result.");
              } catch (e: any) {
                console.error("Tool execution failed:", e);
              }
            }
          }
        }
      }

      if (fullResponse && !functionCallMade) {
        this.history.push({ role: 'model', parts: [{ text: fullResponse }] });
      }

    } catch (err: any) {
      console.error('[LiveVoice] Error sending text:', err);
      if (this.callbacks.onError) {
        this.callbacks.onError(err);
      }
    }
  }

  disconnect(): void {
    this.connected = false;
    this.callbacks = {};
    this.history = [];
    console.log('[LiveVoice] Disconnected');
  }
}
