import React, { forwardRef, useEffect, useState } from 'react'
import { useEvent } from 'react-use-event-hook'
import { Icon, Stack, Text } from '@ui'

type Props = {
    label: string
    clipboardContent?: string
}

export const ClipboardCopy = forwardRef<HTMLDivElement, Props>((props, ref) => {
    const [copied, setCopied] = useState(false)
    const onCopy = useEvent((e) => {
        e.stopPropagation()
        navigator.clipboard.writeText(props.clipboardContent ?? props.label)
        setCopied(true)
    })
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
    return (
        <Stack
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
                <Icon type="check" color="positive" size="square_xs" insetTop="xxs" />
            )}
        </Stack>
    )
})
