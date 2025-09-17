import { describe, expect, test } from 'vitest'
import { runWithEnv } from './stress'
import { genShortId } from '@towns-protocol/sdk'

describe('stress', () => {
    test('runEnvBasic', async () => {
        const env = {
            PROCESS_INDEX: '-1',
            PROCESS_COUNT: '15',
            SESSION_ID: genShortId(),
            STRESS_MODE: 'short_chat',
            REDIS_URL: 'redis://localhost:6379',
            MNEMONIC: 'test test test test test test test test test test test junk',
        }
        await expect(runWithEnv(env)).resolves.not.toThrow()
    })
})
