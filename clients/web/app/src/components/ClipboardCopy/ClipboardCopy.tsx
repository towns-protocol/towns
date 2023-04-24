import React, { forwardRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useEvent } from 'react-use-event-hook'
import { Box, Icon, Stack, Text, TooltipRenderer } from '@ui'
import useCopyToClipboard from 'hooks/useCopyToClipboard'

type Props = {
    label: string
    clipboardContent?: string
}

export const ClipboardCopy = forwardRef<HTMLDivElement, Props>((props, ref) => {
    const [copied, setCopied] = useState(false)
    const [, copy] = useCopyToClipboard()

    useEffect(() => {
        if (copied) {
            const timeout = setTimeout(() => {
                setCopied(false)
            }, 1000)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [copied])

    const onCopy = useEvent((e: React.MouseEvent) => {
        const asyncCopy = async () => {
            const copied = await copy(props.clipboardContent ?? props.label)
            setCopied(copied)
        }
        asyncCopy()
    })

    return (
        <TooltipRenderer
            keepOpenOnTriggerRefClick
            trigger="hover"
            distance="sm"
            placement="vertical-top"
            render={<CopyTooltip copied={copied} />}
        >
            {({ triggerProps }) => {
                return (
                    <Box {...triggerProps}>
                        <Stack
                            {...triggerProps}
                            horizontal
                            gap="sm"
                            alignItems="center"
                            cursor={!copied ? 'pointer' : 'default'}
                            ref={ref}
                            onClick={onCopy}
                        >
                            <Text truncate size="md" color="gray2">
                                {props.label}
                            </Text>
                            {!copied ? (
                                <Icon type="copy" color="gray2" size="square_xs" insetTop="xxs" />
                            ) : (
                                <Icon
                                    type="check"
                                    color="positive"
                                    size="square_xs"
                                    insetTop="xxs"
                                />
                            )}
                        </Stack>
                    </Box>
                )
            }}
        </TooltipRenderer>
    )
})

type CopiedProps = {
    copied: boolean
}

const CopyTooltip = (props: CopiedProps) => {
    return (
        <MotionBox
            layout
            border
            gap
            padding="md"
            background="level2"
            rounded="sm"
            boxShadow="avatar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
                duration: 0.1,
                opacity: { delay: 0.2 },
            }}
        >
            <MotionBox layout="position">
                <Box horizontal centerContent gap="md">
                    <Text>{props.copied ? 'Copied' : 'Copy'}</Text>
                </Box>
            </MotionBox>
        </MotionBox>
    )
}

const MotionBox = motion(Box)
