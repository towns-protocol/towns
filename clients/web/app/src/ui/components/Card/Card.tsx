import React, { forwardRef } from 'react'
import { env } from 'utils/environment'
import { Box, BoxProps } from '../Box/Box'
import { IconButton } from '../IconButton/IconButton'
import { SizeBox } from '../Box/SizeBox'
import { Paragraph } from '../Text/Paragraph'

type Props = Omit<BoxProps, 'label'>

const DEBUG = false && env.MODE === 'development'

export const Card = forwardRef<HTMLDivElement, Props>(
    (
        { children, absoluteFill, absoluteFillSafeSafari, position, debug = DEBUG, ...boxProps },
        ref,
    ) => {
        return (
            <Box
                grow
                padding="xs"
                debug={debug}
                border={debug ? 'accent' : undefined}
                position={
                    position
                        ? position
                        : absoluteFill
                        ? 'absoluteFill'
                        : absoluteFillSafeSafari
                        ? 'absoluteFillSafeSafari'
                        : undefined
                }
            >
                <SizeBox
                    grow
                    elevateReadability
                    scroll={!!(absoluteFill || absoluteFillSafeSafari)}
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
    <CardHeader gap="sm">
        {props.leftBarButton}
        <Box grow paddingY="sm" width="none" /* truncate hack */>
            {typeof props.label === 'string' ? (
                <Paragraph truncate fontWeight="medium">
                    {props.label}
                </Paragraph>
            ) : (
                props.label
            )}
        </Box>
        <Box>
            {props.onClose && <IconButton icon="close" insetRight="xs" onClick={props.onClose} />}
        </Box>
        {props.rightBarButton && (
            <>
                <Box>{props.rightBarButton}</Box>
            </>
        )}
    </CardHeader>
)
