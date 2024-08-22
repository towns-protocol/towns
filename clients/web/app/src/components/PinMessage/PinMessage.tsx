import React, { useCallback } from 'react'
import { TimelinePin, ZTEvent, toMessageInfo, useMyUserId, useUserLookup } from 'use-towns-client'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { Box, Icon, Paragraph } from '@ui'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { MessageContentSummary } from '@components/DirectMessages/DirectMessageListItem'

export const PinnedMessage = (props: { channelId: string; pin: TimelinePin }) => {
    const { channelId, pin } = props
    const user = useUserLookup(pin.creatorUserId)
    const myUserId = useMyUserId()

    const userName = myUserId === pin.creatorUserId ? 'you' : getPrettyDisplayName(user)

    const { openPanel } = usePanelActions()
    const onClick = useCallback(() => {
        openPanel('pins', { channelId })
    }, [channelId, openPanel])

    return (
        <Box
            padding
            gap
            horizontal
            hoverable
            background="level3"
            cursor="pointer"
            onClick={onClick}
        >
            <Box grow gap="sm" overflow="hidden" paddingY="xs" insetY="xxs">
                <Box horizontal gap="xs" color="cta1" alignItems="center">
                    <Icon type="pinFill" size="square_xxs" />
                    <Paragraph>Pinned by {userName}</Paragraph>
                </Box>
                <Box grow>
                    <Paragraph truncate>
                        <PinContent pin={pin} />
                    </Paragraph>
                </Box>
            </Box>
        </Box>
    )
}

const PinContent = (props: { pin: TimelinePin }) => {
    const event = props.pin.timelineEvent

    if (event.content?.kind === ZTEvent.RoomMessage) {
        const info = toMessageInfo(event)
        return info ? <MessageContentSummary info={info} /> : null
    }

    return <></>
}
