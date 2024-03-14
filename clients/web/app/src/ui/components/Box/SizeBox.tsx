import useResizeObserver from '@react-hook/resize-observer'
import React, {
    RefObject,
    forwardRef,
    useCallback,
    useImperativeHandle,
    useLayoutEffect,
    useRef,
    useState,
} from 'react'
import { Size, SizeContext } from 'ui/hooks/useSizeContext'
import { Box, BoxProps } from './Box'

/**
 * Box providing size context
 */
export const SizeBox = forwardRef<HTMLDivElement, BoxProps>((props, ref) => {
    const innerRef = useRef<HTMLDivElement>(null)
    useImperativeHandle(ref, () => innerRef.current!)
    const size = useSize(innerRef)
    return (
        <SizeContext.Provider value={{ size }}>
            <Box {...props} ref={innerRef} />
        </SizeContext.Provider>
    )
})

const useSize = (target: RefObject<HTMLDivElement>) => {
    const [size, setSize] = useState<Size>({
        width: undefined,
        height: undefined,
    })

    const applySize = useCallback((el: HTMLDivElement | null) => {
        if (el) {
            const bounds = el.getBoundingClientRect()

            // not necessary, but can become handy - the current use case is to
            // grab height for a fixed container
            el.style.setProperty('--sizebox-width', `${bounds.width}px`)
            el.style.setProperty('--sizebox-height', `${bounds.height}px`)

            setSize({ width: bounds.width, height: bounds.height })
        }
    }, [])

    useLayoutEffect(() => {
        applySize(target.current)
    }, [applySize, target])

    useResizeObserver(target, (entry) => {
        applySize(entry.target as HTMLDivElement)
    })

    return size
}
