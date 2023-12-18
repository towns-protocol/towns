import { Divider, List, ListItem } from '@mui/material'
import { MentionResult, ZTEvent, useSpaceId, useSpaceMentions } from 'use-zion-client'
import React, { useCallback } from 'react'

import { useNavigate } from 'react-router-dom'

export function Mentions(): JSX.Element {
    const spaceId = useSpaceId()
    const mentions = useSpaceMentions()
    const navigate = useNavigate()

    const onClickMentions = useCallback(
        (mention: MentionResult) => {
            if (spaceId) {
                if (mention.thread !== undefined) {
                    navigate(
                        `/spaces/${spaceId.streamId}/threads/${mention.channel.id.streamId}/${mention.thread?.eventId}`,
                    )
                } else {
                    navigate(`/spaces/${spaceId.streamId}/channels/${mention.channel.id.streamId}/`)
                }
            }
        },
        [spaceId, navigate],
    )

    return (
        <List>
            {mentions.map((mention) => (
                <>
                    <ListItem
                        button
                        key={mention.event?.eventId}
                        onClick={() => onClickMentions(mention)}
                    >
                        {formatMention(mention)}
                    </ListItem>
                    <Divider />
                </>
            ))}
        </List>
    )
}

function formatMention(mention: MentionResult): string {
    switch (mention.event.content?.kind) {
        case ZTEvent.RoomMessage:
            return `${mention.event.sender.displayName}: ${mention.event.content?.body}`
        default:
            return mention.event.fallbackContent
    }
}
