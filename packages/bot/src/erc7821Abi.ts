export const executeSingleAbi = [
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
