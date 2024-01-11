import { AnimatePresence } from 'framer-motion'
import React, { useCallback, useMemo, useState } from 'react'
import { Outlet, useNavigate } from 'react-router'
import { useSearchParams } from 'react-router-dom'
import { DMChannelIdentifier, useZionClient, useZionContext } from 'use-zion-client'
import { Panel } from '@components/Panel/Panel'
import { FadeInBox } from '@components/Transitions'
import { Box, FancyButton, Stack, Text } from '@ui'
import { useCreateLink } from 'hooks/useCreateLink'
import { useDevice } from 'hooks/useDevice'
import { useErrorToast } from 'hooks/useErrorToast'
import { CentralPanelLayout } from 'routes/layouts/CentralPanelLayout'
import { DirectMessageInviteUserList } from './DirectMessageInviteUserList'

type Props = {
    onDirectMessageCreated?: () => void
}

export const CreateMessagePanel = () => {
    const { isTouch } = useDevice()
    const { createLink } = useCreateLink()
    const navigate = useNavigate()
    const [search] = useSearchParams()

    const onClose = useCallback(() => {
        if (search.get('ref')) {
            navigate(-1)
        } else {
            const link = createLink({ route: 'townHome' })
            if (link) {
                navigate(link)
            }
        }
    }, [createLink, navigate, search])

    const panel = (
        <>
            <Panel
                paddingX={isTouch ? undefined : 'lg'}
                label={
                    <Text strong color="default" size="lg">
                        New Message
                    </Text>
                }
                background="level1"
                onClose={onClose}
            >
                <Box grow paddingX={{ touch: 'none', default: 'sm' }}>
                    <CreateDirectMessage />
                </Box>
            </Panel>
            <Outlet />
        </>
    )

    // TODO: central panel layout includes animation on touch
    return isTouch ? panel : <CentralPanelLayout>{panel}</CentralPanelLayout>
}

export const CreateDirectMessage = (props: Props) => {
    const { onDirectMessageCreated } = props
    const { createDMChannel, createGDMChannel } = useZionClient()
    const { createLink } = useCreateLink()
    const navigate = useNavigate()
    const [isGroupDM, setIsGroupDM] = useState(false)

    const { dmChannels } = useZionContext()

    const [existingChannels, setExistingChannels] = useState<DMChannelIdentifier>()
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set<string>())

    const checkIfChannelExists = useCallback(
        (userIds: Set<string>) =>
            dmChannels.find(
                (dm) =>
                    !dm.isGroup &&
                    dm.userIds.length === userIds.size &&
                    dm.userIds.every((id) => userIds.has(id)),
            ),
        [dmChannels],
    )

    const [resetListKey, setResetListKey] = useState(0)
    const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)

    useErrorToast({
        errorMessage,
        contextMessage: 'There was an error creating the message',
    })

    const [search] = useSearchParams()
    const linkRef = useMemo(() => {
        const ref = search.get('ref')
        return ref ? `?ref=${ref}` : ''
    }, [search])

    const [isSubmitting, setIsSubmitting] = useState(false)

    const onSubmit = useCallback(
        async (selectedUserIds: Set<string>) => {
            console.log('create dm/gm: submit', Array.from(selectedUserIds).join())
            const existingChannel = checkIfChannelExists(selectedUserIds)
            setIsSubmitting(true)
            if (existingChannel) {
                console.log('create dm/gm: existingChannel', existingChannel)

                const link = createLink({ messageId: existingChannel.id })
                if (link) {
                    onDirectMessageCreated?.()
                    navigate(link + linkRef)
                }
                setIsSubmitting(false)
                return
            }
            if (selectedUserIds.size === 0) {
                console.warn('create dm: submit - no users selected')
            } else if (selectedUserIds.size === 1) {
                const first = Array.from(selectedUserIds)[0]
                console.log('create dm: submit', first)
                const streamId = await createDMChannel(first)
                if (streamId) {
                    console.log('create dm: created stream', streamId)
                    const link = createLink({ messageId: streamId })
                    if (link) {
                        console.log('create dm: navigating', link)
                        onDirectMessageCreated?.()
                        navigate(link + linkRef)
                    }
                } else {
                    console.error('create dm: failed creating stream')
                    setErrorMessage('failed to create dm stream')
                }
                setIsSubmitting(false)
                setSelectedUserIds(new Set())
                setResetListKey((k) => k + 1)
            } else {
                const userIds = Array.from(selectedUserIds)
                console.log('create gm: submit', userIds.join())
                const streamId = await createGDMChannel(userIds)
                if (streamId) {
                    console.log('create gm: created stream', streamId)
                    const link = createLink({ messageId: streamId })
                    if (link) {
                        console.log('create gm: navigating', link)
                        onDirectMessageCreated?.()
                        navigate(link)
                    }
                } else {
                    setErrorMessage('failed to create gm stream')
                }
            }
        },
        [
            checkIfChannelExists,
            createDMChannel,
            createGDMChannel,
            createLink,
            linkRef,
            navigate,
            onDirectMessageCreated,
        ],
    )

    const onSelectionChange = useCallback(
        (selectedUserIds: Set<string>) => {
            const existingChannel = checkIfChannelExists(selectedUserIds)

            if (isGroupDM) {
                setSelectedUserIds(selectedUserIds)
            } else if (selectedUserIds.size === 1) {
                setExistingChannels(existingChannel)
                onSubmit(selectedUserIds)
            }
        },
        [checkIfChannelExists, isGroupDM, onSubmit],
    )

    const onCreateButtonClicked = () => {
        void onSubmit(selectedUserIds)
    }

    const cta = `${existingChannels ? 'Open' : 'Create'} Group`

    const onToggleGroupDM = useCallback(() => {
        setIsGroupDM((g) => !g)
    }, [])

    return (
        <Stack gap grow>
            <DirectMessageInviteUserList
                key={`list-${resetListKey}`}
                isMultiSelect={isGroupDM}
                onToggleMultiSelect={onToggleGroupDM}
                onSelectionChange={onSelectionChange}
            >
                {isGroupDM && (
                    <Box
                        paddingX
                        key="create-gm"
                        paddingBottom="md"
                        bottom="none"
                        left="none"
                        right="none"
                        maxWidth="400"
                    >
                        <FancyButton
                            cta
                            spinner={isSubmitting}
                            disabled={selectedUserIds.size === 0}
                            onClick={onCreateButtonClicked}
                        >
                            {cta}
                        </FancyButton>
                    </Box>
                )}
            </DirectMessageInviteUserList>
            <AnimatePresence>
                {isSubmitting && (
                    <FadeInBox absoluteFill centerContent pointerEvents="none">
                        <Box horizontal gap position="absolute" alignItems="center" />
                    </FadeInBox>
                )}
            </AnimatePresence>
        </Stack>
    )
}
