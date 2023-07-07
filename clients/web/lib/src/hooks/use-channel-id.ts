import { RoomIdentifier } from '../types/room-identifier'
import { useChannelContext, ChannelContext } from '../components/ChannelContextProvider'
import { useContext } from 'react'

export function useChannelId(): RoomIdentifier {
    const { channelId } = useChannelContext()
    return channelId
}

export function useOptionalChannelId(): RoomIdentifier | undefined {
    return useContext(ChannelContext)?.channelId
}
