import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
    LookupUser,
    useMyUserId,
    useSpaceData,
    useTownsClient,
    useUserLookupStore,
} from 'use-towns-client'
import { isDMChannelStreamId, isGDMChannelStreamId } from '@river-build/sdk'
import { toast } from 'react-hot-toast/headless'
import { Box, Button, Divider, IconButton, Stack, Text, TextButton } from '@ui'
import { validateDisplayName, validateUsername } from '@components/SetUsernameForm/validateUsername'
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
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { UpdateEnsDisplayNameFailed } from '@components/Notifications/UpdateEnsDisplayNameFailed'
import { useRouteParams } from 'hooks/useRouteParams'
import { useValidateUsername } from 'hooks/useValidateUsername'
import { EditableInputField } from './EditableInputField'

export const useCurrentStreamID = () => {
    const { spaceId, channelId } = useRouteParams()
    if (channelId) {
        if (isDMChannelStreamId(channelId) || isGDMChannelStreamId(channelId)) {
            return channelId
        }
    }
    return spaceId
}

export const SetUsernameDisplayName = (props: { streamId: string }) => {
    const { streamId } = props

    const streamType = useMemo(
        () =>
            isDMChannelStreamId(streamId) ? 'dm' : isGDMChannelStreamId(streamId) ? 'gdm' : 'space',
        [streamId],
    )

    const [showEditFields, setShowEditFields] = useState<boolean>(false)

    const myUserId = useMyUserId()

    const user = useUserLookupStore((s) =>
        streamId && myUserId
            ? streamType === 'dm' || streamType === 'gdm'
                ? s.channelUsers[streamId]?.[myUserId]
                : s.spaceUsers[streamId]?.[myUserId]
            : undefined,
    )

    const { setUsername } = useSetUsername()
    const { setDisplayName } = useTownsClient()
    const [dirtyDisplayName, setDirtyDisplayName] = React.useState<string>(user?.displayName ?? '')
    const [isShowingEnsDisplayNameForm, setShowingEnsDisplayNameForm] = useState<boolean>(false)

    const {
        username: dirtyUsername,
        usernameErrorMessage,
        updateUsername,
    } = useValidateUsername({
        streamId,
        defaultUsername: user?.username ?? '',
    })

    const onUsernameChange = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            updateUsername(e.target.value)
        },
        [updateUsername],
    )

    useEffect(() => {
        if (user?.username) {
            updateUsername(user.username)
        }
        if (user?.displayName) {
            setDirtyDisplayName(user.displayName)
        }
    }, [user?.username, user?.displayName, updateUsername, setDirtyDisplayName])

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
        updateUsername(user?.username ?? '')
        setDirtyDisplayName(user?.displayName ?? '')
        setShowEditFields(false)
    }, [setDirtyDisplayName, updateUsername, setShowEditFields, user])

    const onDisplayNameChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setDirtyDisplayName(e.target.value)
        },
        [setDirtyDisplayName],
    )

    const onSetEnsNameClicked = useCallback(() => {
        setShowingEnsDisplayNameForm(true)
    }, [setShowingEnsDisplayNameForm])

    const displayNameErrorMessage = useMemo(
        () => validateDisplayName(dirtyDisplayName).message,
        [dirtyDisplayName],
    )

    const usernameError = useMemo(() => {
        if (dirtyUsername === user?.username) {
            return undefined
        }
        return usernameErrorMessage
    }, [dirtyUsername, usernameErrorMessage, user])

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

    /**
     * saving this in case we actually need it - I think "in this DM" is enough
     */

    // const { memberIds } = useMembers(streamId)
    // const dmCounterPartyName = useMemo(() => {
    //     if (isDMChannelStreamId(streamId)) {
    //         const counterPartyId =
    //             memberIds.find((m) => m !== myUserId) ??
    //             /* last option, you can be in a dm with yourself */
    //             memberIds[0]
    //         if (counterPartyId) {
    //             return useUserLookupStore.getState().channelUsers[streamId]?.[counterPartyId]
    //         }
    //     }
    //     return ''
    // }, [memberIds, myUserId, streamId])

    const spaceData = useSpaceData()

    const spaceName = spaceData?.id === streamId ? spaceData?.name : undefined

    const titlePrefix = useMemo(() => {
        switch (streamType) {
            case 'space':
                return `In ${spaceName ?? 'this space'}`
            case 'dm':
                return `In this DM`
            case 'gdm':
                return `In this group`
        }
    }, [spaceName, streamType])

    return (
        <Stack padding gap="paragraph" background="level2" rounded="sm">
            {user || !showEditFields ? (
                <Box horizontal justifyContent="spaceBetween" alignItems="end">
                    <Text size="sm" color="gray2">
                        {user ? (
                            <>{titlePrefix}, you appear as:</>
                        ) : (
                            <>{titlePrefix}, you don&apos;t have a specific username</>
                        )}
                    </Text>
                    {user && !showEditFields && (
                        <TextButton onClick={() => setShowEditFields(true)}>Edit</TextButton>
                    )}
                </Box>
            ) : (
                <></>
            )}

            {showEditFields ? (
                <Stack gap paddingTop="xs">
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
                        error={usernameError}
                        maxLength={16}
                        placeholder="Enter username"
                        onKeyDown={saveOnEnter}
                        onChange={onUsernameChange}
                    />
                </Stack>
            ) : user ? (
                <>
                    {user && user.ensAddress && (
                        <EnsBadge userId={user.userId} ensAddress={user.ensAddress} />
                    )}
                    {user ? <UsernameDisplayNameContent user={user} /> : <></>}
                    {user ? <UsernameDisplayNameEncryptedContent user={user} /> : <></>}
                </>
            ) : (
                <></>
            )}
            {!showEditFields && (
                <Stack horizontal gap="sm" paddingTop="xs">
                    {!user && (
                        <Button
                            tone="level3"
                            size="button_sm"
                            width="auto"
                            color="default"
                            onClick={() => {
                                setShowEditFields(true)
                            }}
                        >
                            Add username
                        </Button>
                    )}
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
            {isShowingEnsDisplayNameForm && (
                <EnsDisplayNameModal
                    spaceId={spaceData?.id}
                    streamId={streamId}
                    currentEns={{ address: user?.ensAddress, name: user?.ensName }}
                    setShowingEnsDisplayNameForm={setShowingEnsDisplayNameForm}
                    onHide={() => setShowingEnsDisplayNameForm(false)}
                />
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
                <Text color="default" fontSize="lg" fontWeight="strong">
                    {getPrettyDisplayName(user)}
                </Text>
            )}
            {!user.usernameEncrypted && <Text color="gray2">@{user.username}</Text>}
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

const EnsDisplayNameModal = (props: {
    streamId: string
    spaceId: string | undefined
    currentEns?: { address?: string; name?: string }
    onHide: () => void
    setShowingEnsDisplayNameForm: (show: boolean) => void
}) => {
    const { spaceId, streamId, onHide, currentEns, setShowingEnsDisplayNameForm } = props
    const { ensNames, isFetching } = useEnsNames()
    const { setEnsName } = useSetEnsName()
    const { lookupUser, setSpaceUser } = useUserLookupStore()
    const myUserId = useMyUserId()
    const { openPanel } = usePanelActions()
    const [selectedEns, setSelectedEns] = useState<{ address?: string; name?: string } | undefined>(
        currentEns,
    )
    const { isTouch } = useDevice()

    const onViewLinkedWalletsClick = useCallback(() => {
        onHide()
        openPanel(CHANNEL_INFO_PARAMS.WALLETS)
    }, [onHide, openPanel])

    const hasEnsName = ensNames.length > 0 && !isFetching

    const setOptimisticEns = useCallback(
        async (ensAddress: string | undefined, ensName: string | undefined) => {
            if (!streamId || !myUserId) {
                return
            }
            const user = lookupUser(myUserId)
            setSpaceUser(
                myUserId,
                {
                    ...user,
                    ensAddress,
                    ensName,
                },
                spaceId,
            )
        },
        [lookupUser, myUserId, setSpaceUser, spaceId, streamId],
    )

    const onSave = useCallback(() => {
        if (!myUserId) {
            onHide()
            return
        }
        const user = lookupUser(myUserId)
        const oldEns = { address: user?.ensAddress, name: user?.ensName }

        // Ideally, we would like to queue those updates and do it later
        if (!streamId) {
            setOptimisticEns(oldEns.address, oldEns.name)
            toast.custom((t) => (
                <UpdateEnsDisplayNameFailed
                    toast={t}
                    onClick={() => setShowingEnsDisplayNameForm(true)}
                />
            ))
            onHide()
            return
        }
        setOptimisticEns(selectedEns?.address, selectedEns?.name)
        setEnsName(streamId, selectedEns?.address).catch(() => {
            setOptimisticEns(oldEns.address, oldEns.name)
            toast.custom((t) => (
                <UpdateEnsDisplayNameFailed
                    toast={t}
                    onClick={() => setShowingEnsDisplayNameForm(true)}
                />
            ))
        })
        onHide()
    }, [
        myUserId,
        lookupUser,
        streamId,
        setOptimisticEns,
        selectedEns?.address,
        selectedEns?.name,
        setEnsName,
        onHide,
        setShowingEnsDisplayNameForm,
    ])

    return (
        <ModalContainer asSheet maxWidth="400" onHide={onHide}>
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
                {isFetching && <ButtonSpinner />}
                {hasEnsName ? (
                    <Stack scroll alignContent="start" width="100%" gap="sm">
                        {ensNames.map((ensName) => (
                            <EnsRow
                                key={ensName.address}
                                label={ensName.name}
                                checked={ensName.address === selectedEns?.address}
                                onClick={() =>
                                    setSelectedEns({
                                        address: ensName.address,
                                        name: ensName.name,
                                    })
                                }
                            />
                        ))}

                        <EnsRow
                            key="no-name"
                            label="None"
                            checked={selectedEns?.address === undefined}
                            onClick={() => setSelectedEns(undefined)}
                        />
                    </Stack>
                ) : (
                    <>
                        <Box grow centerContent padding>
                            <Text color="gray2" textAlign="center">
                                No ENS names were found in your wallets. <br />
                                Link a new name to set a verified ENS as your display name:
                            </Text>
                        </Box>
                    </>
                )}
            </Stack>

            <Stack gap shrink={false} paddingTop="sm">
                {hasEnsName && (
                    <>
                        <Button tone="cta1" width="100%" onClick={onSave}>
                            Set ENS
                        </Button>
                        <Stack horizontal gap="sm" alignItems="center" width="100%">
                            <Divider />
                            <Text shrink={false} color="gray2" fontSize="sm">
                                Or add a verified ENS
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
                    {hasEnsName ? 'View Linked Wallets' : 'Link a Wallet'}
                </Button>
            </Stack>
        </ModalContainer>
    )
}

const EnsRow = (props: { label: string | undefined; checked: boolean; onClick: () => void }) => {
    const { label: ensName, onClick, checked } = props
    return (
        <Stack
            hoverable
            horizontal
            padding
            alignItems="center"
            gap="sm"
            background={{ default: 'level2', hover: 'level3' }}
            rounded="sm"
            onClick={onClick}
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
