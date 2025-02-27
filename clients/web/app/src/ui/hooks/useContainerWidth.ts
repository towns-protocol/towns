import { useCallback, useState } from 'react'

export const useContainerWidth = () => {
    const [width, setWidth] = useState(0)

    const measuredRef = useCallback((node: HTMLDivElement | null) => {
        if (node !== null) {
            setWidth(node.getBoundingClientRect().width)

            const resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    setWidth(entry.contentRect.width)
                }
            })

            resizeObserver.observe(node)

            return () => resizeObserver.disconnect()
        }
    }, [])

    return { ref: measuredRef, width }
}
