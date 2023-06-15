import { BaseLLM } from 'langchain/llms';
import { StoryNode } from './storyTree.js';

export interface EvaluationResult {
  score: number;
  reasoning: string;
}

function parseScore(scoresString: string): EvaluationResult {
  // Extract score
  const scoreMatch = scoresString.match(/\[(\d+)\]/);
  let score = scoreMatch ? Number(scoreMatch[1]) : -1; // defaults to -1 if no match found
  if (score == -1) {
    console.log('#### WARNING - No score found in: ' + scoresString);
  } else {
    // Clamp score between 1 and 10
    if (score < 1) score = 1;
    if (score > 10) score = 10;
  }

  // Extract reasoning
  let reasoning = '';
  const reasoningMatch = scoresString.match(/\]\s*(.*?)(?:\n|$)/s);
  if (reasoningMatch) {
    reasoning = reasoningMatch[1].trim(); // Remove leading and trailing whitespaces
  }

  return { score, reasoning };
}

export async function evaluateAllNodeSummaries(
  client: BaseLLM,
  node: StoryNode
): Promise<StoryNode> {
  // Exit clause: If the node has no children, there's no need to evaluate it.
  if (node.children.length === 0) {
    return node;
  }

  const LEADING_SCORE = `Score: [`;
  const scoringPrompt = `Given the following summary of a story and its detailed descriptions, rate the summary's coherence with its details on a scale from 1 to 10.
Put your score in [square brackets], followed by your reasons as to why you gave that number.
Note: a higher score means the summary is more coherent, inclusive, and accurate to its details.

Summary to be rated:
${node.shortSummary}
Details:
${node.children
  .map((childNode) => {
    return childNode.shortSummary;
  })
  .join('\n')}
  
  ${LEADING_SCORE}`;

  const scoresString = await client.call(scoringPrompt);
  const scores = parseScore(LEADING_SCORE + scoresString);

  node.evalScore = scores.score;
  node.evalReasoning = scores.reasoning;
  // Recursively call this function for each of the node's children
  for (const childNode of node.children) {
    await evaluateAllNodeSummaries(client, childNode);
  }
  return node;
}
