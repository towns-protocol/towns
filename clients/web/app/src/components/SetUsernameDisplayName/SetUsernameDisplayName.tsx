import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { LookupUser, useMyUserId, useTownsClient, useUserLookupContext } from 'use-towns-client'
import { useParams } from 'react-router'
import { isDMChannelStreamId, isGDMChannelStreamId } from '@river/sdk'
import { Box, Button, Stack, Text, TextButton, TextField } from '@ui'
import { validateUsername } from '@components/SetUsernameForm/validateUsername'
import { useSetUsername } from 'hooks/useSetUsername'
import { EncryptedName } from '@components/EncryptedContent/EncryptedName'
import { shortAddress } from 'ui/utils/utils'

const useCurrentStreamID = () => {
    const { spaceSlug, channelSlug } = useParams()
    if (channelSlug) {
        if (isDMChannelStreamId(channelSlug) || isGDMChannelStreamId(channelSlug)) {
            return channelSlug
        }
    }
    return spaceSlug
}

const validateDisplayName = (displayName: string) => {
    return displayName.length < 33
}

type TitleProperties = DMTitleProperties | GDMTitleProperties | SpaceTitleProperties

export type DMTitleProperties = {
    kind: 'dm'
    counterPartyName: string
}

export type GDMTitleProperties = {
    kind: 'gdm'
}

export type SpaceTitleProperties = {
    kind: 'space'
    spaceName: string
}

export const SetUsernameDisplayName = (props: { titleProperties: TitleProperties }) => {
    const { titleProperties } = props
    const [showEditFields, setShowEditFields] = useState<boolean>(false)
    const streamId = useCurrentStreamID()
    const myUserId = useMyUserId()
    const { usersMap } = useUserLookupContext()
    const user = myUserId ? usersMap[myUserId] : undefined

    const { setUsername } = useSetUsername()
    const { setDisplayName } = useTownsClient()
    const [dirtyUsername, setDirtyUsername] = React.useState<string>(user?.username ?? '')
    const [usernameAvailable, setUsernameAvailable] = React.useState<boolean>(true)
    const [dirtyDisplayName, setDirtyDisplayName] = React.useState<string>(user?.displayName ?? '')
    const { getIsUsernameAvailable } = useTownsClient()

    const onUsernameChange = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            if (!streamId) {
                return
            }
            setDirtyUsername(e.target.value)
            setUsernameAvailable(true)
            const usernameAvailable =
                (await getIsUsernameAvailable(streamId, e.target.value)) ?? false

            setUsernameAvailable(usernameAvailable)
        },
        [setDirtyUsername, setUsernameAvailable, getIsUsernameAvailable, streamId],
    )

    useEffect(() => {
        if (user?.username) {
            setDirtyUsername(user.username)
        }
        if (user?.displayName) {
            setDirtyDisplayName(user.displayName)
        }
    }, [user?.username, user?.displayName, setDirtyUsername, setDirtyDisplayName])

    const onSave = useCallback(async () => {
        if (!streamId) {
            return
        }
        if (dirtyUsername !== user?.username && validateUsername(dirtyUsername)) {
            await setUsername(streamId, dirtyUsername)
        }
        if (dirtyDisplayName !== user?.displayName && validateDisplayName(dirtyDisplayName)) {
            await setDisplayName(streamId, dirtyDisplayName)
        }
        setShowEditFields(false)
    }, [user, setUsername, streamId, dirtyUsername, dirtyDisplayName, setDisplayName])

    const onCancel = useCallback(() => {
        setDirtyUsername(user?.username ?? '')
        setDirtyDisplayName(user?.displayName ?? '')
        setShowEditFields(false)
    }, [setDirtyDisplayName, setDirtyUsername, setShowEditFields, user])

    const onDisplayNameChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setDirtyDisplayName(e.target.value)
        },
        [setDirtyDisplayName],
    )

    const usernameErrorMessage = useMemo(() => {
        if (dirtyUsername === user?.username || dirtyUsername.length < 3) {
            return undefined
        }
        if (!usernameAvailable) {
            return 'This username is already taken.'
        }

        if (validateUsername(dirtyUsername)) {
            return undefined
        }
        return 'Your username must be between 1 and 16 characters and can only contain letters, numbers, and underscores.'
    }, [dirtyUsername, usernameAvailable, user])

    const displayNameErrorMessage = useMemo(() => {
        if (validateDisplayName(dirtyDisplayName)) {
            return undefined
        }
        return 'Your display name must be between 1 and 32 characters'
    }, [dirtyDisplayName])

    const saveButtonDisabled = useMemo(() => {
        return (
            (user?.displayName === dirtyDisplayName && user?.username === dirtyUsername) ||
            !validateUsername(dirtyUsername) ||
            !validateDisplayName(dirtyDisplayName)
        )
    }, [user, dirtyDisplayName, dirtyUsername])

    const titlePrefix = useMemo(() => {
        switch (titleProperties.kind) {
            case 'space':
                return `In ${titleProperties.spaceName}`
            case 'dm':
                return `In this DM between ${titleProperties.counterPartyName}`
            case 'gdm':
                return `In this group`
        }
    }, [titleProperties])

    if (!user) {
        return null
    }

    return (
        <Stack padding gap background="level2" rounded="sm">
            <Text size="sm" color="gray2">
                {titlePrefix}, you appear as:
            </Text>

            {showEditFields ? (
                <>
                    <EditableInputField
                        title="Display name"
                        value={dirtyDisplayName}
                        error={displayNameErrorMessage}
                        placeholder="Enter display name"
                        maxLength={32}
                        onChange={onDisplayNameChange}
                    />
                    <EditableInputField
                        title="Username"
                        value={dirtyUsername}
                        error={usernameErrorMessage}
                        maxLength={16}
                        placeholder="Enter username"
                        onChange={onUsernameChange}
                    />
                </>
            ) : (
                <>
                    <Stack horizontal>
                        <Stack gap>
                            <UsernameDisplayNameContent user={user} />
                        </Stack>
                        <Box grow />
                        <TextButton onClick={() => setShowEditFields(true)}>Edit</TextButton>
                    </Stack>
                    <UsernameDisplayNameEncryptedContent user={user} />
                </>
            )}
            {showEditFields && (
                <Stack horizontal>
                    <Box grow />

                    <>
                        <Button size="button_xs" tone="level2" onClick={onCancel}>
                            <Text color="gray2" size="sm">
                                Cancel
                            </Text>
                        </Button>
                        <Button
                            size="button_xs"
                            tone="level2"
                            disabled={saveButtonDisabled}
                            onClick={onSave}
                        >
                            <Text color="default" size="sm">
                                Save
                            </Text>
                        </Button>
                    </>
                </Stack>
            )}
        </Stack>
    )
}

const EditableInputField = (props: {
    title: string
    value: string
    placeholder: string
    error?: string
    maxLength: number
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
}) => {
    const { title, value, placeholder, error, maxLength, onChange } = props
    const charsRemaining = maxLength - value.length
    const [isEditing, setIsEditing] = useState<boolean>(false)
    const editingStateChanged = useCallback(
        (active: boolean) => {
            setIsEditing(active)
        },
        [setIsEditing],
    )

    const charLimitExceeded = charsRemaining < 0
    return (
        <Stack gap="sm">
            <Text color="default" fontWeight="medium">
                {title}
            </Text>
            <Stack horizontal gap alignItems="center" background="level3" rounded="sm">
                <Box position="relative" width="100%">
                    <TextField
                        border
                        width="100%"
                        value={value}
                        height="height_lg"
                        paddingX="sm"
                        placeholder={placeholder}
                        // need to manually override paddingright for the chars remaining to fit
                        style={{ paddingRight: '20px' }}
                        autoCorrect="off"
                        onChange={onChange}
                        onFocus={() => editingStateChanged(true)}
                        onBlur={() => editingStateChanged(false)}
                    />
                    <Box
                        centerContent
                        height="100%"
                        position="absolute"
                        right="sm"
                        visibility={isEditing || charLimitExceeded ? 'visible' : 'hidden'}
                    >
                        <Text color={charLimitExceeded ? 'error' : 'gray2'} size="xs">
                            {charsRemaining.toString()}
                        </Text>
                    </Box>
                </Box>
            </Stack>
            {error && (
                <Text color="error" size="sm">
                    {error}
                </Text>
            )}
        </Stack>
    )
}

const UsernameDisplayNameContent = (props: { user: LookupUser }) => {
    const { user } = props

    return user.usernameEncrypted && user.displayNameEncrypted ? (
        <>
            <Text fontSize="lg" fontWeight="strong" color="default">
                {shortAddress(user.userId)}
            </Text>
        </>
    ) : (
        <>
            {!user.displayNameEncrypted && user.displayName.length > 0 && (
                <Text color="default" fontWeight="strong">
                    {user.displayName}
                </Text>
            )}
            {!user.usernameEncrypted && <Text color="default">@{user.username}</Text>}
        </>
    )
}

const UsernameDisplayNameEncryptedContent = (props: { user: LookupUser }) => {
    const { user } = props
    return user.usernameEncrypted && user.displayNameEncrypted ? (
        <EncryptedName message="Your username and display name are still decrypting." />
    ) : user.displayNameEncrypted ? (
        <EncryptedName message="Your display name is still decrypting." />
    ) : user.usernameEncrypted ? (
        <EncryptedName message="Your username is still decrypting." />
    ) : (
        <></>
    )
}
