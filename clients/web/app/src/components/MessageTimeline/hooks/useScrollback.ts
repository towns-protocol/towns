import { useCallback, useRef, useState } from 'react'
import { useTownsClient } from 'use-towns-client'

export type ScrollbackState = Awaited<ReturnType<ReturnType<typeof useTownsClient>['scrollback']>>

export const useScrollback = (channelId: string) => {
    const [scrollbackState, setScrollbackState] = useState<ScrollbackState>()
    const { scrollback } = useTownsClient()

    const onLoadMore = useCallback(() => {
        scrollback(channelId).then((e) => {
            setScrollbackState(e)
        })
    }, [channelId, scrollback])

    const watermarkRef = useRef<bigint | undefined>(undefined)

    const onFirstMessageReached = useCallback(
        (watermark: bigint) => {
            if (watermark === watermarkRef.current) {
                return
            }
            console.log(`[useScrollback] onLoadMore ${channelId} ${watermark}`)
            watermarkRef.current = watermark
            setTimeout(onLoadMore, 0)
        },
        [channelId, onLoadMore],
    )

    return { onFirstMessageReached, scrollbackState }
}
