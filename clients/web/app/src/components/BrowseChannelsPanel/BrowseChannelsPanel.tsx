import React, { useCallback, useMemo } from 'react'
import { useEvent } from 'react-use-event-hook'
import { useSearchParams } from 'react-router-dom'
import { ChannelContextProvider, useSpaceData } from 'use-towns-client'
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
    const { unseenChannelIds, markChannelsAsSeen } = useUnseenChannelIds()

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
                                    showDot={unseenChannelIds.has(channel.id)}
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
