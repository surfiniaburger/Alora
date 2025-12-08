/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  GoogleGenAI,
  LiveCallbacks,
  LiveClientToolResponse,
  LiveConnectConfig,
  LiveServerContent,
  LiveServerMessage,
  LiveServerToolCall,
  LiveServerToolCallCancellation,
  Part,
  Session,
  Blob,
} from '@google/genai';
import EventEmitter from 'eventemitter3';
import { DEFAULT_LIVE_API_MODEL } from './constants';
import { difference } from 'lodash';
import { base64ToArrayBuffer } from './utils';

/**
 * Represents a single log entry in the system.
 * Used for tracking and displaying system events, messages, and errors.
 */
export interface StreamingLog {
  count?: number;
  data?: unknown;
  date: Date;
  message: string | object;
  type: string;
}

/**
 * Event types that can be emitted by the MultimodalLiveClient.
 */
export interface LiveClientEventTypes {
  audio: (data: ArrayBuffer) => void;
  close: (event: CloseEvent) => void;
  content: (data: LiveServerContent) => void;
  error: (e: ErrorEvent) => void;
  interrupted: () => void;
  log: (log: StreamingLog) => void;
  open: () => void;
  setupcomplete: () => void;
  toolcall: (toolCall: LiveServerToolCall) => void;
  toolcallcancellation: (
    toolcallCancellation: LiveServerToolCallCancellation
  ) => void;
  turncomplete: () => void;
  generationcomplete: () => void;
  inputTranscription: (text: string, isFinal: boolean) => void;
  outputTranscription: (text: string, isFinal: boolean) => void;
}

/**
 * Minimal interface for the MultimodalLiveClient to be used by other parts of the application.
 */
export interface MultimodalLiveClient {
  send: (messages: Part | Part[]) => void;
  sendRealtimeText: (text: string) => void;
}

export class GenAILiveClient implements MultimodalLiveClient {
  public readonly model: string = DEFAULT_LIVE_API_MODEL;
  private emitter = new EventEmitter<LiveClientEventTypes>();

  public on = this.emitter.on.bind(this.emitter);
  public off = this.emitter.off.bind(this.emitter);
  public once = this.emitter.once.bind(this.emitter);

  protected readonly client: GoogleGenAI;
  protected session?: Session;

  private _status: 'connected' | 'disconnected' | 'connecting' = 'disconnected';
  public get status() {
    return this._status;
  }

  constructor(apiKey: string, model?: string) {
    if (model) this.model = model;
    this.client = new GoogleGenAI({ apiKey });
  }

  public async connect(config: LiveConnectConfig): Promise<boolean> {
    if (this._status === 'connected' || this._status === 'connecting') {
      return false;
    }

    this._status = 'connecting';
    const callbacks: LiveCallbacks = {
      onopen: this.onOpen.bind(this),
      onmessage: this.onMessage.bind(this),
      onerror: this.onError.bind(this),
      onclose: this.onClose.bind(this),
    };

    try {
      this.session = await this.client.live.connect({
        model: this.model,
        config: { ...config },
        callbacks,
      });
    } catch (e: any) {
      console.error('Error connecting to GenAI Live:', e);
      this._status = 'disconnected';
      this.session = undefined;
      const errorEvent = new ErrorEvent('error', {
        error: e,
        message: e?.message || 'Failed to connect.',
      });
      this.onError(errorEvent);
      return false;
    }

    this._status = 'connected';
    return true;
  }

  public disconnect() {
    this.session?.close();
    this.session = undefined;
    this._status = 'disconnected';
    this.log('client.close', `Disconnected`);
    return true;
  }

  public send(parts: Part | Part[], turnComplete: boolean = true) {
    if (this._status !== 'connected' || !this.session) {
      console.warn('[GenAILiveClient] Attempted to send text/parts while disconnected. Ignoring.');
      return;
    }
    this.session.sendClientContent({ turns: parts, turnComplete });
    this.log(`client.send`, parts);
  }

  public sendRealtimeText(text: string) {
    if (this._status !== 'connected' || !this.session) {
      console.warn(`[GenAILiveClient] Attempted to sendRealtimeText "${text}" while disconnected. Ignoring.`);
      return;
    }
    this.session.sendRealtimeInput({ text });
    this.log(`client.send`, text);
  }

  async sendRealtimeInput(chunks: Blob[]) {
    if (this._status !== 'connected' || !this.session) {
      // Audio/Video frames coming in during reconnection are normal, just ignore.
      return;
    }

    try {
      for (const chunk of chunks) {
        this.session.sendRealtimeInput({ media: chunk });
      }
    } catch (e: any) {
      // Silently ignore errors during reconnection to prevent "WebSocket is already in CLOSING or CLOSED state" clutter
      // Only log if it's NOT that specific error
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes('CLOSING') && !msg.includes('CLOSED')) {
        console.warn(`[GenAILiveClient] Failed to send input:`, msg);
      }
    }
  }

  public sendToolResponse(toolResponse: LiveClientToolResponse) {
    if (this._status !== 'connected' || !this.session) {
      console.warn('[GenAILiveClient] Attempted to sendToolResponse while disconnected. This is expected during mode switching.');
      return;
    }
    if (toolResponse.functionResponses && toolResponse.functionResponses.length) {
      this.session.sendToolResponse({
        functionResponses: toolResponse.functionResponses!,
      });
    }
    this.log(`client.toolResponse`, { toolResponse });
  }

  protected onMessage(message: LiveServerMessage) {
    if (message.setupComplete) {
      this.emitter.emit('setupcomplete');
      return;
    }
    if (message.toolCall) {
      this.log('server.toolCall', message);
      this.emitter.emit('toolcall', message.toolCall);
      return;
    }
    if (message.toolCallCancellation) {
      this.log('receive.toolCallCancellation', message);
      this.emitter.emit('toolcallcancellation', message.toolCallCancellation);
      return;
    }

    if (message.serverContent) {
      const { serverContent } = message;
      if (serverContent.interrupted) {
        this.log('receive.serverContent', 'interrupted');
        this.emitter.emit('interrupted');
        return;
      }

      if (serverContent.inputTranscription) {
        this.emitter.emit(
          'inputTranscription',
          serverContent.inputTranscription.text,
          (serverContent.inputTranscription as any).isFinal ?? false,
        );
        this.log('server.inputTranscription', serverContent.inputTranscription.text);
      }

      if (serverContent.outputTranscription) {
        this.emitter.emit(
          'outputTranscription',
          serverContent.outputTranscription.text,
          (serverContent.outputTranscription as any).isFinal ?? false,
        );
        this.log('server.outputTranscription', serverContent.outputTranscription.text);
      }

      if (serverContent.modelTurn) {
        let parts: Part[] = serverContent.modelTurn.parts || [];
        const audioParts = parts.filter(p => p.inlineData?.mimeType?.startsWith('audio/pcm'));
        const base64s = audioParts.map(p => p.inlineData?.data);
        const otherParts = difference(parts, audioParts);

        base64s.forEach(b64 => {
          if (b64) {
            const data = base64ToArrayBuffer(b64);
            this.emitter.emit('audio', data as ArrayBuffer);
            this.log(`server.audio`, `buffer (${data.byteLength})`);
          }
        });

        if (otherParts.length > 0) {
          const content: LiveServerContent = { modelTurn: { parts: otherParts } };
          this.emitter.emit('content', content);
          this.log(`server.content`, message);
        }
      }

      if (serverContent.turnComplete) {
        this.log('server.send', 'turnComplete');
        this.emitter.emit('turncomplete');
      }

      if ((serverContent as any).generationComplete) {
        this.log('server.send', 'generationComplete');
        this.emitter.emit('generationcomplete');
      }
    }
  }

  protected onError(e: ErrorEvent) {
    this._status = 'disconnected';
    console.error('error:', e);
    const message = `Could not connect to GenAI Live: ${e.message}`;
    this.log(`server.${e.type}`, message);
    this.emitter.emit('error', e);
  }

  protected onOpen() {
    this._status = 'connected';
    this.emitter.emit('open');
  }

  protected onClose(e: CloseEvent) {
    this._status = 'disconnected';
    let reason = e.reason || '';
    if (reason.toLowerCase().includes('error')) {
      const prelude = 'ERROR]';
      const preludeIndex = reason.indexOf(prelude);
      if (preludeIndex > 0) {
        reason = reason.slice(preludeIndex + prelude.length + 1, Infinity);
      }
    }
    this.log(`server.${e.type}`, `disconnected ${reason ? `with reason: ${reason}` : ``}`);
    this.emitter.emit('close', e);
  }

  protected log(type: string, message: string | object) {
    this.emitter.emit('log', { type, message, date: new Date() });
  }
}