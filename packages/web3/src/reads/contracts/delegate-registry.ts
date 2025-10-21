import { Address, getContract, isAddress, PublicClient } from 'viem'

const v1RegistryContractAddress = '0x00000000000076a84fef008cdabe6409d2fe638b'
const delegationTypeAll = 1

const delegateRegistryJsonAbi = [
    {
        type: 'function',
        name: 'getDelegationsByDelegate',
        inputs: [
            {
                name: 'delegate',
                type: 'address',
                internalType: 'address',
            },
        ],
        outputs: [
            {
                name: '',
                type: 'tuple[]',
                internalType: 'struct IDelegateRegistryV1.DelegationInfo[]',
                components: [
                    {
                        name: 'type_',
                        type: 'uint8',
                        internalType: 'enum IDelegateRegistryV1.DelegationType',
                    },
                    {
                        name: 'vault',
                        type: 'address',
                        internalType: 'address',
                    },
                    {
                        name: 'delegate',
                        type: 'address',
                        internalType: 'address',
                    },
                    {
                        name: 'contract_',
                        type: 'address',
                        internalType: 'address',
                    },
                    {
                        name: 'tokenId',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                ],
            },
        ],
        stateMutability: 'view',
    },
] as const

export async function computeDelegatorsForProvider(
    publicClient: PublicClient,
    wallets: string[],
): Promise<Address[]> {
    const contract = getContract({
        address: v1RegistryContractAddress,
        abi: delegateRegistryJsonAbi,
        client: publicClient,
    })
    const delegatorWallets = (
        await Promise.all(
            wallets.map(async (wallet) => {
                if (!isAddress(wallet)) {
                    throw new Error('Invalid wallet address')
                }
                return (
                    (await contract.read.getDelegationsByDelegate([wallet]))
                        // Keep only delegations that cede the entire wallet
                        .filter((info) => info.type_ == delegationTypeAll)
                        // The 'vault' is the delegator wallet that cedes to one of wallets
                        // passed in via the parameters
                        .map((info) => info.vault)
                )
            }),
        )
    ).reduce((left, right) => [...left, ...right])

    // Return de-duped list of wallets, in case delegate wallets occur >1x across
    // ethereum mainnet and testnets.
    return [...new Set(delegatorWallets)]
}
