export const executeBatchAbi = [
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'dest',
                type: 'address[]',
            },
            {
                internalType: 'bytes[]',
                name: 'func',
                type: 'bytes[]',
            },
        ],
        name: 'executeBatch',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
] as const

export const executeAbi = [
    {
        inputs: [
            {
                internalType: 'address',
                name: 'dest',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'value',
                type: 'uint256',
            },
            {
                internalType: 'bytes',
                name: 'func',
                type: 'bytes',
            },
        ],
        name: 'execute',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
] as const

export const upgradeAbi = [
    {
        inputs: [{ internalType: 'address', name: 'newImplementation', type: 'address' }],
        name: 'upgradeTo',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'address', name: 'newImplementation', type: 'address' },
            { internalType: 'bytes', name: 'data', type: 'bytes' },
        ],
        name: 'upgradeToAndCall',
        outputs: [],
        stateMutability: 'payable',
        type: 'function',
    },
] as const

export const ownerAbi = [
    {
        inputs: [],
        name: 'owner',
        outputs: [{ internalType: 'address', name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const

export const simpleAccountAbi = [
    ...executeBatchAbi,
    ...executeAbi,
    ...upgradeAbi,
    ...ownerAbi,
] as const
