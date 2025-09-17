declare global {
    interface ImportMeta {
        readonly env: Record<string, string>
    }
}

export function safeEnv(keys: string[]): string | undefined {
    for (const key of keys) {
        // look for the key in process.env
        if (typeof process === 'object' && 'env' in process) {
            if (key in process.env) {
                return process.env[key]
            }
            // check for the vite prefix, this is the only way to pass env variables to the web client
            const viteKey = `VITE_${key}`
            if (viteKey in process.env) {
                return process.env[viteKey]
            }
        }
    }
    return undefined
}
