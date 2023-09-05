import React, { useEffect } from 'react'
import {
    RoomIdentifier,
    SpaceContextProvider,
    useMembers,
    useSpaceData,
    useZionContext,
} from 'use-zion-client'
import { ServiceWorkerMessageType } from './types.d'

export function ServiceWorkerSpacesSyncer() {
    const { spaceHierarchies } = useZionContext()
    return (
        <>
            {Object.values(spaceHierarchies).map(({ root }) => (
                <SpaceContextProvider key={root.id.networkId} spaceId={root.id}>
                    <MessageSender spaceId={root.id} />
                </SpaceContextProvider>
            ))}
        </>
    )
}

function MessageSender({ spaceId }: { spaceId: RoomIdentifier }) {
    const space = useSpaceData(spaceId)
    const members = useMembers(spaceId)

    useEffect(() => {
        navigator.serviceWorker.controller?.postMessage({
            type: ServiceWorkerMessageType.SpaceMetadata,
            space,
        })
    }, [space])

    useEffect(() => {
        navigator.serviceWorker.controller?.postMessage({
            type: ServiceWorkerMessageType.SpaceMembers,
            membersMap: members.membersMap,
        })
    }, [members.membersMap, space])

    return null
}
