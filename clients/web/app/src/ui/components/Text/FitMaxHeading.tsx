import React, { useEffect, useRef, useState } from 'react'
import { Heading } from './Heading'
import { Box } from '../Box/Box'

export const FitMaxHeading = (props: {
    children?: string
    width: number
    minHeight?: number
    maxHeight?: number
    align?: 'left' | 'center' | 'right'
}) => {
    const { minHeight = 32, maxHeight = 64, width } = props
    const ref = useRef<HTMLHeadingElement>(null)
    const [scale, setScale] = useState(1)

    useEffect(() => {
        const bounds = ref.current?.getBoundingClientRect()
        if (bounds) {
            let scale = (width / bounds.width) * 0.99
            scale = maxHeight ? Math.min(scale, maxHeight / bounds.height) : scale
            scale = minHeight ? Math.max(scale, minHeight / bounds.height) : scale
            setScale(scale)
        }
    }, [width, props.children, maxHeight, minHeight])
    return (
        <>
            <Heading>
                <Heading as="span" style={{ fontSize: `${scale * 100}%` }}>
                    {props.children}
                </Heading>
            </Heading>
            <Box position="absolute" color="gray2" style={{ opacity: 0, height: 0 }}>
                <Heading ref={ref} style={{ whiteSpace: 'nowrap', display: 'inline' }}>
                    {props.children}
                </Heading>
            </Box>
        </>
    )
}
