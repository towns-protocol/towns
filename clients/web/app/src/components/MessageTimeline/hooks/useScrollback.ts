import { useCallback, useRef } from 'react'
import { useTownsClient } from 'use-towns-client'

export const useScrollback = (channelId: string) => {
    const { scrollback } = useTownsClient()

    const onLoadMore = useCallback(() => {
        scrollback(channelId)
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

    return { onFirstMessageReached }
}
