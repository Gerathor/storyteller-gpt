// import { LLMFacade } from './evaluators/evaluator.js';

// interface Scene {
//   description: string;
// }

// export class SceneTeller {
//   private model: LLMFacade;
//   private scenes: Scene[];
//   public currentEvaluation: string;

//   constructor(model: LLMFacade, objective: string) {
//     this.model = model;
//     this.objective = objective;
//     this.currentEvaluation = '';
//   }

//   async evaluateObjective(storySoFar: string) {
//     const query = `Answer the the text in question with a clear YES/NO/MAYBE answer, followed by a percentage score with how confident you are in the answer.

//         Use the following format:
//         TEXT IN QUESTION: Text corpus about which the question is being asked
//         QUESTION: the input question you must answer
//         FINAL ANSWER: the final answer to the original input question, starting with YES, NO, or MAYBE followed by a percentage. Example: "YES - 100%"

//         BEGIN!

//         THE STORY SO FAR:
//         ${storySoFar}

//         QUESTION:
//         ${this.objective}

//         FINAL ANSWER:`;

//     const response = await this.model.generateResponse(query);
//     this.currentEvaluation = response;
//     return this.currentEvaluation;
//   }
// }
