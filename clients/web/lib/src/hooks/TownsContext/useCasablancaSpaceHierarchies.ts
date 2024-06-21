import { useEffect, useState } from 'react'
import { Client as CasablancaClient } from '@river-build/sdk'
import { SpaceHierarchies, SpaceHierarchy } from 'types/towns-types'
import { isSpaceStreamId } from '@river-build/sdk'

export function useCasablancaSpaceHierarchies(
    casablancaClient?: CasablancaClient,
): SpaceHierarchies {
    const [spaceHierarchies, setSpaceHierarchies] = useState<SpaceHierarchies>({})

    useEffect(() => {
        if (!casablancaClient) {
            return
        }
        const updateSpaceHierarchies = () => {
            const spaceHierarchies = casablancaClient.streams.getStreams().reduce((acc, stream) => {
                if (isSpaceStreamId(stream.view.streamId)) {
                    const spaceId = stream.view.streamId
                    const spaceHierarchy = toSpaceHierarchy(casablancaClient, spaceId)
                    acc[spaceId] = spaceHierarchy
                }
                return acc
            }, {} as SpaceHierarchies)
            setSpaceHierarchies(spaceHierarchies)
        }

        const onUpdate = (streamId: string) => {
            if (isSpaceStreamId(streamId)) {
                updateSpaceHierarchies()
            }
        }

        updateSpaceHierarchies()

        casablancaClient.on('streamInitialized', onUpdate)
        casablancaClient.on('spaceChannelCreated', onUpdate)
        casablancaClient.on('spaceChannelDeleted', onUpdate)
        return () => {
            casablancaClient.off('streamInitialized', onUpdate)
            casablancaClient.off('spaceChannelCreated', onUpdate)
            casablancaClient.off('spaceChannelDeleted', onUpdate)
        }
    }, [casablancaClient])

    return spaceHierarchies
}

export function toSpaceHierarchy(
    casablancaClient: CasablancaClient,
    spaceId: string,
): SpaceHierarchy {
    const channelIds = Array.from(
        casablancaClient.stream(spaceId)?.view.spaceContent.spaceChannelsMetadata.keys() ?? [],
    )
    const channels = channelIds.map((id) => ({
        id: id,
    }))

    return {
        channels: channels,
    }
}
