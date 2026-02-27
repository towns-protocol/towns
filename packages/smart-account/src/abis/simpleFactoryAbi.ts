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

export const getAddressAbi = [
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
        name: 'getAddress',
        outputs: [
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
] as const

export const simpleFactoryAbi = [...createAccountAbi, ...getAddressAbi] as const
