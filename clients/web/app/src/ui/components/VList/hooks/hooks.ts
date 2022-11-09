import useResizeObserver from '@react-hook/resize-observer'
import { useCallback, useEffect, useState } from 'react'

const DEBUG_VLIST = true

/**
 * Keeps viewrport updated
 */
export const useViewport = (scrollContainer: HTMLElement | null, hasScrolledIntoView: boolean) => {
    const [viewport, setScrollFrame] = useState<[number, number]>([10 ** 8, 10 ** 8 - 1000])

    const onScroll = useCallback(() => {
        if (scrollContainer && hasScrolledIntoView) {
            const top = scrollContainer.scrollTop
            const bottom = top + scrollContainer.getBoundingClientRect().height
            setScrollFrame([top, bottom])
        }
    }, [hasScrolledIntoView, scrollContainer])

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
        }, 500)
        return () => {
            clearTimeout(timeout)
        }
    }, [viewport])

    return { viewport, isScrolling }
}

const SAFE_REDRAW_DELAY = 0

/**
 * Scrolls to bottom at first renderer
 */
export const useScrollIntoView = (scrollContainer: HTMLElement | null, listHeight: number) => {
    const [hasScrolledIntoView, setHasScrolledIntoView] = useState(false)
    useEffect(() => {
        if (hasScrolledIntoView || !scrollContainer || !listHeight) {
            return
        }
        const timeout = setTimeout(() => {
            DEBUG_VLIST && console.log(`%cuseScrollIntoView`, `color:red;`)
            setHasScrolledIntoView(true)
            scrollContainer.scrollTo(0, 10 ** 8)
        }, SAFE_REDRAW_DELAY)

        return () => {
            clearTimeout(timeout)
        }
    }, [hasScrolledIntoView, listHeight, scrollContainer])

    return { hasScrolledIntoView }
}
