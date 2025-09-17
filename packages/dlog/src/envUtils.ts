export interface SafeEnvOpts {
    // for looking up keys anywhere other than process.env, i.e. pass import.meta.env in a vite app
    env?: Record<string, string>
    // for looking up keys with a prefix, i.e. pass 'VITE_' for vite apps
    keyPrefix?: string
}

// DO NOT COMMIT THIS COMMENT
export function safeEnv(keys: string[], opts?: SafeEnvOpts): string | undefined {
    for (const keyRef of keys) {
        // check for key prefix
        const key = opts?.keyPrefix ? `${opts.keyPrefix}${keyRef}` : keyRef
        // check for key in env
        if (opts?.env) {
            if (opts.env[key]) {
                return opts.env[key]
            }
        }
        // look for the key in process.env
        if (typeof process === 'object' && 'env' in process) {
            if (process.env[key]) {
                return process.env[key]
            }
        }
    }
    return undefined
}
