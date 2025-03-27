import { FunctionHash } from './types'

export const ERC4337 = {
    SimpleAccount: {
        Factory: '0x9406Cc6185a346906296840746125a0E44976454',
        Implementation: '0x8ABB13360b87Be5EEb1B98647A016adD927a136c',
    },
    ModularAccount: {
        Factory: '0x00000000000017c61b5bEe81050EC8eFc9c6fecd',
        Implementation: '0x000000000000c5A9089039570Dd36455b5C07383', // Semi modular smart account bytecode
    },
    LightAccount: {
        Factory: '0x0000000000400CdFef5E2714E63d8040b700BC24',
        Implementation: '0x8E8e658E22B12ada97B402fF0b044D6A325013C7',
    },
} as const

// don't go below 1.1x, userop requires an increase of at least 10% of gas fees for replacement
export const MAX_MULTIPLIER = 1.3
export const NON_SPONSORED_LOGIN_METHODS = ['email']
export const NON_SPONSORED_FUNCTION_HASHES: FunctionHash[] = ['checkIn', 'unsponsored', 'trading']
