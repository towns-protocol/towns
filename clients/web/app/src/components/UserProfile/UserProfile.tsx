import { Nft, useSpaceData, useUserLookupContext } from 'use-towns-client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useEvent } from 'react-use-event-hook'
import { toast } from 'react-hot-toast/headless'
import { isDefined } from '@river/sdk'
import { Box, Button, FormRender, Icon, IconButton, Paragraph, Stack, Text, TextButton } from '@ui'
import { useSetUserBio } from 'hooks/useUserBio'
import { TextArea } from 'ui/components/TextArea/TextArea'
import { Spinner } from '@components/Spinner'
import { errorHasInvalidCookieResponseHeader } from 'api/apiClient'
import { InvalidCookieNotification } from '@components/Notifications/InvalidCookieNotification'
import { LargeUploadImageTemplate } from '@components/UploadImage/LargeUploadImageTemplate'
import { Avatar } from '@components/Avatar/Avatar'
import {
    SetUsernameDisplayName,
    useCurrentStreamID,
} from '@components/SetUsernameDisplayName/SetUsernameDisplayName'
import { MutualTowns } from '@components/MutualTowns/MutualTowns'
import { EnsBadge } from '@components/EnsBadge/EnsBadge'
import { useNfts } from 'hooks/useNfts'
import { useSetNftProfilePicture } from 'hooks/useSetNftProfilePicture'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { CHANNEL_INFO_PARAMS } from 'routes'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { useDevice } from 'hooks/useDevice'
import { UserWalletContent } from './UserWalletContent'

type Props = {
    displayName: string
    center?: boolean
    info?: { title: string; content?: string | JSX.Element }[]
    userBio?: string
    userId?: string
    canEdit?: boolean
    abstractAccountAddress?: string
}

enum InputId {
    Bio = 'Bio',
}

export const UserProfile = (props: Props) => {
    const { userId, canEdit, center, info, userBio, abstractAccountAddress } = props
    const spaceData = useSpaceData()
    const { usersMap } = useUserLookupContext()
    const user = userId ? usersMap[userId] : undefined
    const [showNftProfilePicture, setShowNftProfilePicture] = useState(false)

    const { setNft } = useSetNftProfilePicture()
    const streamId = useCurrentStreamID()
    const onClearNft = useCallback(() => {
        if (!streamId) {
            return
        }
        setNft(streamId, '', 0, '')
    }, [setNft, streamId])

    const { mutateAsync: mutateAsyncBio } = useSetUserBio(abstractAccountAddress)

    const resourceId = useMemo(() => {
        return abstractAccountAddress ?? ''
    }, [abstractAccountAddress])

    const onSaveItem = useEvent((id: string, content: undefined | string) => {
        switch (id) {
            case InputId.Bio: {
                if (!abstractAccountAddress) {
                    throw new Error('no user address provided')
                }

                content = content?.trim() ?? ''

                return mutateAsyncBio(content, {
                    onError: (error) => {
                        if (errorHasInvalidCookieResponseHeader(error)) {
                            toast.custom((t) => (
                                <InvalidCookieNotification
                                    toast={t}
                                    actionMessage="edit the description"
                                />
                            ))
                        }
                    },
                })
            }
        }
    })

    return (
        <Stack grow gap paddingBottom="none" position="relative">
            <Stack centerContent={center} padding="lg">
                <FormRender maxWidth="200" width="100%" key={resourceId}>
                    {({ register, formState, setError, clearErrors }) => (
                        <LargeUploadImageTemplate
                            canEdit={!!canEdit}
                            type="avatar"
                            formFieldName="avatar"
                            resourceId={resourceId}
                            setError={setError}
                            register={register}
                            formState={formState}
                            clearErrors={clearErrors}
                            imageRestrictions={{
                                minDimension: {
                                    message: `Image is too small. Please upload an image with a minimum height & width of 300px.`,
                                    min: 300,
                                },
                            }}
                        >
                            <Stack centerContent aspectRatio="1/1">
                                <Avatar
                                    userId={userId}
                                    size="avatar_x20"
                                    imageVariant="thumbnail300"
                                />
                            </Stack>
                        </LargeUploadImageTemplate>
                    )}
                </FormRender>

                <Stack horizontal gap="xs">
                    <Button size="button_sm" onClick={() => setShowNftProfilePicture(true)}>
                        <Stack
                            horizontal
                            gap="sm"
                            alignItems="center"
                            color="default"
                            fontSize="sm"
                            fontWeight="medium"
                        >
                            <Icon type="verifiedEnsName" size="square_xs" />
                            NFT Profile Picture
                        </Stack>
                    </Button>
                    {user?.nft && (
                        <Button size="button_sm" onClick={onClearNft}>
                            <Icon type="close" size="square_xs" />
                        </Button>
                    )}
                </Stack>
            </Stack>

            {canEdit ? (
                <>
                    {spaceData && (
                        <SetUsernameDisplayName
                            titleProperties={{ kind: 'space', spaceName: spaceData.name }}
                        />
                    )}
                </>
            ) : (
                <Stack padding gap="sm" rounded="sm" background="level2">
                    {user && (
                        <>
                            {user.displayName.length > 0 && (
                                <Text color="default" fontSize="lg" fontWeight="strong">
                                    {user.displayName}
                                </Text>
                            )}
                            {userId && user.ensAddress && (
                                <EnsBadge userId={userId} ensAddress={user.ensAddress} />
                            )}
                            <Text color="default">@{user.username}</Text>
                        </>
                    )}
                    <UserWalletContent abstractAccountAddress={abstractAccountAddress} />
                </Stack>
            )}

            {user && user.memberOf && (
                <Stack
                    horizontal
                    gap
                    paddingY="sm"
                    paddingX="lg"
                    background="level2"
                    rounded="sm"
                    alignItems="center"
                >
                    <MutualTowns user={user} />
                </Stack>
            )}

            {(canEdit || (userBio && userBio !== '')) && (
                <Stack grow gap>
                    <EditModeContainer
                        inputId={InputId.Bio}
                        initialValue={userBio}
                        canEdit={canEdit}
                        onSave={onSaveItem}
                    >
                        {({
                            editMenu,
                            value,
                            isEditing,
                            isSaving,
                            error,
                            errorComponent,
                            onChange,
                            handleEdit,
                        }) => {
                            return (
                                <Stack grow padding gap background="level2" rounded="sm">
                                    <Stack horizontal>
                                        <Stack
                                            gap
                                            grow
                                            onClick={canEdit && !isEditing ? handleEdit : undefined}
                                        >
                                            <Paragraph strong color="default">
                                                Bio
                                            </Paragraph>
                                        </Stack>
                                        <Box>{editMenu}</Box>
                                    </Stack>
                                    <Stack gap="sm">
                                        {!isEditing ? (
                                            <Paragraph color="gray2">
                                                {userBio ?? `no biography just yet`}
                                            </Paragraph>
                                        ) : (
                                            <TextArea
                                                autoFocus
                                                key={error ? 'errored' : 'not-errored'}
                                                tone={error ? 'error' : undefined}
                                                paddingY="md"
                                                background="level2"
                                                defaultValue={value}
                                                height="100"
                                                maxLength={160}
                                                disabled={isSaving}
                                                onChange={onChange}
                                            />
                                        )}
                                        {errorComponent}
                                    </Stack>
                                </Stack>
                            )
                        }}
                    </EditModeContainer>
                    {showNftProfilePicture && userId && (
                        <NftProfilePicture
                            userId={userId}
                            currentNft={user?.nft}
                            onHide={() => setShowNftProfilePicture(false)}
                        />
                    )}
                    {!!info?.length &&
                        info.map((n) => (
                            <>
                                <Paragraph strong>{n.title}</Paragraph>
                                <Paragraph color="gray2">{n.content}</Paragraph>
                            </>
                        ))}
                </Stack>
            )}
        </Stack>
    )
}

type EditRowProps = {
    inputId: string
    initialValue: string | undefined
    children: (renderOptions: EditRowRenderProps) => JSX.Element
    onSave: (id: string, content: undefined | string) => Promise<void> | void
    canEdit?: boolean
}

type EditRowRenderProps = {
    editMenu: JSX.Element | undefined
    value: string | undefined
    isEditing: boolean
    isSaving: boolean
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
    handleSave: () => void
    handleEdit: () => void
    error: Error | undefined
    errorComponent: JSX.Element | undefined
}

// TODO: refactor
export const EditModeContainer = (props: EditRowProps) => {
    const [value, setValue] = useState<string | undefined>(props.initialValue)
    const [isEditing, setIsEditing] = React.useState(false)
    const [error, setError] = useState<Error | undefined>()

    const handleEdit = useEvent(() => {
        setIsEditing((e) => !e)
    })

    const [isSaving, setIsSaving] = useState(false)

    const handleSave = useEvent(() => {
        const save = async () => {
            setIsSaving(true)
            try {
                await props.onSave(props.inputId, value)
                setIsEditing(false)
            } catch (e: unknown) {
                console.error('error while saving UserProfile', e)
                setError(e as Error)
            }
            setIsSaving(false)
        }

        save()
    })

    useEffect(() => {
        if (!isEditing) {
            setError(undefined)
            setValue(props.initialValue)
        }
    }, [isEditing, props.initialValue])

    useEffect(() => {
        value
        setError(undefined)
    }, [value])

    const onChange = useEvent((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setValue(e.target.value)
    })

    const editMenu = useMemo(
        () =>
            !props.canEdit ? undefined : (
                <Box horizontal gap="sm" shrink={false}>
                    {isSaving ? (
                        <Stack horizontal gap="sm" alignItems="center" color="positive">
                            <Paragraph size="sm">Updating</Paragraph>
                            <Spinner square="square_xxs" />
                        </Stack>
                    ) : (
                        <>
                            <TextButton onClick={handleEdit}>
                                {!isEditing ? 'Edit' : 'Cancel'}
                            </TextButton>
                            {isEditing && (
                                <TextButton color="default" onClick={handleSave}>
                                    Save
                                </TextButton>
                            )}
                        </>
                    )}
                </Box>
            ),
        [handleEdit, handleSave, isEditing, isSaving, props.canEdit],
    )

    const errorComponent = useMemo(() => {
        return error ? (
            <Box paddingY="sm">
                <Paragraph color="error" size="sm">
                    {error?.message}
                </Paragraph>
            </Box>
        ) : undefined
    }, [error])

    return (
        <>
            <Stack
                horizontal
                justifyContent="spaceBetween"
                alignItems="baseline"
                position="relative"
            >
                {props.children({
                    editMenu,
                    isEditing,
                    isSaving,
                    onChange,
                    handleSave,
                    handleEdit,
                    errorComponent,
                    error,
                    value,
                })}
            </Stack>
        </>
    )
}

const NftProfilePicture = (props: { onHide: () => void; userId: string; currentNft?: Nft }) => {
    const { onHide, userId, currentNft } = props

    const { isTouch } = useDevice()
    const { nfts, isFetching } = useNfts(userId)
    const { setNft } = useSetNftProfilePicture()
    const streamId = useCurrentStreamID()

    const displayableNfts = useMemo(() => {
        if (!nfts) {
            return []
        }
        return nfts
            .filter(isDefined)
            .filter((nft) => isDefined(nft.data.image?.cachedUrl))
            .filter((nft) => isDefined(nft.data.displayNft?.tokenId))
            .map((nft) => {
                return {
                    chainId: nft.chainId,
                    image: nft.data.image,
                    address: nft.data.address,
                    tokenId: nft.data.displayNft?.tokenId ?? '',
                }
            })
    }, [nfts])

    const onSelectNft = useCallback(
        (tokenId: string, contractAddress: string, chainId: number) => {
            if (!streamId) {
                return
            }
            setNft(streamId, tokenId, chainId, contractAddress)
        },
        [setNft, streamId],
    )

    const { openPanel } = usePanelActions()
    const onViewLinkedWalletsClick = useCallback(() => {
        openPanel(CHANNEL_INFO_PARAMS.WALLETS)
    }, [openPanel])

    return (
        <ModalContainer onHide={onHide}>
            <Stack width="100%" maxHeight="400" maxWidth={isTouch ? '100%' : '600'} gap="sm">
                <Box position="relative">
                    <IconButton position="topRight" icon="close" onClick={onHide} />
                </Box>
                <Stack gap alignItems="center" paddingTop="lg">
                    <Text size="lg" fontWeight="strong" color="default">
                        NFT Profile Picture
                    </Text>
                </Stack>

                {isFetching && (
                    <Box padding>
                        <ButtonSpinner />
                    </Box>
                )}
                {!isFetching && displayableNfts.length === 0 && (
                    <Box grow centerContent padding>
                        <Text fontWeight="medium">No Nfts</Text>
                    </Box>
                )}
                <Stack horizontal centerContent scroll flexWrap="wrap" width="100%">
                    {displayableNfts.map((nft) => (
                        <Box
                            padding
                            key={nft.address}
                            onClick={() => {
                                onSelectNft(nft.tokenId, nft.address, nft.chainId)
                            }}
                        >
                            <Box
                                hoverable
                                width="x8"
                                height="x8"
                                background="level2"
                                rounded="xs"
                                border={{
                                    default:
                                        nft.tokenId == currentNft?.tokenId &&
                                        nft.address == currentNft.contractAddress
                                            ? 'strong'
                                            : 'none',
                                    hover: 'level4',
                                }}
                                style={{
                                    backgroundImage: `url(${nft.image?.cachedUrl})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                }}
                            />
                        </Box>
                    ))}
                </Stack>
            </Stack>
            <Box shrink={false}>
                <Button tone="level2" width="100%" onClick={onViewLinkedWalletsClick}>
                    View Linked Wallets
                </Button>
            </Box>
        </ModalContainer>
    )
}
