import { BaseLLM } from 'langchain/llms';
import { StoryNode } from './storyTree.js';
const LEADING_SCORE = `Score: [`;

export interface EvaluationResult {
  score: number;
  reasoning: string;
}
const createScoringPrompt = (
  node: StoryNode,
  overarchingSummary: string,
  relatedSummaries: string[]
) => {
  return `Given a main story summary, related storylines, and specific story details, rate how well the detailed story aligns with the main story and the related storylines.
Note: A higher score means the detailed story is more consistent with the main story, the related storylines, and accurately represents its own details.

Main story:
${overarchingSummary}
Related storylines:
${relatedSummaries.join('\n')}
Detailed story to be rated:
${node.shortSummary}
Specific details of the story:
${node.children
  .map((childNode) => {
    return childNode.shortSummary;
  })
  .join('\n')}
Give a rating on a scale from 1 to 10.
Put your score in [square brackets], followed by your reasons for giving that score.
${LEADING_SCORE}`;
};

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
  node: StoryNode,
  siblings: StoryNode[] = [], // add a parameter for the siblings
  parent: StoryNode | null = null // add a parameter for the parent
): Promise<StoryNode> {
  // Exit clause: If the node has no children, there's no need to evaluate it.
  if (node.children.length === 0) {
    return node;
  }

  // Determine the overarching summary and related summaries
  const overarchingSummary = parent ? parent.shortSummary : '';
  const relatedSummaries = siblings.map((sibling) => sibling.shortSummary);

  // Create the scoring prompt
  const scoringPrompt = createScoringPrompt(
    node,
    overarchingSummary,
    relatedSummaries
  );

  const scoresString = await client.call(scoringPrompt);
  const scores = parseScore(LEADING_SCORE + scoresString);

  node.evalScore = scores.score;
  node.evalReasoning = scores.reasoning;

  // Recursively call this function for each of the node's children
  for (const childNode of node.children) {
    // Pass the other children (i.e., the siblings) when calling evaluateAllNodeSummaries for a child
    await evaluateAllNodeSummaries(
      client,
      childNode,
      node.children.filter((sib) => sib !== childNode)
    );
  }

  return node;
}
