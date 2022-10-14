import React, { createContext, useContext, useMemo } from 'react'
import { makeRoomIdentifierFromSlug, RoomIdentifier } from '../types/matrix-types'
import { useSpaceId } from '../hooks/use-space-id'
import { useTimeline } from '../hooks/use-timeline'
import { TimelineEvent } from 'types/timeline-types'

export interface IChannelContext {
    channelId: RoomIdentifier
    spaceId: RoomIdentifier
    channelTimeline: TimelineEvent[]
}

export const ChannelContext = createContext<IChannelContext | undefined>(undefined)

/**
 * use instead of React.useContext, throws if not in a Provider
 */
export function useChannelContext(): IChannelContext {
    const context = useContext(ChannelContext)
    if (!context) {
        throw new Error('useChannelContext must be used in a ChannelContextProvider')
    }
    return context
}

interface Props {
    channelId: RoomIdentifier | string
    children: JSX.Element
}

export function ChannelContextProvider(props: Props): JSX.Element {
    console.log('~~~~~ Channel Context ~~~~~~', props.channelId)
    const spaceId = useSpaceId()
    if (!spaceId) {
        throw new Error('ChannelContextProvider: no spaceId')
    }
    // convert the room identifier
    const channelId: RoomIdentifier = useMemo(() => {
        if (typeof props.channelId === 'string') {
            return makeRoomIdentifierFromSlug(props.channelId)
        }
        return props.channelId
    }, [props.channelId])

    const channelTimeline = useTimeline(channelId)

    const channelContext: IChannelContext = useMemo(
        () => ({
            channelId: channelId,
            spaceId: spaceId,
            channelTimeline: channelTimeline,
        }),
        [channelId, spaceId, channelTimeline],
    )
    return (
        <ChannelContext.Provider value={channelContext}>{props.children}</ChannelContext.Provider>
    )
}
