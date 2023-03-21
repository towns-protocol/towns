import useResizeObserver from '@react-hook/resize-observer'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * keeps viewport updated
 */
export const useViewport = (scrollContainer: HTMLElement | null, _hasScrolledIntoView: boolean) => {
    const [viewport, setViewport] = useState<[number, number]>([10 ** 6, 10 ** 6])

    const [isScrolling, setIsScrolling] = useState(false)
    const isScrollingRef = useRef(isScrolling)
    isScrollingRef.current = isScrolling

    const onScroll = useCallback(() => {
        if (!scrollContainer) {
            return
        }
        if (!isScrollingRef.current) {
            // seems like the only way to prevent value not getting set 100%
            // from timeout
            setIsScrolling(true)
        }
        const top = scrollContainer.scrollTop
        const bottom = top + scrollContainer.getBoundingClientRect().height
        setViewport([top, bottom])
    }, [scrollContainer])

    useEffect(() => {
        if (!scrollContainer) {
            return
        }
        scrollContainer.addEventListener('scroll', onScroll, { passive: true })
        onScroll()
        return () => {
            scrollContainer.removeEventListener('scroll', onScroll)
        }
    }, [onScroll, scrollContainer])

    const onResize = useCallback(
        (e: ResizeObserverEntry) => {
            console.log(`VList - useViewport: onResize invoked`, e)
            onScroll()
        },
        [onScroll],
    )

    useResizeObserver(scrollContainer, onResize)

    useEffect(() => {
        // TODO: what we are actually looking for is scoll initiated by user so
        // mousewheel and touch would be more appropriate
        if (isScrolling) {
            const timeout = setTimeout(() => {
                setIsScrolling(false)
            }, 250)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [isScrolling])

    return { viewport, isScrolling }
}
