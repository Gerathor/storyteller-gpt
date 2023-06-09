import { MyLocalAI } from '../localLLM.js';
import { ThoughtNode } from './treeOfThought.js';

function parseScores(scoresString: string): number[] {
  const scoreLines = scoresString.split('\n');
  const scores = scoreLines.map((line) => {
    const match = line.match(/\[(\d+)\]/); // matches numbers in brackets
    return match ? Number(match[1]) : 1; // defaults to 1 if no match found
  });
  return scores;
}

export async function evaluateChildrenScoresIfUndefined(
  client: MyLocalAI,
  node: ThoughtNode
): Promise<ThoughtNode> {
  const formatQuestionFromNode = (node: ThoughtNode, index: number) => {
    return `Question ${index}: ${node.question}\nAnswer ${index}: ${node.answer}\n`;
  };

  const childrenToEvaluate = node.children.filter(
    (child) => child.evaluationScore === undefined
  );
  const firstQuestionIndex = node.children.length - childrenToEvaluate.length;
  const LEADING_ANSWER = `Answer ${firstQuestionIndex}: [`;
  const scoringPrompt = `Given the following questions, rate each question's quality on a scale from 1 to 10.
Repeat each question and answer verbatim, and append the score at the very end in [square brackets].
Note: a higher score means the question is more clear, unique, and specific.

Questions to be rated:
${childrenToEvaluate
  .map((childNode, index) => {
    // Find the original index of the child node in the full children array
    const originalIndex = node.children.indexOf(childNode);
    return formatQuestionFromNode(childNode, originalIndex);
  })
  .join('\n')}\n\n
      Scores:\n${LEADING_ANSWER}`;

  const scoresString = await client.call(scoringPrompt);
  let scores = parseScores(LEADING_ANSWER + scoresString);

  // Assign scores to the appropriate nodes
  for (let i = 0; i < childrenToEvaluate.length; i++) {
    const originalIndex = node.children.indexOf(childrenToEvaluate[i]);
    node.children[originalIndex].evaluationScore = scores[i];
  }
  while (node.children.some((child) => child.evaluationScore === undefined)) {
    node = await evaluateChildrenScoresIfUndefined(client, node);
  }

  return node;
}
