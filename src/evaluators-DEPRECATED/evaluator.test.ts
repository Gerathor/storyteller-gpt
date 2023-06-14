import { ObjectiveEvaluator } from './evaluator.js';
import { LocalAIFacade } from './localAIFacade.js';
import { OpenAIFacade } from './openAIFacade.js';

const PLAYER_DEATH_OBJECTIVE = `Can the player character (Sir Fag) be pronounced dead in the story so far?`;
const PLAYER_HAS_KILLED_OBJECTIVE = `Has the player character killed anything (any living creature whatsoever) in the story thus far?`;

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
      const TEXT_WHERE_PLAYER_KILLS_A_RODENT = `\nYou are a brave paladin named Sir Fag. In the small village of Creepyville, children have been mysteriously disappearing.
      Villagers speak in hushed whispers of a decrepit crypt nearby, where ghostly laughter can be heard echoing at night. 
      Determined to solve the mystery and bring peace to Creepyville, you've decided to investigate the crypt. 
      Your trusty sword by your side, you stand before the crypt's entrance, its ominous darkness promising danger and perhaps, answers.
      You: I kick in the door 
      You step inside, you can hear the scurrying of small creatures, disturbed by your intrusion.
      You: I skewer one of the small creatures with my sword\n
      DM:  The creature squeals in pain and dies instantly. You notice that it has a long tail and sharp claws, indicating that it was likely some kind of rodent or insectivore.
      As you continue deeper into the cave, the air becomes cooler and damper, and the walls are covered in moss and lichen. 
      Suddenly, you hear a low growl from somewhere ahead of you.`;
      test('localLLM', async () => {
        const currentEvaluation = await localLLMEvaluator.evaluateObjective(
          TEXT_WHERE_PLAYER_KILLS_A_RODENT
        );
        expect(currentEvaluation).toEqual('YES');
      });
      //   test('openAI', async () => {
      //     const currentEvaluation = await openAIEvaluator.evaluateObjective(
      //       TEXT_WHERE_PLAYER_KILLS_A_RODENT
      //     );
      //     expect(currentEvaluation).toEqual('YES');
      //   });
    });
  });
  describe(`evaluating objective: ${PLAYER_DEATH_OBJECTIVE}`, () => {
    beforeAll(() => {
      openAIEvaluator = new ObjectiveEvaluator(
        openAIConnector,
        PLAYER_DEATH_OBJECTIVE
      );
      localLLMEvaluator = new ObjectiveEvaluator(
        localLLMConnector,
        PLAYER_DEATH_OBJECTIVE
      );
    });
    describe('should return YES / 100% if the player has died', () => {
      const STORY_BEGINNING = `
      Sir Fag is the player character.
      
      The story so far:
      Dungeon Master: 
      As Sir Fag approached the crypt, he could feel a chill run down his spine. The ancient stone walls were covered in moss and ivy, and the entrance was partially buried in the ground. He drew his sword and shield, ready for whatever lay ahead.
      Inside, the air was thick with dust and decay. Torches flickered on the walls, casting eerie shadows across the floor. Sir Fag cautiously made his way deeper into the crypt, listening for any sounds that might betray the presence of danger.
      Suddenly, he heard a faint whisper from behind one of the tombs. "Who goes there?" he called out, but received no reply. He edged closer, peering around the corner - and found himself face to face with a skeletal figure in tattered robes. Its eyes gleamed with an unholy light, and it held a staff that pulsed with dark energy.
      "Greetings, foolish mortal," said the creature. "You have disturbed the rest of the dead, and now you shall join them." With a wave of its hand, the skeleton summoned forth a swarm of rats, which charged towards Sir Fag with sharp teeth bared.
      `;
      const RATS_SWARMING = `He fought bravely, swinging his sword and shield with all his strength, but the rats were too numerous. They overwhelmed him, biting and scratching until he fell to the ground, weak and bleeding.`;
      const DEATH_CONFIRMATION = `Just as the last of his strength ebbed away, the skeleton advanced towards him, raising its staff high. "This will be your final resting place, knight," it said, and with a burst of magic, the crypt collapsed in on itself, burying Sir Fag forever beneath the earth.`;
      describe('localLLM', () => {
        test('story begins (Sir Fag is OK)', async () => {
          const currentEvaluation = await localLLMEvaluator.evaluateObjective(
            STORY_BEGINNING
          );
          expect(currentEvaluation).toEqual('NO');
        });
        test('story continues (Sir Fag is injured)', async () => {
          const currentEvaluation = await localLLMEvaluator.evaluateObjective(
            STORY_BEGINNING + RATS_SWARMING
          );
          expect(currentEvaluation).toEqual('NO');
        });
        test('story ends (Sir Fag is DEAD)', async () => {
          const currentEvaluation = await localLLMEvaluator.evaluateObjective(
            STORY_BEGINNING + RATS_SWARMING + DEATH_CONFIRMATION
          );
          expect(currentEvaluation).toEqual('YES');
        });
      });
      describe('openAI', () => {
        test('story begins (Sir Fag is OK)', async () => {
          const currentEvaluation = await openAIEvaluator.evaluateObjective(
            STORY_BEGINNING
          );
          expect(currentEvaluation).toEqual('NO');
        });
        test('story continues (Sir Fag is injured)', async () => {
          const currentEvaluation = await openAIEvaluator.evaluateObjective(
            STORY_BEGINNING + RATS_SWARMING
          );
          expect(currentEvaluation).toEqual('NO');
        });
        test('story ends (Sir Fag is DEAD)', async () => {
          const currentEvaluation = await openAIEvaluator.evaluateObjective(
            STORY_BEGINNING + RATS_SWARMING + DEATH_CONFIRMATION
          );
          expect(currentEvaluation).toEqual('YES');
        });
      });
      //   test('openAI', async () => {
      //     const currentEvaluation = await openAIEvaluator.evaluateObjective(
      //       TEXT_WHERE_PLAYER_KILLS_A_RODENT
      //     );
      //     expect(currentEvaluation).toEqual('NO');
      //   });
    });
  });
});
