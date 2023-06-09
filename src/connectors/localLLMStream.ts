import WebSocket from 'ws';
import { BaseLLM, BaseLLMParams } from 'langchain/llms';
import { Generation } from 'langchain/schema';
import EventEmitter from 'events';
import { colorizeLog } from '../stringManipulators.js';

const SHOW_DEBUG = true;
const optionalLog = (log: string): void => {
  if (SHOW_DEBUG) {
    console.log(colorizeLog(log));
  }
};
interface TextGenerationWebUIOptions extends BaseLLMParams {
  uri?: string;
}

function areOverlapping(string1: string, string2: string): boolean {
  const lowerString1 = string1.toLowerCase();
  const lowerString2 = string2.toLowerCase();
  if (lowerString1.length > lowerString2.length) {
    return lowerString1.startsWith(lowerString2);
  } else {
    return lowerString2.startsWith(lowerString1);
  }
}
export class MyLocalAIStream extends BaseLLM {
  uri: string;
  socket: WebSocket | null = null;
  public events = new EventEmitter();
  private incomingStream = '';
  private endingString = 'player:';
  private buffer = ''; // Buffer to hold back text

  constructor(options: TextGenerationWebUIOptions) {
    super(options);
    this.uri = options.uri || 'ws://localhost:5005/api/v1/stream';
    this.createSocket().catch((error) => {
      console.error(`Error creating socket: ${error}`);
    });
  }

  async createSocket(): Promise<void> {
    this.socket = new WebSocket(this.uri);

    this.socket.on('message', (message: Buffer) => {
      const incomingData = JSON.parse(message.toString());
      switch (incomingData['event']) {
        case 'text_stream': {
          const incomingText = incomingData['text'];
          this.buffer += incomingText;
          if (areOverlapping(this.buffer.trim(), this.endingString)) {
            if (this.buffer.toLowerCase() === this.endingString.toLowerCase()) {
              this.events.emit('end');
              this.incomingStream = '';
              this.buffer = '';
            }
          } else {
            // If the buffer does not contain the ending string, emit the whole buffer and clear it
            this.events.emit('incomingTextStream', this.buffer);
            this.incomingStream += this.buffer;
            this.buffer = '';
          }
          break;
        }

        case 'stream_end': {
          this.events.emit('end');
          this.incomingStream = '';
          this.buffer = '';
          break;
        }
        default:
          break;
      }
    });

    this.socket.on('close', (code: number, reason: string) => {
      if (code !== 1000) {
        console.error(
          `Websocket closed with code ${code} and reason ${reason}`
        );
      }
    });
  }

  sendDataWhenOpen(
    data: object,
    resolve: (value: string | PromiseLike<string>) => void,
    reject: (reason?: any) => void
  ) {
    if (!this.socket) {
      reject('No socket');
      return;
    }

    optionalLog('>>>>>>>>>>>>>>>> SENDING DATA <<<<<<<<<<<<<<<<');
    this.socket.send(JSON.stringify(data));
  }

  sendData(
    data: object,
    resolve: (value: string | PromiseLike<string>) => void,
    reject: (reason?: any) => void
  ) {
    if (!this.socket) {
      reject('No socket');
      return;
    }

    if (this.socket.readyState === WebSocket.OPEN) {
      this.sendDataWhenOpen(data, resolve, reject);
    } else {
      this.socket.once('open', () =>
        this.sendDataWhenOpen(data, resolve, reject)
      );
    }
  }
  waitForResponse(): Promise<string> {
    return new Promise((resolve, reject) => {
      const handleError = (error: unknown) => {
        console.log('Error occurred: ', error);
        reject(error);
        this.events.off('error', handleError); // remove this listener
      };

      const handleEnd = () => {
        // This event is emitted when the socket receives a 'stream_end' message
        // or when the ending string is detected in the buffer
        const fullString = this.incomingStream;
        this.incomingStream = '';
        this.buffer = '';
        resolve(fullString);
        this.events.off('error', handleError); // remove error listener
      };

      this.events.once('end', handleEnd);
      this.events.on('error', handleError);
    });
  }

  async call(prompt: string): Promise<string> {
    const data = {
      prompt: prompt,
      max_new_tokens: 150,
      do_sample: true,
      temperature: 1.3,
      top_p: 0.1,
      typical_p: 1,
      epsilon_cutoff: 0, // In units of 1e-4
      eta_cutoff: 0, // In units of 1e-4
      tfs: 1,
      top_a: 0,
      repetition_penalty: 1.18,
      top_k: 40,
      min_length: 50,
      no_repeat_ngram_size: 0,
      num_beams: 1,
      penalty_alpha: 0,
      length_penalty: 1,
      early_stopping: false,
      mirostat_mode: 0,
      mirostat_tau: 5,
      mirostat_eta: 0.1,
      seed: -1,
      add_bos_token: true,
      truncation_length: 2048,
      ban_eos_token: false,
      skip_special_tokens: true,
      stopping_strings: '\nPlayer'
    };

    return new Promise((resolve, reject) => {
      if (!(this.socket && this.socket.readyState === WebSocket.OPEN)) {
        this.socket?.once('open', () => {
          this.sendDataWhenOpen(data, resolve, reject);
          this.waitForResponse().then(resolve).catch(reject);
        });
      } else {
        // the socket is already connected, we can proceed
        this.sendDataWhenOpen(data, resolve, reject);
        this.waitForResponse().then(resolve).catch(reject);
      }
    });
  }

  cleanup() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.removeAllListeners();
      this.socket.close();
    }
    this.incomingStream = '';
    this.buffer = '';
  }

  async _generate(prompts: string[]): Promise<{
    generations: Generation[][];
  }> {
    // _generate needs to return a Promise<LLMResult>, so we need to adjust this method to match
    // The exact structure of LLMResult would depend on the langchain/llms library,
    // but it will likely include the generated text and possibly some metadata
    const generations = [];
    for (const prompt of prompts) {
      const generatedText = await this.call(prompt);
      // Assuming LLMResult is a structure like { generations: [{generated: string}] }
      const generation: Generation = {
        text: generatedText
      };
      generations.push([generation]);
    }
    return { generations };
  }

  _llmType() {
    // This should return a string that identifies this class of LLM.
    // We'll use the name of the class.
    return 'MyLocalAI';
  }

  _identifyingParams() {
    // This should return a record of parameters that identify this LLM.
    // As a simple example, we'll return the "url" parameter.
    return { uri: this.uri };
  }
}
