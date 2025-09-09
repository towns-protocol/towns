export function safeEnv(keys: string[]): string | undefined {
    if (typeof process !== 'object') {
        return undefined
    }
    for (const key of keys) {
        // look for the key in process.env
        if (process.env[key]) {
            return process.env[key]
        }
        // look for the key in process.env.VITE_ for vite apps
        const viteKey = `VITE_${key}`
        if (process.env[viteKey]) {
            return process.env[viteKey]
        }
    }
    return undefined
}
