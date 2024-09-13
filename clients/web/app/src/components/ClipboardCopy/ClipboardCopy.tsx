import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import { Box, Icon, Stack, Text, Tooltip } from '@ui'
import useCopyToClipboard from 'hooks/useCopyToClipboard'
import { TextProps } from 'ui/components/Text/Text'

type Props = {
    label?: string
    clipboardContent?: string
    color?: TextProps['color']
    fontSize?: TextProps['fontSize']
    children?: React.ReactNode
}

export const ClipboardCopy = forwardRef<HTMLDivElement, Props>((props, ref) => {
    const { fontSize = 'md' } = props
    const [copied, setCopied] = useState(false)
    const [, copy] = useCopyToClipboard()
    const color = props.color ?? 'gray2'

    const closeHandleRef = useRef<undefined | (() => void)>()

    useEffect(() => {
        if (copied) {
            const timeout = setTimeout(() => {
                setCopied(false)
                closeHandleRef.current?.()
            }, 1000)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [copied])

    const onCopy = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation()
            e.preventDefault()
            const asyncCopy = async () => {
                const copied = await copy(props.clipboardContent ?? props.label ?? '')
                setCopied(copied)
            }
            asyncCopy()
        },
        [copy, props.clipboardContent, props.label],
    )

    const iconRef = useRef<HTMLDivElement>(null)

    return (
        <Box
            tooltip={<Tooltip>{!copied ? 'Copy' : 'Copied!'}</Tooltip>}
            tooltipOptions={{
                closeHandleRef,
                alignRef: iconRef,
                immediate: true,
            }}
        >
            <Stack
                horizontal
                gap="sm"
                alignItems="end"
                cursor={!copied ? 'pointer' : 'default'}
                ref={ref}
                onClick={onCopy}
            >
                <Text truncate size={fontSize} color={color}>
                    {props.children || props.label}
                </Text>
                <Box centerContent ref={iconRef} pointerEvents="none" height="paragraph">
                    {!copied ? (
                        <Icon type="copy" color={color} size="square_xs" />
                    ) : (
                        <Icon type="check" color="positive" size="square_xs" />
                    )}
                </Box>
            </Stack>
        </Box>
    )
})
