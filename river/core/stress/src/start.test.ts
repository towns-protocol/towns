import { dlogger } from '@river-build/dlog'
import { printSystemInfo } from './utils/systemInfo'

const logger = dlogger('stress:test')

describe('run.test.ts', () => {
    it('just runs', () => {
        printSystemInfo(logger)
        expect(true).toBe(true)
    })
})
