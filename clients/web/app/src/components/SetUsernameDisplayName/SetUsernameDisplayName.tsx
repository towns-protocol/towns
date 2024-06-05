import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { LookupUser, useMyUserId, useTownsClient, useUserLookupContext } from 'use-towns-client'
import { useParams } from 'react-router'
import noop from 'lodash/noop'
import { isDMChannelStreamId, isGDMChannelStreamId } from '@river/sdk'
import { Box, Button, Divider, IconButton, Stack, Text, TextButton, TextField } from '@ui'
import { validateUsername } from '@components/SetUsernameForm/validateUsername'
import { useSetUsername } from 'hooks/useSetUsername'
import { EncryptedName } from '@components/EncryptedContent/EncryptedName'
import { shortAddress } from 'ui/utils/utils'
import { useEnsNames } from 'api/lib/ensNames'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { useSetEnsName } from 'hooks/useSetEnsName'
import { EnsBadge } from '@components/EnsBadge/EnsBadge'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { CHANNEL_INFO_PARAMS } from 'routes'
import { useDevice } from 'hooks/useDevice'

export const useCurrentStreamID = () => {
    const { spaceSlug, channelSlug } = useParams()
    if (channelSlug) {
        if (isDMChannelStreamId(channelSlug) || isGDMChannelStreamId(channelSlug)) {
            return channelSlug
        }
    }
    return spaceSlug
}

const validateDisplayName = (displayName: string) => {
    if (displayName.endsWith('.eth')) {
        return { valid: false, message: 'Display name cannot end with .eth' }
    }
    if (displayName.length > 32) {
        return { valid: false, message: 'Your display name must be between 1 and 32 characters' }
    }
    return { valid: true }
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
    const [isShowingEnsDisplayNameForm, setShowinEnsDisplayNameForm] = useState<boolean>(false)
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
        if (dirtyDisplayName !== user?.displayName && validateDisplayName(dirtyDisplayName).valid) {
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

    const onSetEnsNameClicked = useCallback(() => {
        setShowinEnsDisplayNameForm(true)
    }, [setShowinEnsDisplayNameForm])

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

    const displayNameErrorMessage = useMemo(
        () => validateDisplayName(dirtyDisplayName).message,
        [dirtyDisplayName],
    )

    const saveButtonDisabled = useMemo(() => {
        return (
            (user?.displayName === dirtyDisplayName && user?.username === dirtyUsername) ||
            !validateUsername(dirtyUsername) ||
            !validateDisplayName(dirtyDisplayName).valid
        )
    }, [user, dirtyDisplayName, dirtyUsername])

    const saveOnEnter = useCallback(
        (event: React.KeyboardEvent) => {
            if (event.key === 'Enter' && !saveButtonDisabled) {
                event.preventDefault()
                onSave()
            }
        },
        [onSave, saveButtonDisabled],
    )

    const titlePrefix = useMemo(() => {
        switch (titleProperties.kind) {
            case 'space':
                return `In ${titleProperties.spaceName}`
            case 'dm':
                return `In this DM with ${titleProperties.counterPartyName}`
            case 'gdm':
                return `In this group`
        }
    }, [titleProperties])

    if (!user) {
        return null
    }

    return (
        <Stack padding gap="sm" background="level2" rounded="sm">
            <Box paddingBottom="sm">
                <Text size="sm" color="gray2">
                    {titlePrefix}, you appear as:
                </Text>
            </Box>
            {showEditFields ? (
                <>
                    <EditableInputField
                        title="Display name"
                        value={dirtyDisplayName}
                        error={displayNameErrorMessage}
                        placeholder="Enter display name"
                        maxLength={32}
                        onKeyDown={saveOnEnter}
                        onChange={onDisplayNameChange}
                    />
                    {user && user.ensAddress && (
                        <EnsBadge userId={user.userId} ensAddress={user.ensAddress} />
                    )}

                    <EditableInputField
                        title="Username"
                        value={dirtyUsername}
                        error={usernameErrorMessage}
                        maxLength={16}
                        placeholder="Enter username"
                        onKeyDown={saveOnEnter}
                        onChange={onUsernameChange}
                    />
                </>
            ) : (
                <>
                    <Stack horizontal>
                        <Stack gap="sm">
                            {user && user.ensAddress && (
                                <EnsBadge userId={user.userId} ensAddress={user.ensAddress} />
                            )}
                            <UsernameDisplayNameContent user={user} />
                        </Stack>
                        <Box grow />
                        <TextButton onClick={() => setShowEditFields(true)}>Edit</TextButton>
                    </Stack>
                    <UsernameDisplayNameEncryptedContent user={user} />
                </>
            )}
            <Stack horizontal gap="sm">
                <Button
                    tone="level3"
                    size="button_sm"
                    width="auto"
                    color="default"
                    onClick={onSetEnsNameClicked}
                >
                    {user?.ensAddress ? 'Edit ENS Display Name' : 'Add ENS Display Name'}
                </Button>
            </Stack>
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
            {isShowingEnsDisplayNameForm && (
                <EnsDisplayNameModal
                    currentEnsName={user?.ensAddress}
                    onHide={() => setShowinEnsDisplayNameForm(false)}
                />
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
    onKeyDown?: (e: React.KeyboardEvent) => void
}) => {
    const { title, value, placeholder, error, maxLength, onChange, onKeyDown } = props
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
            <Text color="default" fontSize="sm" fontWeight="medium">
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
                        // need to manually override paddingRight for the chars remaining to fit
                        style={{ paddingRight: '20px' }}
                        autoCorrect="off"
                        onKeyDown={onKeyDown || noop}
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

// TODO: use mask to show that there's more data on the scroll
const EnsDisplayNameModal = (props: { currentEnsName?: string; onHide: () => void }) => {
    const { onHide, currentEnsName: currentEnsName } = props
    const { ensNames, isFetching } = useEnsNames()
    const { setEnsName } = useSetEnsName()
    const streamId = useCurrentStreamID()
    const { openPanel } = usePanelActions()
    const [selectedWallet, setSelectedWallet] = useState<string | undefined>(currentEnsName)
    const [pendingWallet, setPendingWallet] = useState<string | undefined>(undefined)
    const { isTouch } = useDevice()

    useEffect(() => {
        setPendingWallet(currentEnsName)
    }, [currentEnsName])

    const onSelectWallet = useCallback(
        (walletAddress: string | undefined) => {
            if (!streamId) {
                return
            }
            setSelectedWallet(walletAddress)
        },
        [streamId, setSelectedWallet],
    )

    const onSave = useCallback(() => {
        if (!streamId) {
            return
        }
        setPendingWallet(selectedWallet)
        setEnsName(streamId, selectedWallet).then(() => {
            onHide()
        })
    }, [streamId, selectedWallet, setEnsName, onHide])

    const saveInProgress = pendingWallet != currentEnsName
    const saveButtonEnabled = !saveInProgress && selectedWallet != currentEnsName

    const onViewLinkedWalletsClick = useCallback(() => {
        onHide()
        openPanel(CHANNEL_INFO_PARAMS.WALLETS)
    }, [onHide, openPanel])

    const hasEnsName = ensNames.length > 0 && !isFetching

    return (
        <ModalContainer asSheet minWidth="350" onHide={onHide}>
            {!isTouch && (
                <Box position="relative">
                    <IconButton position="topRight" icon="close" onClick={onHide} />
                </Box>
            )}
            <Stack gap alignItems="center" paddingTop="lg">
                <Text size="lg" fontWeight="strong" color="default">
                    Set ENS Display Name
                </Text>
            </Stack>

            <Stack gap alignItems="center" paddingTop="lg">
                {ensNames.length === 0 && isFetching && <ButtonSpinner />}
                {!hasEnsName && (
                    <Box grow centerContent padding>
                        <Text color="gray2" textAlign="center">
                            No ENS names were found in your wallets. <br />
                            Link a new name to set a verified ENS as your display name:
                        </Text>
                    </Box>
                )}
                {ensNames.length > 0 && (
                    <Stack scroll alignContent="start" width="100%" maxHeight="300" gap="sm">
                        {ensNames.map((ensName) => (
                            <WalletRow
                                key={ensName.wallet}
                                label={ensName.ensName}
                                checked={ensName.wallet === selectedWallet}
                                onSelectWallet={() => onSelectWallet(ensName.wallet)}
                            />
                        ))}

                        <WalletRow
                            key="no-name"
                            label="None"
                            checked={selectedWallet === undefined}
                            onSelectWallet={() => onSelectWallet(undefined)}
                        />
                    </Stack>
                )}
            </Stack>

            <Stack gap shrink={false} paddingTop="sm">
                {hasEnsName && (
                    <>
                        <Button
                            tone={saveButtonEnabled ? 'cta1' : 'level2'}
                            width="100%"
                            disabled={!saveButtonEnabled}
                            onClick={onSave}
                        >
                            {saveInProgress ? <ButtonSpinner /> : 'Set ENS'}
                        </Button>
                        <Stack horizontal gap="sm" alignItems="center" width="100%">
                            <Divider />
                            <Text shrink={false} color="gray2" fontSize="sm">
                                {ensNames.length > 0
                                    ? 'Or add a verified ENS'
                                    : 'Add a verified ENS'}
                            </Text>
                            <Divider />
                        </Stack>
                    </>
                )}

                <Button
                    tone={hasEnsName ? 'level2' : 'cta1'}
                    width="100%"
                    onClick={onViewLinkedWalletsClick}
                >
                    View Linked Wallets
                </Button>
            </Stack>
        </ModalContainer>
    )
}

const WalletRow = (props: {
    label: string | undefined
    checked: boolean
    onSelectWallet: () => void
}) => {
    const { label: ensName, onSelectWallet, checked } = props
    return (
        <Stack
            hoverable
            horizontal
            padding
            alignItems="center"
            gap="sm"
            background={{ default: 'level2', hover: 'level3' }}
            rounded="sm"
            onClick={onSelectWallet}
        >
            <Text size="md" color="default">
                {ensName}
            </Text>
            <Box grow />
            <CircleInCircle checked={checked} />
        </Stack>
    )
}

const CircleInCircle = (props: { checked: boolean }) => {
    const { checked } = props
    return (
        <Box centerContent rounded="full" padding="sm" width="x2" height="x2" background="level4">
            {checked && (
                <Box width="x2" height="x2" background="inverted" rounded="full" shrink={false} />
            )}
        </Box>
    )
}
