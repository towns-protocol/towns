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

    const watermarkRef = useRef<string | undefined>(undefined)

    const onFirstMessageReached = useCallback(
        (watermark: string) => {
            console.log('onFirstMessageReached', watermark)
            if (watermark === watermarkRef.current) {
                return
            }
            console.log('onFirstMessageReached onLoadMore')
            watermarkRef.current = watermark
            setTimeout(onLoadMore, 0)
        },
        [onLoadMore],
    )

    return { onFirstMessageReached, scrollbackState }
}
