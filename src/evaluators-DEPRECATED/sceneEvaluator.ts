import { BaseLLM } from 'langchain/llms';
import { MyLocalAI } from '../connectors/localLLM.js';

// The main class that performs the objective evaluation
export class SceneEvaluator {
  private model: BaseLLM;
  private objective: string; // e.g. 'Should the current scene end and move to the next?'
  public currentEvaluation: string;

  constructor() {
    this.model = new MyLocalAI({});
    this.objective = 'Is it appropriate to move to the next scene now?';
    this.currentEvaluation = '';
  }

  async evaluateObjective(
    sceneSoFar: string,
    currentSceneSummary: string,
    nextSceneSummary: string
  ) {
    const query = `Answer the following question with a clear YES/NO answer, followed by a percentage score with how confident you are in the answer. Use the format: "YES - 100%".
    
        THE SCENE SO FAR:
        ${sceneSoFar}
      
        WHAT THE GOAL OF THE SCENE SHOULD BE:
        ${currentSceneSummary}
        
        WHAT THE NEXT SCENE WILL BE ABOUT:
        ${nextSceneSummary}
        
        QUESTION:
        ${this.objective}
        
        FINAL ANSWER:`;

    this.currentEvaluation = await this.model.call(query);
    return this.currentEvaluation;
  }
}
