import { createContext, useContext, useMemo } from 'react'

export type Size = { width?: number; height?: number }

export const SizeContext = createContext<{
    size: Size
}>({
    size: { width: undefined, height: undefined },
})

export const useSizeContext = () => {
    const { width } = useContext(SizeContext).size

    const isNumber = typeof width === 'number'

    const w = isNumber && Math.floor(width)

    return useMemo(() => {
        return {
            lessThan: (value: number) => isNumber && w < value,
        }
    }, [isNumber, w])
}
