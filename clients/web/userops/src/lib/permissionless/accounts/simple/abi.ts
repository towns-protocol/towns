import { Address, decodeFunctionData, encodeFunctionData, Hex } from 'viem'

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

export const encodeExecuteAbi = (args: { to: Address; value: bigint; data: Hex }) =>
    encodeFunctionData({
        abi: executeAbi,
        functionName: 'execute',
        args: [args.to, args.value, args.data],
    })

export const encodeExecuteBatchAbi = (args: { to: Address[]; data: Hex[] }) =>
    encodeFunctionData({
        abi: executeBatchAbi,
        functionName: 'executeBatch',
        args: [args.to, args.data],
    })

export const decodeExecuteBatchAbi = (data: Hex) =>
    decodeFunctionData({
        abi: executeBatchAbi,
        data,
    })

export const decodeExecuteAbi = (data: Hex) =>
    decodeFunctionData({
        abi: executeAbi,
        data,
    })

export const createAccountAbi = [
    {
        inputs: [
            {
                internalType: 'address',
                name: 'owner',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'salt',
                type: 'uint256',
            },
        ],
        name: 'createAccount',
        outputs: [
            {
                internalType: 'contract SimpleAccount',
                name: 'ret',
                type: 'address',
            },
        ],
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
