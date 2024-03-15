import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { useEvent } from 'react-use-event-hook'
import { useSearchParams } from 'react-router-dom'
import {
    ChannelContextProvider,
    Membership,
    useMyMemberships,
    useSpaceData,
} from 'use-towns-client'
import fuzzysort from 'fuzzysort'
import { Box, IconButton, Stack, Text, TextField } from '@ui'
import { Panel } from '@components/Panel/Panel'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { ChannelItem } from 'routes/AllChannelsList/AllChannelsList'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { useUnseenChannelIds } from 'hooks/useUnseenChannelIdsCount'

export const BrowseChannelsPanel = () => {
    const space = useSpaceData()
    const channels = useSpaceChannels()
    const [searchParams, setSearchParams] = useSearchParams()
    const [searchText, setSearchText] = React.useState('')

    const { unseenChannelIds: _unseenChannelIds, markChannelsAsSeen } = useUnseenChannelIds()
    // Store a ref to unseen channel ids, while simultaneously marking them as seen
    // to suppress any unseen indicators in other parts of the app
    const unseenChannelIds = useRef<Set<string> | undefined>(undefined)
    useEffect(() => {
        if (!unseenChannelIds.current && _unseenChannelIds.size > 0) {
            unseenChannelIds.current = _unseenChannelIds
            markChannelsAsSeen()
        }
    }, [_unseenChannelIds, markChannelsAsSeen])

    const myMemberships = useMyMemberships()

    const onTextFieldChanged = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            setSearchText(event.target.value)
        },
        [setSearchText],
    )

    const onCloseClick = useEvent(() => {
        markChannelsAsSeen()
        searchParams.delete('browse-channels')
        setSearchParams(searchParams)
    })

    const filteredChannels = useMemo(() => {
        return fuzzysort
            .go(searchText, channels, { keys: ['label', 'search'], all: true })
            .map((m) => m.obj)
    }, [channels, searchText])

    return (
        <Panel
            gap
            label="Channels"
            leftBarButton={<IconButton icon="arrowLeft" onClick={onCloseClick} />}
            onClose={onCloseClick}
        >
            <Box position="sticky" top="none">
                <TextField
                    background="level2"
                    placeholder="Search channels"
                    onChange={onTextFieldChanged}
                />
            </Box>
            {space && !space?.isLoadingChannels && channels.length > 0 ? (
                <Stack scroll scrollbars gap>
                    {filteredChannels.map((channel) => (
                        <ChannelContextProvider key={channel.id} channelId={channel.id}>
                            <Stack>
                                <ChannelItem
                                    space={space}
                                    name={channel.label}
                                    topic={channel.topic}
                                    channelNetworkId={channel.id}
                                    isJoined={myMemberships[channel.id] === Membership.Join}
                                    showDot={unseenChannelIds.current?.has(channel.id)}
                                />
                            </Stack>
                        </ChannelContextProvider>
                    ))}
                </Stack>
            ) : (
                <Stack centerContent padding gap="md">
                    <Text>Loading channels</Text>
                    <ButtonSpinner />
                </Stack>
            )}
        </Panel>
    )
}
