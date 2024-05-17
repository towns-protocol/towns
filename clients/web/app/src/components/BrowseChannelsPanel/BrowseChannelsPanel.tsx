import React, { useCallback, useEffect, useMemo } from 'react'
import { useEvent } from 'react-use-event-hook'
import {
    Channel,
    ChannelContextProvider,
    Membership,
    useMyMemberships,
    useSpaceData,
} from 'use-towns-client'
import fuzzysort from 'fuzzysort'
import { Box, Stack, Text, TextField } from '@ui'
import { Panel } from '@components/Panel/Panel'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { ChannelItem } from 'routes/AllChannelsList/AllChannelsList'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { useUnseenChannelIds } from 'hooks/useUnseenChannelIdsCount'

export const BrowseChannelsPanel = ({ onClose }: { onClose?: () => void }) => {
    const space = useSpaceData()
    const channels = useSpaceChannels()
    const [searchText, setSearchText] = React.useState('')

    const { unseenChannelIds, markChannelsAsSeen } = useUnseenChannelIds()

    useEffect(() => {
        return () => {
            markChannelsAsSeen()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const myMemberships = useMyMemberships()

    const onTextFieldChanged = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            setSearchText(event.target.value)
        },
        [setSearchText],
    )

    const onClosed = useEvent(() => {
        markChannelsAsSeen()
    })

    type ChannelWithUnseenStatus = Channel & { unseen: boolean }

    const filteredChannels: ChannelWithUnseenStatus[] = useMemo(() => {
        return fuzzysort
            .go(searchText, channels, { keys: ['label', 'search'], all: true })
            .map((m) => {
                return { ...m.obj, unseen: unseenChannelIds?.has(m.obj.id) }
            })
            .sort((a, b) => {
                if (a.unseen && !b.unseen) {
                    return -1
                }
                if (!a.unseen && b.unseen) {
                    return 1
                }
                return a.label.localeCompare(b.label)
            })
    }, [channels, searchText, unseenChannelIds])

    const onOpenChannel = useCallback(
        (channelId: string) => {
            // Close overlay
            onClose?.()
        },
        [onClose],
    )

    return (
        <Panel gap label="Channels" onClosed={onClosed}>
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
                                    showDot={channel.unseen}
                                    onOpenChannel={onOpenChannel}
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
