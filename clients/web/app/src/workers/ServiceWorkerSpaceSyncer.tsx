import React, { useEffect } from 'react'
import {
    RoomIdentifier,
    SpaceContextProvider,
    useSpaceData,
    useUserLookupContext,
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
    const members = useUserLookupContext()

    useEffect(() => {
        navigator.serviceWorker.controller?.postMessage({
            type: ServiceWorkerMessageType.SpaceMetadata,
            space,
        })
    }, [space])

    useEffect(() => {
        navigator.serviceWorker.controller?.postMessage({
            type: ServiceWorkerMessageType.SpaceMembers,
            membersMap: members.usersMap,
        })
    }, [members.usersMap])

    return null
}
