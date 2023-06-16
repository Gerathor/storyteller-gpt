import fs from 'fs';
import { MyLocalAI } from '../connectors/localLLM.js';
import { ProgressEstimator } from './progressEstimator.js';
import { evaluateChildrenScoresIfUndefined } from './thoughtEvaluator.js';

const DO_NOT_MENTION_SUBQUESTIONS = `Omit usage of the word 'sub-questions' in your answer.`;

export interface ThoughtNode {
  question: string;
  answer: string;
  children: ThoughtNode[];
  evaluationScore?: number;
}

export class TreeOfThought {
  private client: MyLocalAI;
  private forwardPassCounter;

  constructor(client: MyLocalAI) {
    this.client = client;
    this.forwardPassCounter = new ProgressEstimator();
  }

  private cleanSubQuestion(subQuestion: string): string {
    return subQuestion.replace(/^\d+\.\s*/, '').trim();
  }

  // function that asks the LLM to answer 1 question specifically
  private async answerQuestion(question: string): Promise<string> {
    const questionPrompt = `Given the question "${question}", what is the most accurate answer you can provide? ${DO_NOT_MENTION_SUBQUESTIONS}  Answer:\n`;
    return this.client.call(questionPrompt);
  }

  private async answerSubquestionBasedOnParentAnswer(
    parentQuestion: string,
    parentAnswer: string,
    subQuestion: string
  ): Promise<string> {
    const questionPrompt = `Given the question "${parentQuestion}" and its answer "${parentAnswer}", how would you refine or update the answer to the related sub-question "${subQuestion}"? ${DO_NOT_MENTION_SUBQUESTIONS} Answer:\n`;
    return this.client.call(questionPrompt);
  }

  private async summarizeAnswers(
    parentQuestion: string,
    children: ThoughtNode[]
  ): Promise<string> {
    const subQuestionsAndTheirAnswers = children
      .map((child) => `${child.question}: ${child.answer}`)
      .join('\n');
    const questionPrompt = `Given the question: ${parentQuestion}, and the following related sub-questions and their answers:\n${subQuestionsAndTheirAnswers}\n\nProvide a concise summary of all of the sub-questions and their answers. ${DO_NOT_MENTION_SUBQUESTIONS} Answer:\n`;
    return this.client.call(questionPrompt);
  }

  private async generateSubQuestions(question: string): Promise<string> {
    const subQuestionsPrompt = `Given the question "${question}", what are some related sub-plots that we could explore?
    Separate each sub-question with a SINGLE newline. ${DO_NOT_MENTION_SUBQUESTIONS} Answer:\n`;
    return this.client.call(subQuestionsPrompt);
  }

  private async constructDecisionTreeQuestionsRecursively(
    question: string,
    depth: number
  ): Promise<ThoughtNode> {
    if (depth <= 0) {
      return { question: question, answer: '', children: [] };
    }

    const subQuestionsResponse = await this.generateSubQuestions(question);

    // If we're at the maximum depth, treat the response as a single answer. Otherwise, split into sub-questions.
    const subQuestions = subQuestionsResponse
      .split('\n')
      .filter((subQuestion) => subQuestion.length >= 3);

    // Generate first draft answer to the question + recursively create child leaves
    const children: ThoughtNode[] = [];
    for (let subQuestion of subQuestions) {
      subQuestion = this.cleanSubQuestion(subQuestion);
      const child = await this.constructDecisionTreeQuestionsRecursively(
        subQuestion,
        depth - 1
      );
      child.answer = await this.answerQuestion(subQuestion);
      console.log(`QUESTION: "${subQuestion}"\nANSWER: ${child.answer}\n\n`);
      children.push(child);
    }

    // Evaluate and prune children nodes
    const evaluatedNode = await evaluateChildrenScoresIfUndefined(this.client, {
      question: question,
      answer: '',
      children: children
    });

    evaluatedNode.children = evaluatedNode.children.filter((child) => {
      const shouldKeep = child.evaluationScore && child.evaluationScore >= 5;
      if (!shouldKeep) {
        console.log(
          `PRUNED: " Question: ${child.question} | Answer: ${child.answer}"`
        );
      }
      return shouldKeep;
    });

    return evaluatedNode;
  }

  private async forwardPass(node: ThoughtNode): Promise<void> {
    for (const child of node.children) {
      await this.forwardPass(child);
    }

    let summaryAnswer = node.answer;
    // Summarize the answers to the sub-questions, if there are multiple
    if (node.children.length > 1) {
      summaryAnswer = await this.summarizeAnswers(node.question, node.children);
    }
    node.answer = summaryAnswer;
  }
  private async backwardPass(node: ThoughtNode): Promise<void> {
    // Generate new answers to the sub-questions given the answer to the initial question
    for (const child of node.children) {
      const newAnswer = await this.answerSubquestionBasedOnParentAnswer(
        node.question,
        node.answer,
        child.question
      );
      child.answer = newAnswer;
      await this.backwardPass(child);
    }
  }

  private async iterativeRefinement(
    node: ThoughtNode,
    maxPasses = 3
  ): Promise<void> {
    let oldAnswer;
    let counter = 0;
    while (node.answer !== oldAnswer) {
      oldAnswer = node.answer;

      await this.forwardPass(node);
      fs.writeFileSync(
        `checkpoint_${counter}_afterforward.json`,
        JSON.stringify(node)
      );
      await this.backwardPass(node);

      fs.writeFileSync(
        `checkpoint_${counter}_afterbackwards.json`,
        JSON.stringify(node)
      );
      counter += 1;
      if (counter > maxPasses) break;
    }
  }

  public async generate(
    initialQuestion: string,
    depth = 3,
    filenameForCheckpoint = 'checkpoint'
  ): Promise<{ answer: string; tree: ThoughtNode }> {
    const tree = await this.constructDecisionTreeQuestionsRecursively(
      initialQuestion,
      depth
    );
    // fs.writeFileSync(`${filenameForCheckpoint}.json`, JSON.stringify(tree));
    // import tree from checkpoint.json

    // let evalTestTree = JSON.parse(
    //   fs.readFileSync('./checkpoint_0_afterbackwards.json', 'utf8')
    // );

    // evalTestTree = await evaluateChildrenScoresIfUndefined(
    //   this.client,
    //   evalTestTree
    // );

    // const tree = JSON.parse(
    //   fs.readFileSync(`./${filenameForCheckpoint}.json`, 'utf8')
    // );
    // save const tree into a json file for later use

    await this.iterativeRefinement(tree);
    // fs.writeFileSync(
    //   `${filenameForCheckpoint}_after_refinement.json`,
    //   JSON.stringify(tree)
    // );
    return { answer: tree.answer, tree: tree };
  }
}
