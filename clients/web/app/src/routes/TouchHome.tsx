import React, { useCallback, useState } from 'react'
import { useSpaceData, useSpaceMentions } from 'use-zion-client'
import { Box, Stack } from '@ui'
import { SyncedChannelList } from '@components/SideBars/SpaceSideBar/SyncedChannelList'
import { TouchLayoutHeader } from '@components/TouchLayoutHeader/TouchLayoutHeader'
import { ActionNavItem } from '@components/NavItem/ActionNavItem'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { CentralPanelLayout } from './layouts/CentralPanelLayout'
import { AllChannelsList } from './AllChannelsList/AllChannelsList'

export const TouchHome = () => {
    const space = useSpaceData()
    const mentions = useSpaceMentions()

    const [visibleModal, setVisibleModal] = useState<'browse' | undefined>(undefined)
    const onShowBrowseChannels = useCallback(() => setVisibleModal('browse'), [setVisibleModal])
    const onHideBrowseChannels = useCallback(() => setVisibleModal(undefined), [setVisibleModal])

    return (
        <CentralPanelLayout>
            <Stack height="100%">
                <TouchLayoutHeader />
                <Box scroll grow>
                    <Box minHeight="forceScroll">
                        {space && (
                            <>
                                <SyncedChannelList
                                    space={space}
                                    mentions={mentions}
                                    canCreateChannel={false}
                                />

                                {!space.isLoadingChannels && (
                                    <ActionNavItem
                                        icon="search"
                                        id="browseChannels"
                                        label="Browse channels"
                                        onClick={onShowBrowseChannels}
                                    />
                                )}
                            </>
                        )}
                    </Box>
                </Box>
                {visibleModal === 'browse' && (
                    <ModalContainer touchTitle="Browse channels" onHide={onHideBrowseChannels}>
                        <AllChannelsList onHideBrowseChannels={onHideBrowseChannels} />
                    </ModalContainer>
                )}
            </Stack>
        </CentralPanelLayout>
    )
}
