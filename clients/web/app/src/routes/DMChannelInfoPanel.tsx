import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
    Address,
    DMChannelContextUserLookupProvider,
    DMChannelIdentifier,
    useChannelData,
    useDMData,
    useMembers,
    useMyUserId,
    useTownsClient,
    useUserLookupContext,
} from 'use-towns-client'
import { isDefined } from '@river/sdk'
import { Box, Icon, Stack, Text, TextButton, TextField } from '@ui'
import { Panel } from '@components/Panel/Panel'
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
import { PanelButton } from '@components/Panel/PanelButton'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { useAnalytics } from 'hooks/useAnalytics'
import { ChannelMembersModal } from './SpaceChannelDirectoryPanel'
import { GDMChannelPermissionsModal } from './GDMChannelPermissions'
import { usePanelActions } from './layouts/hooks/usePanelActions'

export const DMChannelInfoPanel = () => {
    const channelId = useChannelData()?.channel?.id
    const { data } = useDMData(channelId)
    const title = data ? (data.isGroup ? 'Group Info' : 'Direct Message') : ''
    return (
        <Panel modalPresentable label={title}>
            {<DMChannelInfo channelId={channelId} data={data} />}
        </Panel>
    )
}

export const DMChannelInfo = (props: { channelId?: string; data?: DMChannelIdentifier }) => {
    const { channelId, data } = props
    const [activeModal, setActiveModal] = useState<
        'members' | 'permissions' | 'confirm-leave' | undefined
    >(undefined)
    const { leaveRoom } = useTownsClient()
    const { isTouch } = useDevice()
    const { analytics } = useAnalytics()

    const { channelSlug } = useParams()
    const { memberIds } = useMembers(channelId)
    const { usersMap } = useUserLookupContext()
    const members = useMemo(
        () => memberIds.map((userId) => usersMap[userId]),
        [memberIds, usersMap],
    )

    const myUserId = useMyUserId()

    const navigate = useNavigate()

    const { createLink } = useCreateLink()

    const onLeaveClick = useCallback(() => {
        const tracked = {
            channelId,
            numberOfMembers: memberIds.length,
        }
        analytics?.track('clicked_leave_group', tracked, () => {
            console.log('[analytics] clicked leave group', tracked)
        })
        setActiveModal('confirm-leave')
    }, [analytics, channelId, memberIds.length])

    const onLeaveConfirm = useCallback(async () => {
        if (!channelId) {
            return
        }
        const tracked = {
            channelId,
            numberOfRemainingMembers: memberIds.length - 1,
        }
        analytics?.track('confirmed_leave_group', tracked, () => {
            console.log('[analytics] confirmed leave group', tracked)
        })
        await leaveRoom(channelId)
        setActiveModal(undefined)
        const link = createLink({ route: 'messages' })
        if (link) {
            navigate(link)
        }
    }, [analytics, channelId, createLink, leaveRoom, memberIds.length, navigate])

    const onLeaveCancel = useCallback(() => {
        const tracked = {
            channelId,
        }
        analytics?.track('canceled leave group', tracked, () => {
            console.log('[analytics] canceled leave group', tracked)
        })
        setActiveModal(undefined)
    }, [analytics, channelId])

    const { openPanel } = usePanelActions()
    const onMembersClick = useCallback(() => {
        if (isTouch) {
            setActiveModal('members')
        } else {
            openPanel(CHANNEL_INFO_PARAMS.DIRECTORY)
        }
    }, [isTouch, openPanel])

    // const onPermissionsClick = useCallback(() => {
    //     if (isTouch) {
    //         setActiveModal('permissions')
    //     } else {
    //         navigate(`../${CHANNEL_INFO_PARAMS.INFO}?${CHANNEL_INFO_PARAMS.PERMISSIONS}`)
    //     }
    // }, [navigate, isTouch])

    const membersExcludingSelf = useMemo(() => {
        return members.filter((member) => isDefined(member) && member.userId !== myUserId)
    }, [members, myUserId])

    const memberNamesExludingSelf = useMemo(() => {
        return membersExcludingSelf.map((m) => m.userId)
    }, [membersExcludingSelf])

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

    const isGDM = data?.isGroup ?? false

    return (
        <>
            <DMChannelContextUserLookupProvider
                fallbackToParentContext
                channelId={channelSlug ?? ''}
            >
                <Stack gap>
                    {usernameProperties && (
                        <SetUsernameDisplayName titleProperties={usernameProperties} />
                    )}
                    {isGDM ? (
                        <>
                            {memberNamesExludingSelf.length > 0 && (
                                <Stack gap padding background="level2" rounded="sm">
                                    {isGDM ? (
                                        <RoomPropertiesInputField
                                            defaultTitle={membersText}
                                            data={data}
                                        />
                                    ) : (
                                        <Text fontWeight="medium" color="default">
                                            {membersText}
                                        </Text>
                                    )}
                                </Stack>
                            )}
                        </>
                    ) : (
                        <>
                            {membersExcludingSelf.map((member) => (
                                <ProfilePanelButton key={member.userId} member={member} />
                            ))}
                        </>
                    )}

                    {isGDM && (
                        <PanelButton onClick={onMembersClick}>
                            <Icon type="people" size="square_sm" color="gray2" />
                            <Text color="default" fontWeight="medium">
                                {memberCount} {memberCount === 1 ? 'member' : 'members'}{' '}
                            </Text>
                        </PanelButton>
                    )}
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
                        onCancel={onLeaveCancel}
                    />
                )}
                {activeModal === 'members' && (
                    <ChannelMembersModal onHide={() => setActiveModal(undefined)} />
                )}
                {activeModal === 'permissions' && (
                    <GDMChannelPermissionsModal onHide={() => setActiveModal(undefined)} />
                )}
            </DMChannelContextUserLookupProvider>
        </>
    )
}

const ProfilePanelButton = (props: {
    member: {
        userId: string
        displayName: string
        username?: string
    }
}) => {
    const { member } = props
    const { createLink } = useCreateLink()
    const { data: abstractAccountAddress } = useAbstractAccountAddress({
        rootKeyAddress: member.userId as Address | undefined,
    })

    const profileLink = createLink({ profileId: abstractAccountAddress })
    const navigate = useNavigate()
    const onClick = useCallback(() => {
        if (profileLink) {
            navigate(profileLink)
        }
    }, [profileLink, navigate])

    return (
        <PanelButton onClick={onClick}>
            <Text fontWeight="medium" color="default">
                {getPrettyDisplayName(member)}
            </Text>
        </PanelButton>
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
