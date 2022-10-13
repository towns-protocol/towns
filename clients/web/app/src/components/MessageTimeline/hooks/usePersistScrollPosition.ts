import { RefObject, useEffect, useRef } from 'react'
import useEvent from 'react-use-event-hook'

export const usePersistScrollPosition = (
    containerRef: RefObject<HTMLElement>,
    contentRef: RefObject<HTMLElement>,
) => {
    const sizeRef = useRef(contentRef.current?.clientHeight ?? 0)

    const handleContainerResize = useEvent((e: ResizeObserverEntry[]) => {
        const el = e[0]

        if (!el) return

        const height = el.contentRect.height
        const diff = sizeRef.current - height
        const containerY = containerRef.current?.scrollTop ?? 0

        containerRef.current?.scrollTo({
            behavior: 'auto',
            top: containerY - diff,
        })

        sizeRef.current = height
    })

    useEffect(() => {
        const container = contentRef.current
        if (container) {
            const observer = new ResizeObserver(handleContainerResize)
            observer.observe(container)
        }
    }, [contentRef, handleContainerResize])
}
