import { ObjectiveEvaluator } from './evaluator.js';
import { LocalAIFacade } from './localAIFacade.js';
import { OpenAIFacade } from './openAIFacade.js';

const PLAYER_DEATH_OBJECTIVE = `Has the player character died in the story thus far?`;
const PLAYER_HAS_KILLED_OBJECTIVE = `Has the player character killed anything in the story thus far?`;

describe('evaluator', () => {
  jest.setTimeout(30000);
  const openAIConnector = new OpenAIFacade();
  const localLLMConnector = new LocalAIFacade();
  let localLLMEvaluator: ObjectiveEvaluator;
  let openAIEvaluator: ObjectiveEvaluator;
  describe(`evaluating objective: ${PLAYER_HAS_KILLED_OBJECTIVE}`, () => {
    beforeAll(() => {
      openAIEvaluator = new ObjectiveEvaluator(
        openAIConnector,
        PLAYER_HAS_KILLED_OBJECTIVE
      );
      localLLMEvaluator = new ObjectiveEvaluator(
        localLLMConnector,
        PLAYER_HAS_KILLED_OBJECTIVE
      );
    });
    describe('should return YES / 100% if the player has killed something', () => {
      const TEXT_WHERE_PLAYER_KILLS_A_RODENT = `\nYou are a brave paladin named Sir Fag. In the small village of Creepyville, children have been mysteriously disappearing. Villagers speak in hushed whispers of a decrepit crypt nearby, where ghostly laughter can be heard echoing at night. Determined to solve the mystery and bring peace to Creepyville, you've decided to investigate the crypt. Your trusty sword by your side, you stand before the crypt's entrance, its ominous darkness promising danger and perhaps, answers.\n\nYou: I kick in the doo…u step inside, you can hear the scurrying of small creatures, disturbed by your intrusion. \n\nYou: I skewer one of the small creatures with my sword\nDM:  The creature squeals in pain and dies instantly. You notice that it has a long tail and sharp claws, indicating that it was likely some kind of rodent or insectivore. As you continue deeper into the cave, the air becomes cooler and damper, and the walls are covered in moss and lichen. Suddenly, you hear a low growl from somewhere ahead of you.`;
      test('localLLM', async () => {
        const currentEvaluation = await localLLMEvaluator.evaluateObjective(
          TEXT_WHERE_PLAYER_KILLS_A_RODENT
        );
        expect(currentEvaluation).toEqual('YES');
      });
      test('openAI', async () => {
        const currentEvaluation = await openAIEvaluator.evaluateObjective(
          TEXT_WHERE_PLAYER_KILLS_A_RODENT
        );
        expect(currentEvaluation.toLowerCase().includes('yes')).toEqual(true);
      });
    });
  });
});
