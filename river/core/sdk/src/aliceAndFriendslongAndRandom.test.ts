/**
 * @group main
 */

import { dlog } from '@river-build/dlog'
import seedrandom from 'seedrandom'
import { converse } from './testDriver.test_util'

const log = dlog('test:aliceAndFriends')

describe('aliceAndBobAndFriendslongAndRandom', () => {
    test('longAndRandom', async () => {
        const rng = seedrandom('this is not a random')
        const conversation: string[][] = []
        for (let i = 0; i < 100; i++) {
            const step: string[] = []
            for (let j = 0; j < 10; j++) {
                step.push(rng() < 0.3 ? `step ${i} from ${j}` : '')
            }

            // Skip step if all are empty.
            if (step.some(Boolean)) {
                conversation.push(step)
            }
        }

        log(`longAndRandom starting`)
        const convResult = await converse(conversation, 'longAndRandom')
        log(`longAndRandom completed`, convResult)
        expect(convResult).toBe('success')
    })
})
