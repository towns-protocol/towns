import { useMutation } from '../query/queryClient'
import { useTownsClient } from './use-towns-client'

export function useSetHideUserJoinLeave({
    onSuccess,
    onError,
}: {
    onSuccess?: () => void
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError?: (error: any) => void
} = {}) {
    const { client } = useTownsClient()

    return useMutation({
        mutationFn: async (args: { spaceId: string; channelId: string; hideEvents: boolean }) => {
            const { spaceId, channelId, hideEvents } = args
            await client?.setChannelHideUserJoinLeaveEvents(spaceId, channelId, hideEvents)
        },
        onError: (error) => {
            onError?.(error)
        },
        onSuccess: () => {
            onSuccess?.()
        },
    })
}
