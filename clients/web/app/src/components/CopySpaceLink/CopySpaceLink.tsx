import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Box, BoxProps, Icon, Paragraph, Tooltip } from '@ui'
import useCopyToClipboard from 'hooks/useCopyToClipboard'
import { getAbsoluteChannelUrl, getInviteUrl } from 'ui/utils/utils'
import { TooltipBoxVariants } from './CopySpaceLink.css'

export const CopySpaceLink = (
    props: {
        spaceId: string
        channelId?: string
        color?: BoxProps['color']
        background?: BoxProps['background']
    } & TooltipBoxVariants,
) => {
    const { spaceId, channelId, color } = props
    const [, copy] = useCopyToClipboard()

    const inviteUrl = channelId
        ? getAbsoluteChannelUrl({ spaceId, channelId })
        : getInviteUrl({ spaceId })

    const [copyDisplay, setCopyDisplay] = useState(false)

    const onCopyClick = useCallback(() => {
        copy(inviteUrl)
        setCopyDisplay(true)
    }, [copy, inviteUrl])

    useEffect(() => {
        if (copyDisplay) {
            setTimeout(() => {
                setCopyDisplay(false)
                closeHandleRef.current?.()
            }, 1000)
        }
    }, [copyDisplay])

    const closeHandleRef = useRef<undefined | (() => void)>()

    const streamText = channelId ? 'channel' : 'town'
    const copyText = !copyDisplay ? `Copy ${streamText} link` : 'Copied!'

    return (
        <Box horizontal>
            <Box
                hoverable
                cursor="pointer"
                tooltip={
                    <Tooltip horizontal alignItems="center" gap="sm">
                        <Paragraph size="sm">{copyText}</Paragraph>
                        {copyDisplay && (
                            <Icon
                                type="check"
                                size="square_xs"
                                color="positive"
                                padding="none"
                                inset="xxs"
                            />
                        )}
                    </Tooltip>
                }
                tooltipOptions={{
                    closeHandleRef,
                    immediate: true,
                }}
                padding="xs"
                rounded="sm"
                color={color}
                onClick={onCopyClick}
            >
                <Icon type="link" size="square_sm" />
            </Box>
        </Box>
    )
}
