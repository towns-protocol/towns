import { dlogger } from '@river-build/dlog'
import os from 'os'

export function getSystemInfo() {
    return {
        OperatingSystem: `${os.type()} ${os.release()}`,
        SystemUptime: `${os.uptime()} seconds`,
        TotalMemory: `${os.totalmem() / 1024 / 1024} MB`,
        FreeMemory: `${os.freemem() / 1024 / 1024} MB`,
        CPUCount: `${os.cpus().length}`,
        CPUModel: `${os.cpus()[0].model}`,
        CPUSpeed: `${os.cpus()[0].speed} MHz`,
    }
}

export function printSystemInfo(logger: ReturnType<typeof dlogger>) {
    logger.log('System Info:', getSystemInfo())
}
