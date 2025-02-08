import { Divider, List, ListItem } from '@mui/material'
import { useSpaceId, useSpaceMentions } from 'use-towns-client'
import React, { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MentionResult, RiverTimelineEvent } from '@river-build/sdk'

export function Mentions(): JSX.Element {
    const spaceId = useSpaceId()
    const mentions = useSpaceMentions(spaceId)
    const navigate = useNavigate()

    const onClickMentions = useCallback(
        (mention: MentionResult) => {
            if (spaceId) {
                if (mention.thread !== undefined) {
                    navigate(
                        `/spaces/${spaceId}/threads/${mention.channelId}/${mention.thread?.eventId}`,
                    )
                } else {
                    navigate(`/spaces/${spaceId}/channels/${mention.channelId}/`)
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
        case RiverTimelineEvent.ChannelMessage:
            return `${mention.event.sender.id}: ${mention.event.content?.body}`
        default:
            return mention.event.fallbackContent
    }
}
