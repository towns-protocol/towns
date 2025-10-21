import { dlogWarn } from './dlog'

export interface SafeEnvOpts {
    // for looking up keys anywhere other than process.env, i.e. pass import.meta.env in a vite app
    env?: Record<string, string | undefined>
    // for looking up keys with a prefix, i.e. pass 'VITE_' for vite apps
    keyPrefix?: string
}

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

export function safeEnvEx(args: {
    keys: string[]
    opts: SafeEnvOpts | undefined
    warning?: string
    defaultValue: string
}): string {
    const { keys, opts, warning, defaultValue } = args
    const url = safeEnv(keys, opts)
    if (url) {
        return url
    }
    if (warning) {
        const logger = dlogWarn('csb:env')
        logger(warning)
    }
    return defaultValue
}
