import { useEffect, useState } from 'react'

const SAFE_FROM_SCROLLING_MS = 100

export const useIsScrolling = (container?: HTMLElement | null) => {
    const [isScrolling, setIsScrolling] = useState(false)

    useEffect(() => {
        let timeout: NodeJS.Timeout
        const onScroll = () => {
            setIsScrolling(true)
            if (timeout) {
                clearTimeout(timeout)
            }
            timeout = setTimeout(() => {
                setIsScrolling(false)
            }, SAFE_FROM_SCROLLING_MS)
        }

        container?.addEventListener('scroll', onScroll)
        return () => {
            container?.removeEventListener('scroll', onScroll)
            if (timeout) {
                clearTimeout(timeout)
            }
        }
    }, [container])

    return { isScrolling }
}
