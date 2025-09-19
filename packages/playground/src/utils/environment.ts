import { SafeEnvOpts } from '@towns-protocol/utils'

export const VITE_ENV_OPTIONS: SafeEnvOpts = {
    env: import.meta.env,
    keyPrefix: 'VITE_',
}
