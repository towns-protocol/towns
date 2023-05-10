import useResizeObserver from '@react-hook/resize-observer'
import { RefObject, useLayoutEffect, useState } from 'react'

export const useSize = (target: RefObject<HTMLElement>) => {
    const [size, setSize] = useState<DOMRect | undefined>()
    useLayoutEffect(() => {
        const entry = target.current
        if (entry) {
            setSize(() => entry.getBoundingClientRect())
        }
    }, [target])

    useResizeObserver(target, () => {
        setSize(() => target.current?.getBoundingClientRect())
    })

    return size
}
