import { BaseLLM } from 'langchain/llms';

export async function rewriteScene(
  currentCampaignSummary: string,
  fullTranspiredStory: string,
  model: BaseLLM
): Promise<string> {
  // Create the question prompt
  const questionPrompt = `Your task is to summarize what has happened so far in a scene that is a smaller part of a bigger story.
The overarching narrative of the story is:
${currentCampaignSummary}

Scene to be summarized:
${fullTranspiredStory}

Summarization: `;

  // Get the rewritten summary
  const rewrittenSummary = await model.call(questionPrompt);

  return rewrittenSummary;
}
