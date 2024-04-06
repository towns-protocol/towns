import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Divider, List, ListItem } from '@mui/material'
import { useTownsContext } from 'use-towns-client'

export function StreamsRoute(): JSX.Element {
    const navigate = useNavigate()
    const { casablancaClient } = useTownsContext()
    const [streams, setStreams] = useState<string[]>([])

    const onClickTimeline = useCallback(
        (streamId: string) => {
            navigate(`/streams/${streamId}/`)
        },
        [navigate],
    )

    useEffect(() => {
        if (!casablancaClient) {
            return
        }
        const streams = casablancaClient.streams.getStreamIds()
        setStreams(streams)
    }, [casablancaClient])

    return (
        <>
            <List>
                {streams.map((stream) => (
                    <>
                        <ListItem button key={stream} onClick={() => onClickTimeline(stream)}>
                            {stream}
                        </ListItem>
                        <Divider key={stream + '_div'} />
                    </>
                ))}
            </List>
        </>
    )
}
