import os from 'os'

export function getSystemInfo() {
    return {
        TotalMemory: `${os.totalmem() / 1024 / 1024} MB`,
        FreeMemory: `${os.freemem() / 1024 / 1024} MB`,
        CPUCount: `${os.cpus().length}`,
        CPUModel: `${os.cpus()[0].model}`,
        CPUSpeed: `${os.cpus()[0].speed} MHz`,
    }
}
