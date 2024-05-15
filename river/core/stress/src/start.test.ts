import { dlogger } from '@river-build/dlog'
import { printSystemInfo } from './utils/utils'

const logger = dlogger('stress:test')

describe('run.test.ts', () => {
    it('just runs', () => {
        printSystemInfo(logger)
        expect(true).toBe(true)
    })
})
