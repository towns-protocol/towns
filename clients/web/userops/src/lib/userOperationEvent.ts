import { GetLogsReturnType } from 'viem'

export const userOperationEventAbi = {
    anonymous: false,
    inputs: [
        {
            indexed: true,

            name: 'userOpHash',
            type: 'bytes32',
        },
        {
            indexed: true,

            name: 'sender',
            type: 'address',
        },
        {
            indexed: true,

            name: 'paymaster',
            type: 'address',
        },
        {
            indexed: false,

            name: 'nonce',
            type: 'uint256',
        },
        { indexed: false, name: 'success', type: 'bool' },
        {
            indexed: false,

            name: 'actualGasCost',
            type: 'uint256',
        },
        {
            indexed: false,

            name: 'actualGasUsed',
            type: 'uint256',
        },
    ],
    name: 'UserOperationEvent',
    type: 'event',
} as const

export type UserOperationEvent = GetLogsReturnType<typeof userOperationEventAbi>[0]

// export function viemToEthersUserOperationEvent(event: UserOperationEvent) {
//     return {
//         args: {
//             userOpHash: event.args.userOpHash,
//             sender: event.args.sender,
//             paymaster: event.args.paymaster,
//             nonce: event.args.nonce,
//             success: event.args.success,
//             actualGasCost: event.args.actualGasCost,
//             actualGasUsed: event.args.actualGasUsed,
//         },
//         // Add other Ethers event properties that might be needed
//         transactionHash: event.transactionHash,
//         blockNumber: event.blockNumber,
//         blockHash: event.blockHash,
//         logIndex: event.logIndex,
//         removed: event.removed,
//         address: event.address,
//         data: event.data,
//         topics: event.topics,
//         // Add event interface properties
//         event: 'UserOperationEvent',
//         eventSignature: 'UserOperationEvent(bytes32,address,address,uint256,bool,uint256,uint256)',
//     } as unknown as TypedEvent<[string, string, string, BigNumber, boolean, BigNumber, BigNumber]>
// }
