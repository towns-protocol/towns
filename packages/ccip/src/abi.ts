/**
 * Hand-maintained ABI definitions for CCIP-read gateway.
 * These are stable interface definitions that rarely change.
 */

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IAddrResolver - Used in test scripts for address resolution
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const iAddrResolverAbi = [
    {
        type: 'function',
        inputs: [{ name: 'node', internalType: 'bytes32', type: 'bytes32' }],
        name: 'addr',
        outputs: [{ name: '', internalType: 'address payable', type: 'address' }],
        stateMutability: 'view',
    },
    {
        type: 'event',
        anonymous: false,
        inputs: [
            { name: 'node', internalType: 'bytes32', type: 'bytes32', indexed: true },
            { name: 'a', internalType: 'address', type: 'address', indexed: false },
        ],
        name: 'AddrChanged',
    },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IExtendedResolver - L2 resolver interface with resolve(bytes, bytes)
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const iExtendedResolverAbi = [
    {
        type: 'function',
        inputs: [
            { name: 'name', internalType: 'bytes', type: 'bytes' },
            { name: 'data', internalType: 'bytes', type: 'bytes' },
        ],
        name: 'resolve',
        outputs: [{ name: '', internalType: 'bytes', type: 'bytes' }],
        stateMutability: 'view',
    },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IL1ResolverService - Defines the CCIP-read request format
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const il1ResolverServiceAbi = [
    {
        type: 'function',
        inputs: [
            { name: 'name', internalType: 'bytes', type: 'bytes' },
            { name: 'data', internalType: 'bytes', type: 'bytes' },
            { name: 'targetChainId', internalType: 'uint64', type: 'uint64' },
            {
                name: 'targetRegistryAddress',
                internalType: 'address',
                type: 'address',
            },
        ],
        name: 'stuffedResolveCall',
        outputs: [
            { name: 'result', internalType: 'bytes', type: 'bytes' },
            { name: 'expires', internalType: 'uint64', type: 'uint64' },
            { name: 'sig', internalType: 'bytes', type: 'bytes' },
        ],
        stateMutability: 'view',
    },
] as const


