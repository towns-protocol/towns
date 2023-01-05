import { Address, useAccount, useContractEvent } from 'wagmi'
import { Abi } from 'abitype'
import { ethers } from 'ethers'
import { useZionClient } from 'use-zion-client'
import { useCreateSpaceFormStore } from './CreateSpaceFormStore'

type ListenerProps = {
    spaceManager: NonNullable<ReturnType<typeof useZionClient>['spaceManager']>
}

export const CreateSpaceEventListener = ({ spaceManager }: ListenerProps) => {
    const { address } = useAccount()
    const iface = new ethers.utils.Interface(spaceManager?.eventsAbi as string)
    const setMintedTokenAddress = useCreateSpaceFormStore((s) => s.setMintedTokenAddress)

    useContractEvent({
        address: spaceManager.address,
        abi: spaceManager.eventsAbi as Abi,
        eventName: 'CreateSpace',
        listener: async (data, owner, eventData) => {
            if (owner !== address) {
                return
            }
            const _owner = owner as Address

            const eData = eventData as unknown as {
                data: string
                topics: string[]
                getTransaction: () => Promise<ethers.providers.TransactionResponse>
            }

            console.log('[CreatSpace] Event Emitted: ', {
                data,
                owner,
                parseLog: iface.parseLog({ data: eData.data, topics: eData.topics }),
                decodeLog: iface.decodeEventLog('CreateSpace', eData.data, eData.topics),
                eventData,
                eventDataTransaction: await eData.getTransaction(), // can retrieve the `from` address in case we remove owner (msgSender()) from event signature
            })

            setMintedTokenAddress(_owner) // replace with contract address
        },
    })

    return null
}
