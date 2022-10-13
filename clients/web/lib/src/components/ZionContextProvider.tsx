import React, { createContext, useContext, useMemo } from 'react'
import { useZionClientListener } from '../hooks/use-zion-client-listener'
import {
    makeRoomIdentifier,
    RoomIdentifier,
    SpaceHierarchies,
    SpaceItem,
} from '../types/matrix-types'
import { ethers } from 'ethers'
import { ZionClient } from '../client/ZionClient'
import { ZionOnboardingOpts } from '../client/ZionClientTypes'
import { useNotificationCounts } from '../hooks/ZionContext/useNotificationCounts'
import { IOnboardingState } from '../hooks/ZionContext/onboarding/IOnboardingState'
import { useOnboardingState } from '../hooks/ZionContext/useOnboardingState'
import { useSpacesIds } from '../hooks/ZionContext/useSpaceIds'
import { useSpaceUnreads } from '../hooks/ZionContext/useSpaceUnreads'
import { useSpaceMentionCounts } from '../hooks/ZionContext/useSpaceMentionCounts'
import { useSpaces } from '../hooks/ZionContext/useSpaces'
import { useSyncSpaceHierarchies } from '../hooks/ZionContext/useSyncSpaceHierarchies'
import { useFavIconBadge } from '../hooks/ZionContext/useFavIconBadge'
import { Web3ContextProvider } from './Web3ContextProvider'

export interface IZionContext {
    client?: ZionClient
    unreadCounts: Record<string, number> // channel or unaggregated space -> count;
    mentionCounts: Record<string, number> // channel or unaggregated space -> count;
    invitedToIds: string[] // ordered list of invites (spaces and channels)
    spaceIds: string[] // ordered list of space ids
    spaceUnreads: Record<string, boolean> // spaceId -> aggregated hasUnread
    spaceMentionCounts: Record<string, number> // spaceId -> aggregated mentionCount
    spaces: SpaceItem[]
    spaceHierarchies: SpaceHierarchies
    onboardingState: IOnboardingState
    homeServerUrl?: string
    disableEncryption?: boolean // TODO remove this when we support olm in the browser https://github.com/HereNotThere/harmony/issues/223
    defaultSpaceId?: RoomIdentifier
    defaultSpaceName?: string
    defaultSpaceAvatarSrc?: string
}

export const ZionContext = createContext<IZionContext | undefined>(undefined)

/**
 * use instead of React.useContext, throws if not in a Provider
 */
export function useZionContext(): IZionContext {
    const context = useContext(ZionContext)
    if (!context) {
        throw new Error('useZionContext must be used in a ZionContextProvider')
    }
    return context
}

interface Props {
    homeServerUrl: string
    onboardingOpts?: ZionOnboardingOpts
    disableEncryption?: boolean
    enableSpaceRootUnreads?: boolean
    getSignerFn?: () => ethers.Signer
    defaultSpaceId?: string
    defaultSpaceName?: string // name is temporary until peek() is implemented https://github.com/HereNotThere/harmony/issues/188
    defaultSpaceAvatarSrc?: string // avatar is temporary until peek() is implemented https://github.com/HereNotThere/harmony/issues/188
    initialSyncLimit?: number
    children: JSX.Element
}

const DEFAULT_INITIAL_SYNC_LIMIT = 20

export function ZionContextProvider(props: Props): JSX.Element {
    return (
        <Web3ContextProvider>
            <ContextImpl {...props}></ContextImpl>
        </Web3ContextProvider>
    )
}

/// the zion client needs to be nested inside a Web3 provider, hence the need for this component
const ContextImpl = (props: Props): JSX.Element => {
    const {
        homeServerUrl,
        onboardingOpts,
        disableEncryption,
        enableSpaceRootUnreads,
        getSignerFn,
        defaultSpaceId,
        defaultSpaceName,
        defaultSpaceAvatarSrc,
        initialSyncLimit,
    } = props
    const { client } = useZionClientListener(
        homeServerUrl,
        initialSyncLimit ?? DEFAULT_INITIAL_SYNC_LIMIT,
        onboardingOpts,
        disableEncryption,
        getSignerFn,
    )
    const { unreadCounts, mentionCounts } = useNotificationCounts(client)
    const { spaceIds, invitedToIds } = useSpacesIds(client)
    const { spaceMentionCounts } = useSpaceMentionCounts(client, spaceIds, mentionCounts)
    const { spaces } = useSpaces(client, spaceIds)
    const { spaceHierarchies } = useSyncSpaceHierarchies(client, spaceIds, invitedToIds)
    const { spaceUnreads } = useSpaceUnreads(
        client,
        spaceIds,
        spaceHierarchies,
        unreadCounts,
        enableSpaceRootUnreads === true,
    )

    const convertedDefaultSpaceId = useMemo(
        () => (defaultSpaceId ? makeRoomIdentifier(defaultSpaceId) : undefined),
        [defaultSpaceId],
    )

    const onboardingState = useOnboardingState(client)

    useFavIconBadge(unreadCounts, spaceHierarchies, invitedToIds, enableSpaceRootUnreads === true)

    return (
        <ZionContext.Provider
            value={{
                client,
                unreadCounts,
                mentionCounts,
                invitedToIds,
                spaceIds,
                spaceUnreads,
                spaceMentionCounts,
                spaces,
                spaceHierarchies,
                onboardingState,
                homeServerUrl,
                disableEncryption,
                defaultSpaceId: convertedDefaultSpaceId,
                defaultSpaceName,
                defaultSpaceAvatarSrc,
            }}
        >
            {props.children}
        </ZionContext.Provider>
    )
}
