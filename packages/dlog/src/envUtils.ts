declare global {
    interface ImportMeta {
        readonly env: Record<string, string>
    }
}

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
        if (typeof import.meta === 'object' && 'env' in import.meta) {
            // first check if the key is directly set in the import.meta.env
            // for server side rendering it could be passed in,
            // or perhaps somehow you specified the vite in the key alread for some reason
            if (import.meta.env[key]) {
                return import.meta.env[key]
            }
            // otherwise check for the vite prefix, this is the only way to pass env variables to the web client
            const viteKey = `VITE_${key}`
            if (import.meta.env[viteKey]) {
                return import.meta.env[viteKey]
            }
        }
    }
    return undefined
}
