import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import { Box, BoxProps, Icon, Stack, Text, Tooltip } from '@ui'
import useCopyToClipboard from 'hooks/useCopyToClipboard'
import { TextProps } from 'ui/components/Text/Text'

type Props = {
    label?: string
    clipboardContent?: string
    color?: TextProps['color']
    fontSize?: TextProps['fontSize']
    fontWeight?: TextProps['fontWeight']
    maxWidth?: TextProps['maxWidth']
    children?: React.ReactNode
    vertical?: boolean
    noTooltip?: boolean
    gap?: BoxProps['gap']
    onClick?: () => void
}

export function useCopied() {
    const [copied, setCopied] = useState(false)
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

    return [copied, setCopied, closeHandleRef] as const
}

export function CopyIcon({ copied, color }: { copied: boolean; color: TextProps['color'] }) {
    return !copied ? (
        <Icon type="copy" color={color} size="square_xs" />
    ) : (
        <Icon type="check" color="positive" size="square_xs" />
    )
}

export const ClipboardCopy = forwardRef<HTMLDivElement, Props>((props, ref) => {
    const {
        fontSize = 'md',
        gap = 'sm',
        maxWidth = undefined,
        fontWeight = undefined,
        vertical = false,
        noTooltip = false,
    } = props
    const [, copy] = useCopyToClipboard()
    const color = props.color ?? 'gray2'

    const [copied, setCopied, closeHandleRef] = useCopied()

    const onCopy = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation()
            e.preventDefault()
            const asyncCopy = async () => {
                const _copied = await copy(props.clipboardContent ?? props.label ?? '')
                setCopied(_copied)
                props.onClick?.()
            }
            asyncCopy()
        },
        [copy, props, setCopied],
    )

    const iconRef = useRef<HTMLDivElement>(null)

    return (
        <Box
            tooltip={!noTooltip && <Tooltip>{!copied ? 'Copy' : 'Copied!'}</Tooltip>}
            tooltipOptions={{
                closeHandleRef,
                alignRef: iconRef,
                immediate: true,
            }}
        >
            <Stack
                maxWidth={maxWidth}
                direction={vertical ? 'columnReverse' : 'row'}
                gap={gap}
                alignItems={vertical ? 'center' : 'end'}
                cursor={!copied ? 'pointer' : 'default'}
                ref={ref}
                onClick={onCopy}
            >
                <Text truncate size={fontSize} color={color} fontWeight={fontWeight}>
                    {props.children || props.label}
                </Text>
                <Box centerContent ref={iconRef} pointerEvents="none" height="paragraph">
                    <CopyIcon copied={copied} color={color} />
                </Box>
            </Stack>
        </Box>
    )
})
