import { Client as CasablancaClient, Stream, isSpaceStreamId, isUserStreamId } from '@river/sdk'
import { useEffect, useState } from 'react'
import { SpaceItem } from '../../types/towns-types'
import isEqual from 'lodash/isEqual'
import { useContractSpaceInfos } from '../../hooks/use-space-data'
import { useOfflineStore } from '../../store/use-offline-store'

export function useCasablancaSpaces(casablancaClient?: CasablancaClient): SpaceItem[] {
    const [spaces, setSpaces] = useState<SpaceItem[]>([])
    const { data: spaceInfos } = useContractSpaceInfos(casablancaClient)
    const { offlineSpaceInfoMap: spaceNamesInLocalStore } = useOfflineStore()
    const userStreamId = casablancaClient?.userStreamId
    useEffect(() => {
        if (!casablancaClient || !userStreamId) {
            return
        }

        const userStream = casablancaClient.streams.get(userStreamId)
        if (!userStream) {
            return
        }

        const updateSpaces = () => {
            const streams = casablancaClient.streams
                .getStreams()
                .filter((stream: Stream) => stream.view.contentKind === 'spaceContent')
                .filter((stream: Stream) => {
                    return userStream.view.userContent.isJoined(stream.view.streamId)
                })
                .sort((a: Stream, b: Stream) => a.view.streamId.localeCompare(b.view.streamId))
                .map((stream: Stream) => {
                    const spaceName =
                        spaceInfos?.find((i) => i.networkId == stream.streamId)?.name ??
                        spaceNamesInLocalStore[stream.streamId]?.name ??
                        ''

                    return {
                        id: stream.view.streamId,
                        name: spaceName,
                        avatarSrc: '',
                    } satisfies SpaceItem
                })

            setSpaces((prev) => {
                if (isEqual(prev, streams)) {
                    return prev
                }
                return streams
            })
        }

        const onStreamChange = (streamId: string) => {
            if (isSpaceStreamId(streamId) || isUserStreamId(streamId)) {
                updateSpaces()
            }
        }

        updateSpaces()

        casablancaClient.on('streamInitialized', onStreamChange)
        casablancaClient.on('userStreamMembershipChanged', onStreamChange)
        return () => {
            casablancaClient.off('streamInitialized', onStreamChange)
            casablancaClient.off('userStreamMembershipChanged', onStreamChange)
        }
    }, [casablancaClient, spaceInfos, spaceNamesInLocalStore, userStreamId])
    return spaces
}
