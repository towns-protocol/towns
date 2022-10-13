import useResizeObserver from '@react-hook/resize-observer'
import React, { RefObject, useLayoutEffect, useRef, useState } from 'react'
import { Box, BoxProps } from '@ui'
import { Size, SizeContext } from 'ui/hooks/useSizeContext'

/**
 * Box providing size context
 */
export const SizeBox = (props: BoxProps) => {
    const ref = useRef<HTMLDivElement>(null)
    const size = useSize(ref)
    return (
        <SizeContext.Provider value={{ size }}>
            <Box {...props} ref={ref} />
        </SizeContext.Provider>
    )
}

const useSize = (target: RefObject<HTMLDivElement>) => {
    const [size, setSize] = useState<Size>({
        width: undefined,
        height: undefined,
    })

    useLayoutEffect(() => {
        const el = target.current
        if (el) {
            const bounds = el.getBoundingClientRect()
            setSize({ width: bounds.width, height: bounds.height })
        }
    }, [target])

    useResizeObserver(target, (entry) => setSize(entry.contentRect))
    return size
}
