import { useMutation } from '../query/queryClient'
import { useTownsClient } from './use-towns-client'

export function useSetChannelAutojoin({
    onSuccess,
    onError,
}: {
    onSuccess?: () => void
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError?: (error: any) => void
} = {}) {
    const { client } = useTownsClient()

    return useMutation({
        mutationFn: async (args: { spaceId: string; channelId: string; autojoin: boolean }) => {
            const { spaceId, channelId, autojoin } = args
            await client?.setChannelAutojoin(spaceId, channelId, autojoin)
        },
        onError: (error) => {
            onError?.(error)
        },
        onSuccess: () => {
            onSuccess?.()
        },
    })
}
