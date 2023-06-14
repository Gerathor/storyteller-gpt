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
    const query = `Answer the the text in question with a clear YES/NO/MAYBE answer, followed by a percentage score with how confident you are in the answer.
  
      Use the following format:
      TEXT IN QUESTION: Text corpus about which the question is being asked
      QUESTION: the input question you must answer
      FINAL ANSWER: the final answer to the original input question, starting with YES, NO, or MAYBE followed by a percentage. Example: "YES - 100%"
      
      BEGIN!

      THE STORY SO FAR:
      ${storySoFar}
    
      QUESTION:
      ${this.objective}
      
      FINAL ANSWER:`;

    const response = await this.model.generateResponse(query);
    this.currentEvaluation = response;
    return this.currentEvaluation;
  }
}
