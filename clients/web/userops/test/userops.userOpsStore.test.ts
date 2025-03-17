import { describe, it, expect, beforeEach } from 'vitest'
import { migrations, V2PersistentState } from '../src/store/userOpsStoreMigrations'
import superjson from 'superjson'
import { IUserOperation } from '../src/types'
import { UserOperation } from 'viem/account-abstraction'

const sender = '0xb2f87c9E9C3861F0ca82b7123705a88A12661dec'
const callData =
    '0xb61d27f60000000000000000000000000ffc0417c209b68d7179f58e5c8e278f7b9f0ec20000000000000000000000000000000000000000000000000001e01e94b1fc00000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000c4c46be00e0000000000000000000000005ee9a56bac37ae99d9775c5236f167a098af0fcf0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000001e01e94b1fc00d84f1ce61d61c8efd7a23558edcee0726aa5a042605270d4aa51f7ba7c2ea6e1200ffc0417c209b68d7179f58e5c8e278f7b9f0ec2000000000000000000000000000000000000000000000000000000000000000000000000000000'
const signature =
    '0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c' as const
const callGasLimit = 162744n
const verificationGasLimit = 65217n
const preVerificationGas = 89581n
const maxFeePerGas = 126224n
const maxPriorityFeePerGas = 125000n
const userOpHash = '0x3a434f1cd4800f8e68c51e654390c768bb6fc126db8d21d680aa4978771641ba'

const op = {
    callData,
    sender,
    initCode: '0x',
    nonce: 96n,
    signature,
    callGasLimit,
    verificationGasLimit,
    preVerificationGas,
    maxFeePerGas,
    maxPriorityFeePerGas,
    paymasterAndData: '0x',
    // @ts-expect-error - added via spread
    paymasterPostOpGasLimit: undefined,
    paymasterVerificationGasLimit: undefined,
} satisfies IUserOperation

const decodedCallData = {
    toAddress: '0x0ffC0417C209B68D7179f58e5c8e278F7B9F0ec2',
    value: 527896925043712n,
    executeData:
        '0xc46be00e0000000000000000000000005ee9a56bac37ae99d9775c5236f167a098af0fcf0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000001e01e94b1fc00d84f1ce61d61c8efd7a23558edcee0726aa5a042605270d4aa51f7ba7c2ea6e1200ffc0417c209b68d7179f58e5c8e278f7b9f0ec20000000000000000000000',
    functionHash: 'tip',
    executeType: 'single',
} as const

const spaceId = '100ffc0417c209b68d7179f58e5c8e278f7b9f0ec20000000000000000000000'

const opDetails = {
    op,
    decodedCallData,
    value: 527896925043712n,
    functionHashForPaymasterProxy: 'tip',
    spaceId,
} as const

// Mock V2 state structure
const mockV2State = {
    userOps: {
        '0xTestAddress1': {
            operationAttempt: 1,
            rejectedSponsorshipReason: undefined,
            retryDetails: undefined,
            sequenceName: undefined,
            current: {
                ...opDetails,
            },
            pending: {
                ...opDetails,
                hash: userOpHash,
            },
        },
    },
} satisfies V2PersistentState

const v3OpDetails = {
    sender,
    nonce: 96n,
    initCode: '0x',
    callData,
    callGasLimit,
    verificationGasLimit,
    preVerificationGas,
    maxFeePerGas,
    maxPriorityFeePerGas,
    paymasterAndData: '0x',
    signature,
} satisfies UserOperation

describe('userOpsStore', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    describe('migrations', () => {
        it('should correctly migrate from V2 to V3', async () => {
            // Setup V2 state in localStorage
            const storageKey = 'towns/user-ops'
            const v2StateWithMeta = {
                state: mockV2State,
                version: 2,
            }

            localStorage.setItem(storageKey, superjson.stringify(v2StateWithMeta))

            // Manually run the migration
            const migratedState = migrations[2](mockV2State)

            // Verify migration results
            expect(migratedState).toHaveProperty('userOps')

            const address = '0xTestAddress1'
            const userOp = migratedState.userOps[address]

            expect(userOp.current).toEqual({
                op: v3OpDetails,
                functionHashForPaymasterProxy: 'tip',
                spaceId,
            })

            expect(userOp.pending).toEqual({
                op: v3OpDetails,
                functionHashForPaymasterProxy: 'tip',
                spaceId,
                hash: userOpHash,
            })
        })

        it('should initialize the store with migrated V2 state', async () => {
            // Setup V2 state in localStorage
            const storageKey = 'towns/user-ops'
            const v2StateWithMeta = {
                state: mockV2State,
                version: 2,
            }
            localStorage.setItem(storageKey, superjson.stringify(v2StateWithMeta))

            // import this after setting localStorage state!!!
            const userOpsStore = (await import('../src/store/userOpsStore')).userOpsStore

            const state = userOpsStore.getState()
            expect(state).toHaveProperty('userOps')
            expect(Object.keys(state.userOps)).toEqual(['0xTestAddress1'])
            const userOp = state.userOps['0xTestAddress1']

            expect(userOp.current).toEqual({
                op: v3OpDetails,
                functionHashForPaymasterProxy: 'tip',
                spaceId,
            })

            expect(userOp.pending).toEqual({
                op: v3OpDetails,
                functionHashForPaymasterProxy: 'tip',
                spaceId,
                hash: userOpHash,
            })
        })
    })
})
