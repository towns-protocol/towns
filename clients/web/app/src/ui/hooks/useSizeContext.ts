import { createContext, useContext, useMemo } from 'react'

export type Size = { width?: number; height?: number }

export const SizeContext = createContext<{
    size: Size
}>({
    size: { width: undefined, height: undefined },
})

export const useSizeContext = () => {
    const { width, height } = useContext(SizeContext).size

    const isDefinedWidth = typeof width === 'number'
    const isDefinedHeight = typeof height === 'number'

    const containerWidth = (isDefinedWidth && Math.floor(width)) || 0
    const containerHeight = (isDefinedHeight && Math.floor(height)) || 0

    return useMemo(() => {
        return {
            lessThan: (value: number) => isDefinedWidth && containerWidth < value,
            aspectRatio: width && height ? width / height : 0,
            containerWidth,
            containerHeight,
        }
    }, [containerHeight, height, isDefinedWidth, containerWidth, width])
}
