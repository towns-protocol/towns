import { FunctionHash } from './types'

export const ERC4337 = {
    EntryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789', // V0.6
    SimpleAccount: {
        Factory: '0x9406Cc6185a346906296840746125a0E44976454',
    },
}

// don't go below 1.1x, userop requires an increase of at least 10% of gas fees for replacement
export const MAX_MULTIPLIER = 1.3
export const NON_SPONSORED_LOGIN_METHODS = ['email']
export const NON_SPONSORED_FUNCTION_HASHES: FunctionHash[] = ['checkIn', 'unsponsored']
