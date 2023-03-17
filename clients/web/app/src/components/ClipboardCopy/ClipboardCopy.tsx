import React, { useEffect, useState } from 'react'
import { useEvent } from 'react-use-event-hook'
import { Icon, Stack, Text } from '@ui'

export const ClipboardCopy = (props: { label: string; clipboardContent?: string }) => {
    const [copied, setCopied] = useState(false)
    const onCopy = useEvent(() => {
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
}
