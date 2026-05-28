import { getLiveApiKey } from '../lib/ai';

export interface LiveVoiceCallbacks {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onTextReceived?: (text: string) => void;
  onAudioReceived?: (base64Audio: string) => void;
  onToolCall?: (name: string, args: any, callId: string) => Promise<any>;
  onError?: (err: Error) => void;
  onListeningStateChange?: (isListening: boolean) => void;
}

export class LiveVoiceService {
  private ws: WebSocket | null = null;
  private callbacks: LiveVoiceCallbacks = {};
  private isConnected = false;

  async connect(
    systemInstruction: string,
    tools: any[],
    callbacks: LiveVoiceCallbacks
  ): Promise<void> {
    this.disconnect();
    this.callbacks = callbacks;

    try {
      const apiKey = await getLiveApiKey();
      // Gemini Live Bidirectional WebSocket API Endpoint
      const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;

      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.sendSetupMessage(systemInstruction, tools);
        if (this.callbacks.onConnect) {
          this.callbacks.onConnect();
        }
      };

      this.ws.onclose = () => {
        this.handleDisconnect();
      };

      this.ws.onerror = (ev) => {
        console.error('Gemini Live WebSocket error:', ev);
        const err = new Error('WebSocket connection error');
        if (this.callbacks.onError) {
          this.callbacks.onError(err);
        }
      };

      this.ws.onmessage = async (event) => {
        try {
          const rawData = typeof event.data === 'string' ? event.data : await event.data.text();
          const message = JSON.parse(rawData);
          this.handleServerMessage(message);
        } catch (e) {
          console.error('Error parsing Gemini Live message:', e);
        }
      };
    } catch (err: any) {
      console.error('Failed to connect to Gemini Live:', err);
      if (callbacks.onError) {
        callbacks.onError(err);
      }
      throw err;
    }
  }

  sendAudioChunk(base64Chunk: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'audio/pcm',
            data: base64Chunk,
          },
        ],
      },
    };

    this.ws.send(JSON.stringify(message));
  }

  sendTextMessage(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message = {
      realtimeInput: {
        text: text,
      },
    };

    this.ws.send(JSON.stringify(message));
  }

  sendToolResponse(name: string, callId: string, result: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message = {
      toolResponse: {
        functionResponses: [
          {
            name: name,
            response: { output: result },
            id: callId,
          },
        ],
      },
    };

    this.ws.send(JSON.stringify(message));
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.handleDisconnect();
  }

  private handleDisconnect(): void {
    if (this.isConnected) {
      this.isConnected = false;
      if (this.callbacks.onDisconnect) {
        this.callbacks.onDisconnect();
      }
    }
  }

  private sendSetupMessage(systemInstruction: string, tools: any[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const setupMessage = {
      setup: {
        model: 'models/gemini-2.0-flash-exp', // Highly stable live model
        generationConfig: {
          responseModalities: ['TEXT'], // Request text responses first. Audio responses can be added if TTS is desired.
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Puck', // Standard natural voice
              },
            },
          },
        },
        systemInstruction: {
          parts: [
            {
              text: systemInstruction,
            },
          ],
        },
        tools: tools.length > 0 ? [{ functionDeclarations: tools }] : undefined,
      },
    };

    this.ws.send(JSON.stringify(setupMessage));
  }

  private async handleServerMessage(message: any): Promise<void> {
    // 1. Handle Model Turn Content
    if (message.serverContent?.modelTurn?.parts) {
      for (const part of message.serverContent.modelTurn.parts) {
        if (part.text && this.callbacks.onTextReceived) {
          this.callbacks.onTextReceived(part.text);
        }
        if (part.inlineData?.data && this.callbacks.onAudioReceived) {
          this.callbacks.onAudioReceived(part.inlineData.data);
        }
      }
    }

    // 2. Handle Tool/Function Calls
    if (message.toolCall?.functionCalls) {
      for (const call of message.toolCall.functionCalls) {
        if (this.callbacks.onToolCall) {
          try {
            const result = await this.callbacks.onToolCall(call.name, call.args || {}, call.id);
            this.sendToolResponse(call.name, call.id, result);
          } catch (err) {
            console.error(`Error executing tool call ${call.name}:`, err);
            this.sendToolResponse(call.name, call.id, { error: String(err) });
          }
        }
      }
    }
  }
}
