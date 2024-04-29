import { dlogger } from '@river-build/dlog'
import os from 'os'

const logger = dlogger('csb:stress:test')

describe('run.test.ts', () => {
    it('just runs', () => {
        printSystemInfo()
        expect(true).toBe(true)
    })
})

function printSystemInfo() {
    logger.log('System Info:', {
        OperatingSystem: `${os.type()} ${os.release()}`,
        SystemUptime: `${os.uptime()} seconds`,
        TotalMemory: `${os.totalmem() / 1024 / 1024} MB`,
        FreeMemory: `${os.freemem() / 1024 / 1024} MB`,
        CPUCount: `${os.cpus().length}`,
        CPUModel: `${os.cpus()[0].model}`,
        CPUSpeed: `${os.cpus()[0].speed} MHz`,
    })
}
