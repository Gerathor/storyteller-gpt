import { BaseLLM, BaseLLMParams } from 'langchain/llms';
import axios from 'axios';
import { Generation, LLMResult } from 'langchain/schema';

interface TextGenerationWebUIOptions extends BaseLLMParams {
  url?: string;
}
export class MyLocalAI extends BaseLLM {
  url;
  constructor(options: TextGenerationWebUIOptions) {
    super(options);
    this.url = options.url || 'http://localhost:5000/api/v1/generate';
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
    const options = {
      headers: { 'Content-Type': 'application/json' },
      url: this.url,
      method: 'post',
      data
    };
    try {
      const response = await axios(options);
      if (response.data.results.length > 1) {
        console.log('RESPONSE WAS LONGER THAN 1', response.data.results);
      }
      const responseText = response.data.results[0].text;

      //typeguard for string
      if (typeof responseText !== 'string') {
        throw new Error('Response was not a string!');
      }
      // The call method needs to return a Promise<string>, so we just return responseText directly
      return responseText;
    } catch (error) {
      console.error(error);
    }
    return '';
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
    return { url: this.url };
  }
}
// Use the LLM
