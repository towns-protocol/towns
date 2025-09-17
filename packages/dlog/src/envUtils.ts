declare global {
    interface ImportMeta {
        readonly env: Record<string, string>
    }
}

export function safeEnv(keys: string[]): string | undefined {
    for (const key of keys) {
        // look for the key in process.env
        if (typeof process === 'object' && 'env' in process) {
            if (process.env[key]) {
                return process.env[key]
            }
        }
        const viteKey = `VITE_${key}`
        // look for the key in import.meta.env for vite apps
        // wrap in try-catch to avoid syntax errors in non-module contexts
        try {
            if (typeof import.meta === 'object' && 'env' in import.meta) {
                // first check if the key is directly set in the import.meta.env
                // for server side rendering it could be passed in,
                // or perhaps somehow you specified the vite in the key already for some reason
                if (import.meta.env[key]) {
                    return import.meta.env[key]
                }
                // otherwise check for the vite prefix, this is the only way to pass env variables to the web client

                if (import.meta.env[viteKey]) {
                    return import.meta.env[viteKey]
                }
            }
        } catch {
            // import.meta is not available in this context (e.g., service worker)
            // silently continue to other environment variable sources
            if (typeof process === 'object' && 'env' in process) {
                if (process.env[viteKey]) {
                    return process.env[viteKey]
                }
            }
        }
    }
    return undefined
}
