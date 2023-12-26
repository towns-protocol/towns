import { useChannelContext } from '../components/ChannelContextProvider'

export function useChannelId(): string {
    const { channelId } = useChannelContext()
    return channelId
}
