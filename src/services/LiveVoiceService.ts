import { GoogleGenAI } from '@google/genai';
import { getLiveApiKey, AI_MODELS } from '../lib/ai';

export interface LiveVoiceCallbacks {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onTextReceived?: (text: string) => void;
  onTurnComplete?: (fullText: string) => void;
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
  private currentAbortController: AbortController | null = null;

  async connect(
    systemInstruction: string,
    tools: any[],
    callbacks: LiveVoiceCallbacks
  ): Promise<void> {
    this.disconnect();
    this.callbacks = callbacks;
    this.systemInstruction = systemInstruction;
    this.tools = tools;
    this.history = [
      { role: 'user', parts: [{ text: `System Context: ${systemInstruction}` }] },
      { role: 'model', parts: [{ text: "Understood. I am ready to help." }] }
    ];

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

  async sendTextMessage(text: string | null): Promise<void> {
    if (!this.connected) {
      console.warn('[LiveVoice] sendTextMessage called but not connected');
      return;
    }

    // Interruption logic: Abort any active streaming response immediately
    if (this.currentAbortController) {
      console.log('[LiveVoice] Interruption detected! Aborting previous stream.');
      this.currentAbortController.abort();
    }
    this.currentAbortController = new AbortController();
    const abortSignal = this.currentAbortController.signal;
    
    // Add user message to history only if text is provided
    if (text !== null) {
      this.history.push({ role: 'user', parts: [{ text }] });
    }

    try {
      const apiKey = await getLiveApiKey();
      const ai = new GoogleGenAI({ apiKey });
      const sdkTools = this.tools.length > 0 ? [{ functionDeclarations: this.tools }] : undefined;

      console.log(`[LiveVoice] Sending HTTP request to ${AI_MODELS.live}...`);
      const responseStream = await ai.models.generateContentStream({
        model: AI_MODELS.live,
        contents: this.history,
        config: {
          tools: sdkTools,
        }
      });

      let fullResponse = '';
      let functionCallMade = false;
      const aggregatedModelParts: any[] = [];
      const functionResponsesToSend: any[] = [];

      for await (const chunk of responseStream) {
        // Interruption check: Stop processing chunks immediately if aborted
        if (abortSignal.aborted) {
          console.log('[LiveVoice] Stream execution terminated via AbortController.');
          return;
        }

        // Collect exact model parts to preserve metadata (like thought_signature)
        if (chunk.candidates && chunk.candidates.length > 0 && chunk.candidates[0].content && chunk.candidates[0].content.parts) {
          for (const p of chunk.candidates[0].content.parts) {
            aggregatedModelParts.push(p);
          }
        }

        // Handle tool calls first
        if (chunk.functionCalls && chunk.functionCalls.length > 0) {
          functionCallMade = true;
          for (const call of chunk.functionCalls) {
            if (this.callbacks.onToolCall) {
              const callId = call.id ?? call.name;
              try {
                const result = await this.callbacks.onToolCall(call.name, call.args, callId);
                // Queue the function response to send AFTER the loop
                functionResponsesToSend.push({
                  functionResponse: { name: call.name, id: callId, response: result }
                });
              } catch (e: any) {
                console.error("Tool execution failed:", e);
              }
            }
          }
        } else {
          // Safely extract text to avoid SDK getter throwing
          let chunkText = '';
          try {
            if (chunk.text) chunkText = chunk.text;
          } catch (e) { }

          if (chunkText && this.callbacks.onTextReceived) {
            fullResponse += chunkText;
            this.callbacks.onTextReceived(chunkText);
          }
        }
      }

      // Check abort before updating history
      if (abortSignal.aborted) return;

      // After stream finishes, push the fully aggregated model parts to history
      if (aggregatedModelParts.length > 0) {
        this.history.push({ role: 'model', parts: aggregatedModelParts });
      } else if (fullResponse && !functionCallMade) {
        this.history.push({ role: 'model', parts: [{ text: fullResponse }] });
      }

      if (fullResponse && this.callbacks.onTurnComplete) {
        this.callbacks.onTurnComplete(fullResponse);
      }

      // If we made function calls, push the responses and trigger the follow-up
      if (functionCallMade && functionResponsesToSend.length > 0) {
        this.history.push({
          role: 'user',
          parts: functionResponsesToSend
        });
        this.sendTextMessage(null);
      }

    } catch (err: any) {
      if (err.name === 'AbortError' || abortSignal.aborted) {
        console.log('[LiveVoice] Request was aborted safely.');
        return;
      }
      console.error('[LiveVoice] Error sending text:', err);
      if (this.callbacks.onError) {
        this.callbacks.onError(err);
      }
    } finally {
      if (this.currentAbortController?.signal === abortSignal) {
        this.currentAbortController = null;
      }
    }
  }

  disconnect(): void {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
    this.connected = false;
    this.callbacks = {};
    this.history = [];
    console.log('[LiveVoice] Disconnected');
  }
}

