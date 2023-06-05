// Define an interface that all LLM facades should adhere to
export interface LLMFacade {
  generateResponse(query: string): Promise<any>;
  extractLastResponseText(response: any): string;
}

// Define a class for each LLM facade that implements the above interface

// The main class that performs the objective evaluation
export class ObjectiveEvaluator {
  private model: LLMFacade;
  private objective: string; // e.g. 'Has the player character died in the story thus far?'
  public currentEvaluation: string;

  constructor(model: LLMFacade, objective: string) {
    this.model = model;
    this.objective = objective;
    this.currentEvaluation = '';
  }

  async evaluateObjective(storySoFar: string) {
    const query = `You are an AI assistant to an AI dungeon master. You need to evaluate your objective question and provide a clear and concise answer based on the answer format, based on the story so far. Do not elaborate on your reasoning.
  
      THE STORY SO FAR:
      ${storySoFar}
    
      ANSWER FORMAT:
      Answer in YES or NO, or if you think the answer is ambiguous, answer with a percentage between 0 and 100.
  
      QUESTION:
      ${this.objective}
    
      ANSWER:
      `;

    const response = await this.model.generateResponse(query);
    this.currentEvaluation = response;
    return this.currentEvaluation;
  }
}
