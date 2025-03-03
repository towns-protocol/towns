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
