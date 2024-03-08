import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
    DMChannelContextUserLookupProvider,
    DMChannelIdentifier,
    useChannelData,
    useDMData,
    useMembers,
    useMyUserId,
    useTownsClient,
    useUserLookupContext,
} from 'use-towns-client'
import { Box, Icon, Stack, Text, TextButton, TextField } from '@ui'
import { Panel, PanelButton } from '@components/Panel/Panel'
import { ConfirmLeaveModal } from '@components/ConfirmLeaveModal/ConfirmLeaveModal'
import { useDevice } from 'hooks/useDevice'
import { CHANNEL_INFO_PARAMS } from 'routes'
import { useUserList } from '@components/UserList/UserList'
import { useCreateLink } from 'hooks/useCreateLink'
import {
    DMTitleProperties,
    GDMTitleProperties,
    SetUsernameDisplayName,
} from '@components/SetUsernameDisplayName/SetUsernameDisplayName'
import { ChannelMembersModal } from './SpaceChannelDirectoryPanel'
import { GDMChannelPermissionsModal } from './GDMChannelPermissions'

export const DMChannelInfoPanel = () => {
    const [activeModal, setActiveModal] = useState<
        'members' | 'permissions' | 'confirm-leave' | undefined
    >(undefined)
    const { leaveRoom } = useTownsClient()
    const { isTouch } = useDevice()
    const { channel } = useChannelData()
    const { data } = useDMData(channel?.id)
    const { channelSlug } = useParams()
    const { memberIds } = useMembers(channel?.id)
    const { usersMap } = useUserLookupContext()
    const members = useMemo(
        () => memberIds.map((userId) => usersMap[userId]),
        [memberIds, usersMap],
    )

    const myUserId = useMyUserId()

    const navigate = useNavigate()

    const { createLink } = useCreateLink()

    const onClose = useCallback(() => {
        navigate('..')
    }, [navigate])

    const onLeaveClick = useCallback(() => {
        setActiveModal('confirm-leave')
    }, [setActiveModal])

    const onLeaveConfirm = useCallback(async () => {
        if (!channel?.id) {
            return
        }
        await leaveRoom(channel.id)
        setActiveModal(undefined)
        const link = createLink({ route: 'messages' })
        if (link) {
            navigate(link)
        }
    }, [channel?.id, createLink, leaveRoom, navigate])

    const onMembersClick = useCallback(() => {
        if (isTouch) {
            setActiveModal('members')
        } else {
            navigate(`../${CHANNEL_INFO_PARAMS.INFO}?${CHANNEL_INFO_PARAMS.DIRECTORY}`)
        }
    }, [navigate, isTouch])

    // const onPermissionsClick = useCallback(() => {
    //     if (isTouch) {
    //         setActiveModal('permissions')
    //     } else {
    //         navigate(`../${CHANNEL_INFO_PARAMS.INFO}?${CHANNEL_INFO_PARAMS.PERMISSIONS}`)
    //     }
    // }, [navigate, isTouch])

    const memberNamesExludingSelf = useMemo(() => {
        return members.filter((member) => member.userId !== myUserId).map((m) => m.userId)
    }, [members, myUserId])

    const membersText = useUserList({ userIds: memberNamesExludingSelf, excludeSelf: true }).join(
        '',
    )
    const memberCount = members.length ?? 0

    const usernameProperties = useMemo(() => {
        if (!data) {
            return undefined
        }
        if (data.isGroup) {
            return {
                kind: 'gdm',
            } satisfies GDMTitleProperties
        } else {
            return {
                kind: 'dm',
                counterPartyName: membersText,
            } satisfies DMTitleProperties
        }
    }, [data, membersText])

    const title = data ? (data.isGroup ? 'Group Info' : 'Direct Message') : ''

    return (
        <Panel modalPresentable label={title} onClose={onClose}>
            <DMChannelContextUserLookupProvider
                fallbackToParentContext
                channelId={channelSlug ?? ''}
            >
                <Stack gap padding>
                    {usernameProperties && (
                        <SetUsernameDisplayName titleProperties={usernameProperties} />
                    )}
                    {memberNamesExludingSelf.length > 0 && (
                        <Stack gap padding background="level2" rounded="sm">
                            {data?.isGroup ? (
                                <RoomPropertiesInputField defaultTitle={membersText} data={data} />
                            ) : (
                                <Text fontWeight="medium" color="default">
                                    {membersText}
                                </Text>
                            )}
                        </Stack>
                    )}
                    <PanelButton onClick={onMembersClick}>
                        <Icon type="people" size="square_sm" color="gray2" />
                        <Text color="default" fontWeight="medium">
                            {memberCount} {memberCount === 1 ? 'member' : 'members'}{' '}
                        </Text>
                    </PanelButton>
                    {/* {data?.isGroup && (
                        <PanelButton onClick={onPermissionsClick}>
                            <Icon type="people" size="square_sm" color="gray2" />
                            <Text color="default" fontWeight="medium">
                                Manage member permissions
                            </Text>
                        </PanelButton>
                    )} */}
                    <PanelButton onClick={onLeaveClick}>
                        <Icon type="logout" color="error" size="square_sm" />
                        <Text color="error" fontWeight="medium">
                            Leave group
                        </Text>
                    </PanelButton>
                </Stack>
                {activeModal === 'confirm-leave' && (
                    <ConfirmLeaveModal
                        text="Leave group?"
                        onConfirm={onLeaveConfirm}
                        onCancel={() => setActiveModal(undefined)}
                    />
                )}
                {activeModal === 'members' && (
                    <ChannelMembersModal onHide={() => setActiveModal(undefined)} />
                )}
                {activeModal === 'permissions' && (
                    <GDMChannelPermissionsModal onHide={() => setActiveModal(undefined)} />
                )}
            </DMChannelContextUserLookupProvider>
        </Panel>
    )
}

const RoomPropertiesInputField = (props: { defaultTitle: string; data?: DMChannelIdentifier }) => {
    const { data, defaultTitle } = props
    const { setRoomProperties } = useTownsClient()
    const [isEditing, setIsEditing] = useState(false)
    const [value, setValue] = useState('hello world')

    const validationError = value.length < 32 ? undefined : 'Title must be less than 32 characters'

    const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value)
    }, [])

    const onSave = useCallback(async () => {
        if (!data?.id) {
            return
        }

        await setRoomProperties(data?.id, value, data.properties?.topic ?? '')
        setIsEditing(false)
    }, [setRoomProperties, data?.id, data?.properties, value])

    const onKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
                onSave()
            } else if (e.key === 'Escape') {
                setValue(data?.properties?.name ?? '')
                setIsEditing(false)
            }
        },
        [onSave, data, setValue, setIsEditing],
    )
    const onBlur = useCallback(() => {
        if (value !== data?.properties?.name) {
            return
        }
        setIsEditing(false)
    }, [data?.properties, setIsEditing, value])

    useEffect(() => {
        setValue(data?.properties?.name ?? '')
    }, [data?.properties?.name])

    return (
        <Stack gap>
            <Text color="gray2" fontSize="sm">
                Group name
            </Text>
            {isEditing ? (
                <>
                    <Stack horizontal alignItems="center" gap="sm">
                        <TextField
                            border
                            autoFocus
                            tone={validationError ? 'error' : 'neutral'}
                            background="level3"
                            width="100%"
                            value={value}
                            height="height_lg"
                            paddingX="sm"
                            placeholder="Enter group name"
                            autoCorrect="off"
                            onChange={onChange}
                            onBlur={onBlur}
                            onKeyDown={onKeyDown}
                        />
                        <Box grow />
                        <TextButton disabled={validationError !== undefined} onClick={onSave}>
                            Save
                        </TextButton>
                    </Stack>
                    {validationError && (
                        <Text color="error" fontSize="sm">
                            {validationError}
                        </Text>
                    )}
                </>
            ) : (
                <Stack horizontal alignItems="center" gap="sm">
                    <Text fontWeight="medium" color="default">
                        {value.length > 0 ? value : defaultTitle}
                    </Text>
                    <Box grow />
                    <TextButton onClick={() => setIsEditing(true)}>Edit</TextButton>
                </Stack>
            )}
        </Stack>
    )
}
