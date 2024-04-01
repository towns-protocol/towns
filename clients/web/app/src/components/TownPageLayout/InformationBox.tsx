import React, { useState } from 'react'
import { useEvent } from 'react-use-event-hook'
import { Box, BoxProps, MotionStack, Text } from '@ui'

export type Props = {
    title: string
    centerContent: React.ReactNode
    subtitle: string
    border?: BoxProps['border']
    onClick?: () => void
}

export const InformationBox = (props: Props) => {
    const [isHovered, setIsHovered] = useState(false)
    const onPointerEnter = useEvent(() => {
        setIsHovered(true)
    })
    const onPointerLeave = useEvent(() => {
        setIsHovered(false)
    })
    return (
        <MotionStack
            centerContent
            rounded="md"
            height="x12"
            width="x12"
            shrink={false}
            background={isHovered ? 'hover' : 'lightHover'}
            cursor={props.onClick ? 'pointer' : undefined}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            layout="position"
            border={props.border}
            onPointerEnter={onPointerEnter}
            onPointerLeave={onPointerLeave}
            onClick={props.onClick}
        >
            <Box centerContent height="x4">
                <Text size="sm" color="gray2">
                    {props.title}
                </Text>
            </Box>
            <Box centerContent height="x3" width="100%">
                {props.centerContent}
            </Box>
            <Box centerContent height="x4">
                <Text size="sm" color="gray2">
                    {props.subtitle}
                </Text>
            </Box>
        </MotionStack>
    )
}
