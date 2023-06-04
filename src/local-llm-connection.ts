import axios from 'axios';

export async function proomptLocalAI(prompt: string) {
  const data = {
    prompt: prompt,
    max_new_tokens: 250,
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
    stopping_strings: []
  };
  const options = {
    headers: { 'Content-Type': 'application/json' },
    url: 'http://localhost:5000/api/v1/generate',
    method: 'post',
    data
  };
  try {
    const response = await axios(options);
    if (response.data.results.length > 1) {
      console.log('RESPONSE WAS LONGER THAN 1', response.data.results);
    }
    return response.data.results[0].text;
  } catch (error) {
    console.error(error);
  }
}
