import { useAccount, useContractEvent } from 'wagmi'
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

            console.log('[CreatSpace] Event Emitted: ', {
                data,
                owner,
                parseLog: iface.parseLog({ data: eventData.data, topics: eventData.topics }),
                decodeLog: iface.decodeEventLog('CreateSpace', eventData.data, eventData.topics),
                eventData,
                eventDataTransaction: await eventData.getTransaction(), // can retrieve the `from` address in case we remove owner (msgSender()) from event signature
            })

            setMintedTokenAddress(owner) // replace with contract address
        },
    })

    return null
}
