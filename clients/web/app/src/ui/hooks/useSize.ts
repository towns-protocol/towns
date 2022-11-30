import useResizeObserver from '@react-hook/resize-observer'
import { RefObject, useLayoutEffect, useState } from 'react'

export const useSize = (target: RefObject<HTMLElement>) => {
    const [size, setSize] = useState<{ width: number; height: number } | undefined>()
    useLayoutEffect(() => {
        const entry = target.current
        if (entry) {
            setSize(() => {
                const bounds = entry.getBoundingClientRect()
                const width = bounds?.width
                const height = bounds?.height
                return {
                    width,
                    height,
                }
            })
        }
    }, [target])

    useResizeObserver(target, (entry) => {
        setSize((s) => {
            const { width, height } = entry.contentRect
            return {
                width: width,
                height: height,
            }
        })
    })
    return size
}
