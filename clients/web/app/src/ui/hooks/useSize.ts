import useResizeObserver from '@react-hook/resize-observer'
import { RefObject, useLayoutEffect, useState } from 'react'

export const useSize = (target: RefObject<HTMLElement>) => {
    const [size, setSize] = useState<{ width: number; height: number } | undefined>()
    useLayoutEffect(() => {
        const entry = target.current
        if (entry) {
            const bounds = entry.getBoundingClientRect()
            setSize(() => ({
                width: round(bounds.width),
                height: round(bounds.height),
            }))
        }
    }, [target])

    useResizeObserver(target, (entry) => {
        setSize(() => ({
            width: round(entry.contentRect.width),
            height: round(entry.contentRect.height),
        }))
    })

    return size
}

// contentRect + bounds return slightly different values after 2 decimal places
// we don't need more than 0.1 precision for div heights / alignments
const round = (n: number) => parseFloat(n.toFixed(1))
