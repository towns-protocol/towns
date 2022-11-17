import useResizeObserver from '@react-hook/resize-observer'
import { useCallback, useEffect, useState } from 'react'

/**
 * keeps viewport updated
 */
export const useViewport = (scrollContainer: HTMLElement | null, _hasScrolledIntoView: boolean) => {
    const [viewport, setViewport] = useState<[number, number]>([10 ** 6, 10 ** 6])

    const onScroll = useCallback(() => {
        if (scrollContainer) {
            const top = scrollContainer.scrollTop
            const bottom = top + scrollContainer.getBoundingClientRect().height
            setViewport([top, bottom])
        }
    }, [scrollContainer])

    useEffect(() => {
        if (scrollContainer) {
            onScroll()
            scrollContainer.addEventListener('scroll', onScroll, { passive: true })
            return () => {
                scrollContainer.removeEventListener('scroll', onScroll)
            }
        }
    }, [onScroll, scrollContainer])

    useResizeObserver(scrollContainer, (entry) => onScroll())

    const [isScrolling, setIsScrolling] = useState(false)

    useEffect(() => {
        viewport
        setIsScrolling(true)
        const timeout = setTimeout(() => {
            setIsScrolling(false)
        }, 250)
        return () => {
            clearTimeout(timeout)
        }
    }, [viewport])

    return { viewport, isScrolling }
}
