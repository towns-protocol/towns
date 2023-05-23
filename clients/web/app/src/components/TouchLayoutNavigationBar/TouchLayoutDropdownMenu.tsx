import React, { useState } from 'react'
import { useSpaceData } from 'use-zion-client'
import { useEvent } from 'react-use-event-hook'

import { ActionNavItem } from '@components/NavItem/ActionNavItem'
import { Badge, Box, Stack } from '@ui'
import { SyncedChannelList } from '@components/SideBars/SpaceSideBar/SyncedChannelList'
import { PATHS } from 'routes'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { AllChannelsList } from 'routes/AllChannelsList/AllChannelsList'

type Props = {
    unreadThreadsCount: number
    unreadThreadMentions: number
}

export const TouchLayoutDropdownMenu = (props: Props) => {
    const space = useSpaceData()
    const { unreadThreadMentions, unreadThreadsCount } = props
    const [visibleModal, setVisibleModal] = useState<'browse' | undefined>(undefined)
    const onShowBrowseChannels = useEvent(() => setVisibleModal('browse'))
    const onHideBrowseChannels = useEvent(() => setVisibleModal(undefined))

    return (
        <Stack scroll paddingTop="lg">
            {space && (
                <Box minHeight="100svh">
                    <ActionNavItem
                        highlight={unreadThreadsCount > 0}
                        icon="threads"
                        link={`/${PATHS.SPACES}/${space.id.slug}/threads`}
                        id="threads"
                        label="Threads"
                        badge={unreadThreadMentions > 0 && <Badge value={unreadThreadMentions} />}
                    />
                    <ActionNavItem
                        icon="at"
                        id="mentions"
                        label="Mentions"
                        link={`/${PATHS.SPACES}/${space.id.slug}/mentions`}
                    />

                    <SyncedChannelList
                        canCreateChannel={false}
                        space={space}
                        mentions={[]}
                        onShowCreateChannel={() => {
                            /* noop */
                        }}
                    />

                    {space && !space.isLoadingChannels && (
                        <ActionNavItem
                            icon="search"
                            id="browseChannels"
                            label="Browse channels"
                            onClick={onShowBrowseChannels}
                        />
                    )}
                </Box>
            )}

            {visibleModal === 'browse' && (
                <ModalContainer touchTitle="Browse channels" onHide={onHideBrowseChannels}>
                    <AllChannelsList onHideBrowseChannels={onHideBrowseChannels} />
                </ModalContainer>
            )}
        </Stack>
    )
}
