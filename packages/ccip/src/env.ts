import type { Hex } from 'viem'

export interface Env {
    ALCHEMY_API_KEY: string
    SIGNER_PRIVATE_KEY: Hex
}

// Loads env var from either `process.env` or Cloudflare's env object
export function envVar<T extends keyof Env>(key: T, env: Env | undefined): Env[T] {
    const value = env?.[key] ?? process?.env?.[key]

    if (!value) {
        throw new Error(`Environment variable ${key} is not set`)
    }

    return value as Env[T]
}
