import { Address, useContractEvent } from 'wagmi'
import { ethers } from 'ethers'
import { useAuth } from 'hooks/useAuth'
import { useCreateSpaceFormStore } from './CreateSpaceFormStore'

type ListenerProps = {
    eventsAbi: ethers.ContractInterface
    contractAddress: string
}

export const CreateSpaceEventListener = ({ contractAddress }: ListenerProps) => {
    const { loggedInWalletAddress: address } = useAuth()
    const setMintedTokenAddress = useCreateSpaceFormStore((s) => s.setMintedTokenAddress)
    const abi = [
        {
            anonymous: false,
            inputs: [
                {
                    indexed: true,
                    internalType: 'address',
                    name: 'spaceAddress',
                    type: 'address',
                },
                {
                    indexed: true,
                    internalType: 'address',
                    name: 'owner',
                    type: 'address',
                },
                {
                    indexed: false,
                    internalType: 'string',
                    name: 'spaceNetworkId',
                    type: 'string',
                },
            ],
            name: 'SpaceCreated',
            type: 'event',
        },
    ] as const

    useContractEvent({
        address: contractAddress as Address,
        abi: abi,
        eventName: 'SpaceCreated',
        listener: async (spaceAddress, owner, _spaceNetworkId) => {
            if (owner !== address) {
                return
            }

            setMintedTokenAddress(spaceAddress)
        },
    })

    return null
}
