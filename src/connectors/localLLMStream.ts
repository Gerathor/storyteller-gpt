import WebSocket from 'ws';
import { BaseLLM, BaseLLMParams } from 'langchain/llms';
import { Generation } from 'langchain/schema';
import EventEmitter from 'events';

interface TextGenerationWebUIOptions extends BaseLLMParams {
  uri?: string;
}

function areOverlapping(string1: string, string2: string): boolean {
  if (string1.length > string2.length) {
    return string1.startsWith(string2);
  } else {
    return string2.startsWith(string1);
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
  }

  async call(prompt: string): Promise<string> {
    const data = {
      prompt: prompt,
      max_new_tokens: 500,
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
      min_length: 100,
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
      this.socket = new WebSocket(this.uri);

      this.socket.on('open', () => {
        this.socket?.send(JSON.stringify(data));
      });

      this.socket.on('message', (message: Buffer) => {
        const incomingData = JSON.parse(message.toString());
        switch (incomingData['event']) {
          case 'text_stream': {
            const incomingText = incomingData['text'];
            this.buffer += incomingText; // Add incoming text to buffer
            if (areOverlapping(this.buffer, this.endingString)) {
              if (
                this.buffer.toLowerCase() === this.endingString.toLowerCase()
              ) {
                // Todo: end connection because the ending string is detected
                this.socket?.close();
                const fullString = this.incomingStream;
                this.incomingStream = '';
                this.buffer = '';
                // this.events.removeAllListeners(); // Remove all previous listeners
                resolve(fullString);
                break;
              } else break;
            } else {
              // If the buffer does not contain the ending string, emit the whole buffer and clear it
              this.events.emit('incomingTextStream', this.buffer);
              this.incomingStream += this.buffer;
              this.buffer = '';
            }

            break;
          }

          case 'stream_end': {
            this.events.emit('end'); // Emit an end event when the stream ends
            this.socket?.close();
            const fullString = this.incomingStream; // Do not include the buffer in the final string
            this.incomingStream = '';
            this.buffer = '';
            resolve(fullString); // Resolve the promise when the stream ends
            break;
          }
          default:
            break;
        }
      });

      this.socket.on('error', (error: Error) => {
        reject(error);
      });

      this.socket.on('close', (code: number, reason: string) => {
        if (code !== 1000) {
          reject(
            new Error(`Websocket closed with code ${code} and reason ${reason}`)
          );
        }
      });
    });
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
