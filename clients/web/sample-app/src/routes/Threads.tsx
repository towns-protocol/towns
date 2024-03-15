import { Divider, List, ListItem } from '@mui/material'
import React, { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ThreadResult, useSpaceId, useSpaceThreadRoots } from 'use-towns-client'

export function Threads(): JSX.Element {
    const spaceId = useSpaceId()
    const threadRoots = useSpaceThreadRoots()
    const navigate = useNavigate()

    const onClickThread = useCallback(
        (threadRoot: ThreadResult) => {
            if (spaceId) {
                navigate(
                    `/spaces/${spaceId}/threads/${threadRoot.channel.id}/${threadRoot.thread.parentId}`,
                )
            }
        },
        [spaceId, navigate],
    )

    return (
        <List>
            {threadRoots.map((threadRoot) => (
                <>
                    <ListItem
                        button
                        key={threadRoot.thread.parentId}
                        onClick={() => onClickThread(threadRoot)}
                    >
                        {formatThreadRoot(threadRoot)}
                    </ListItem>
                    <Divider />
                </>
            ))}
        </List>
    )
}

function formatThreadRoot(threadRoot: ThreadResult): string {
    const isNew = threadRoot.isNew ? ' * ' : ''
    return (
        isNew +
        `#${threadRoot.channel.label} ${threadRoot.thread.parentMessageContent?.body ?? ''} (${
            threadRoot.thread.replyEventIds.size
        })`
    )
}
