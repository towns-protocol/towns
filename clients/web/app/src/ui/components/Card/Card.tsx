import React, { forwardRef } from 'react'
import { env } from 'utils/environment'
import { Box, BoxProps } from '../Box/Box'
import { IconButton } from '../IconButton/IconButton'
import { SizeBox } from '../Box/SizeBox'
import { Paragraph } from '../Text/Paragraph'

type Props = Omit<BoxProps, 'label'>

const DEBUG = false && env.MODE === 'development'

export const Card = forwardRef<HTMLDivElement, Props>(
    ({ children, absoluteFill, debug = DEBUG, ...boxProps }, ref) => {
        return (
            <Box
                grow
                padding="xs"
                debug={debug}
                border={debug ? 'accent' : undefined}
                absoluteFill={absoluteFill}
            >
                <SizeBox
                    grow
                    elevateReadability
                    scroll={!!absoluteFill}
                    position="relative"
                    rounded="sm"
                    boxShadow="card"
                    {...boxProps}
                    ref={ref}
                >
                    {children}
                </SizeBox>
            </Box>
        )
    },
)

export const CardHeader = (props: BoxProps) => (
    <Box
        horizontal
        paddingX
        elevate
        hoverable={!!props.onClick}
        roundedTop="sm"
        paddingY="sm"
        shrink={false}
        minHeight="x6"
        alignItems="center"
        justifySelf="start"
        background="level2"
        color="default"
        cursor={props.onClick ? 'pointer' : undefined}
        {...props}
    />
)

export const CardLabel = (props: {
    label?: React.ReactNode | string
    onClose?: () => void
    leftBarButton?: React.ReactNode
    rightBarButton?: React.ReactNode
}) => (
    <CardHeader>
        {props.leftBarButton && <Box paddingRight="sm">{props.leftBarButton}</Box>}
        <Box grow overflow="hidden" paddingY="sm" fontWeight="medium">
            {typeof props.label === 'string' ? (
                <Paragraph fontWeight="medium">{props.label}</Paragraph>
            ) : (
                props.label
            )}
        </Box>
        <Box>{props.onClose && <IconButton icon="close" onClick={props.onClose} />}</Box>
        {props.rightBarButton && (
            <>
                <Box grow />
                {props.rightBarButton}
            </>
        )}
    </CardHeader>
)
