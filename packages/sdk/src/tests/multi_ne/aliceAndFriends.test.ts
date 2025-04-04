/**
 * @group main
 */

import { dlog } from '@towns-protocol/dlog'
import { converse } from '../testDriver_testUtils'

const log = dlog('test:aliceAndFriends')

describe('aliceAndBobAndFriends3participants', () => {
    test('3participants', async () => {
        const conversation: string[][] = [
            ["I'm Alice", "I'm Bob", ''],
            ['Alice: hi Bob', 'Bob: hi', ''],
            ['Alice: yo', '', 'Charlie here'],
            ['Alice: hello Charlie', 'Bob: hi Charlie', 'Charlie charlie'],
        ]

        const convResult = await converse(conversation, '3participants')
        expect(convResult).toBe('success')
        log(`3participants completed`, convResult)
    })
})
