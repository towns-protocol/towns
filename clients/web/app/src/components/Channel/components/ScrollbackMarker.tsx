import React, { MutableRefObject, useEffect } from 'react'
import { useInView } from 'react-intersection-observer'
import { Box } from '@ui'

export const ScrollbackMarker = (props: {
    containerRef?: MutableRefObject<HTMLDivElement | null>
    watermark?: bigint
    onMarkerReached: (watermark: bigint) => void
}) => {
    const { watermark, onMarkerReached, containerRef } = props
    const { inView, ref } = useInView({
        threshold: 0,
        // the `rootMargin` can be excessive, what actually counts is the
        // `viewMargin` prop of VList which toggles the visibility of the marker
        rootMargin: '5000px',
        root: containerRef?.current,
    })
    useEffect(() => {
        if (inView && watermark) {
            onMarkerReached(watermark)
        }
    }, [inView, watermark, onMarkerReached])
    return <Box ref={ref} />
}
