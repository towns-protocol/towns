import React, { useEffect } from 'react'
import {
    SpaceContextProvider,
    useMyProfile,
    useSpaceData,
    useUserLookupContext,
    useZionContext,
} from 'use-zion-client'
import { GlobalContextUserLookupProvider } from 'use-zion-client/dist/components/UserLookupContext'
import { ServiceWorkerMessageType } from './types.d'

export function ServiceWorkerSpacesSyncer() {
    const { spaceHierarchies } = useZionContext()
    return (
        <GlobalContextUserLookupProvider>
            {Object.values(spaceHierarchies).map(({ root }) => (
                <SpaceContextProvider key={root.id} spaceId={root.id}>
                    <MessageSender spaceId={root.id} />
                </SpaceContextProvider>
            ))}
        </GlobalContextUserLookupProvider>
    )
}

function MessageSender({ spaceId }: { spaceId: string }) {
    const space = useSpaceData(spaceId)
    const members = useUserLookupContext()
    const myProfile = useMyProfile()

    useEffect(() => {
        if (myProfile) {
            navigator.serviceWorker.controller?.postMessage({
                type: ServiceWorkerMessageType.MyUserId,
                myProfile,
            })
        }
    }, [myProfile])

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
