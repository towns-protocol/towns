import { RefObject, useCallback, useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'

export const useLazyLoad = (
    onLoadMore: () => void,
    containerRef: RefObject<HTMLDivElement>,
    timelineLength: number,
) => {
    const [currentWatermark, setCurrentWatermark] = useState(-1)

    const { ref: intersectionRef, inView } = useInView({
        root: containerRef.current,
        rootMargin: '100%',
        threshold: 0,
    })

    const triggerLoading = useCallback(() => {
        setCurrentWatermark(timelineLength)
        onLoadMore()
    }, [onLoadMore, timelineLength])

    const isLoading = currentWatermark === timelineLength

    useEffect(() => {
        if (inView && !isLoading) {
            triggerLoading()
        }
    }, [inView, isLoading, triggerLoading])

    return { intersectionRef }
}
