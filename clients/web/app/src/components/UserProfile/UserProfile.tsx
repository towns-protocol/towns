import { Nft, useMemberOf, useUserLookup } from 'use-towns-client'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useEvent } from 'react-use-event-hook'
import { isDefined } from '@river-build/sdk'
import { AnimatePresence, MotionConfig } from 'framer-motion'
import {
    Box,
    Button,
    Divider,
    FormRender,
    Icon,
    IconButton,
    MotionIcon,
    Paragraph,
    Stack,
    Text,
    TextButton,
} from '@ui'
import { useSetUserBio } from 'hooks/useUserBio'
import { TextArea } from 'ui/components/TextArea/TextArea'
import { Spinner } from '@components/Spinner'
import { LargeUploadImageTemplate } from '@components/UploadImage/LargeUploadImageTemplate'
import { Avatar } from '@components/Avatar/Avatar'
import {
    SetUsernameDisplayName,
    useCurrentStreamID,
} from '@components/SetUsernameDisplayName/SetUsernameDisplayName'
import { MutualTowns } from '@components/MutualTowns/MutualTowns'
import { EnsBadge } from '@components/EnsBadge/EnsBadge'
import { useNfts, useResolveNft } from 'hooks/useNfts'
import { useSetNftProfilePicture } from 'hooks/useSetNftProfilePicture'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { CHANNEL_INFO_PARAMS } from 'routes'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { useDevice } from 'hooks/useDevice'
import { VerifiedOnChainAssetTooltip } from '@components/VerifiedOnChainAssetTooltip/VerifiedOnChainAssetTooltip'
import { useUploadAttachment } from '@components/MediaDropContext/useUploadAttachment'
import { UploadImageRequestConfig } from '@components/UploadImage/useOnImageChangeEvent'
import { UserRoles } from '@components/UserRoles/UserRoles'
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
    const memberOf = useMemberOf(userId)
    const user = useUserLookup(userId ?? '')
    const [showNftProfilePicture, setShowNftProfilePicture] = useState(false)
    const [isRemovingNft, setIsRemovingNft] = useState(false)

    const { setNft } = useSetNftProfilePicture()
    const streamId = useCurrentStreamID()
    const onClearNft = useCallback(
        (event: React.MouseEvent) => {
            if (!streamId) {
                return
            }
            event.stopPropagation()
            event.preventDefault()
            setIsRemovingNft(true)
            setNft(streamId, '', 0, '')
        },
        [setNft, streamId],
    )
    const resolvedNft = useResolveNft({ walletAddress: userId ?? '', info: user?.nft })
    const { mutateAsync: mutateAsyncBio } = useSetUserBio(userId)

    const hasNftProfilePicture = useMemo(() => !!user?.nft, [user?.nft])

    useEffect(() => {
        if (!hasNftProfilePicture) {
            setIsRemovingNft(false)
        }
    }, [hasNftProfilePicture])

    const nftUrl = useMemo(() => {
        if (!resolvedNft) {
            return
        }

        if (resolvedNft.image.thumbnail) {
            return resolvedNft.image.thumbnail
        }

        if (resolvedNft.image.gateway) {
            return resolvedNft.image.gateway
        }
    }, [resolvedNft])

    const resourceId = useMemo(() => {
        if (!userId) {
            return ''
        }
        if (nftUrl) {
            return userId + '_' + nftUrl
        }
        return userId
    }, [userId, nftUrl])

    const { uploadUserProfileImageToStream } = useUploadAttachment()
    const isUploadingUserProfileImageRef = useRef<boolean>(false)
    const onUploadUserProfileImage = useCallback(
        async ({ file, id: userId, type, setProgress }: UploadImageRequestConfig) => {
            if (isUploadingUserProfileImageRef.current || !userId) {
                return
            }
            if (type === 'avatar') {
                isUploadingUserProfileImageRef.current = true
                try {
                    await uploadUserProfileImageToStream(userId, file, setProgress)
                } finally {
                    isUploadingUserProfileImageRef.current = false
                }
            }
        },
        [uploadUserProfileImageToStream],
    )

    const onSaveItem = useEvent((id: string, content: undefined | string) => {
        switch (id) {
            case InputId.Bio: {
                if (!abstractAccountAddress) {
                    throw new Error('no user address provided')
                }

                content = content?.trim() ?? ''

                return mutateAsyncBio(content)
            }
        }
    })

    return (
        <Stack grow gap paddingBottom="none" position="relative">
            <Stack centerContent={center}>
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
                            dataTestId="user-avatar-upload"
                            onUploadImage={onUploadUserProfileImage}
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

                {(resolvedNft || canEdit) && (
                    <Stack
                        horizontal
                        grow
                        hoverable
                        paddingX
                        paddingY="sm"
                        gap="sm"
                        rounded="full"
                        background="level2"
                        width="100%"
                        alignItems="center"
                        cursor="pointer"
                        tooltip={<VerifiedOnChainAssetTooltip userId={userId} />}
                        onClick={() => setShowNftProfilePicture(true)}
                    >
                        <Icon type="verifiedEnsName" size="square_sm" />
                        {resolvedNft ? (
                            <>
                                <Text size="sm" fontWeight="medium">
                                    {resolvedNft.title}
                                </Text>
                            </>
                        ) : (
                            <Text fontWeight="medium" fontSize="sm">
                                Add NFT Profile Picture
                            </Text>
                        )}

                        <Box grow />

                        {canEdit && hasNftProfilePicture ? (
                            isRemovingNft ? (
                                <Box padding="xs">
                                    <ButtonSpinner square="square_xs" />
                                </Box>
                            ) : (
                                <IconButton
                                    icon="close"
                                    size="square_xs"
                                    color="default"
                                    onClick={onClearNft}
                                />
                            )
                        ) : (
                            <></>
                        )}
                    </Stack>
                )}
            </Stack>
            {canEdit ? (
                <>{streamId && <SetUsernameDisplayName streamId={streamId} />}</>
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
                            {user.username?.length > 1 && (
                                <Text color="default">@{user.username}</Text>
                            )}
                        </>
                    )}
                    <UserWalletContent abstractAccountAddress={abstractAccountAddress} />
                </Stack>
            )}

            {memberOf && (
                <Stack
                    horizontal
                    gap
                    paddingY="sm"
                    paddingX="lg"
                    background="level2"
                    rounded="sm"
                    alignItems="center"
                >
                    <MutualTowns userId={userId} />
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
                            streamId={streamId}
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
            <UserRoles userId={userId} />
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

const NftProfilePicture = (props: {
    onHide: () => void
    userId: string
    streamId: string | undefined
    currentNft?: Nft
}) => {
    const { onHide, userId, streamId, currentNft } = props

    const { isTouch } = useDevice()
    const { nfts, isFetching } = useNfts({ walletAddress: userId })
    const { setNft } = useSetNftProfilePicture()
    const { openPanel } = usePanelActions()
    const [selectedNft, setSelectedNft] = useState<Nft | undefined>(currentNft)
    const [pendingSaveNft, setPendingSaveNft] = useState<Nft | undefined>(undefined)

    const isNftSaved = useMemo(
        () =>
            currentNft?.contractAddress &&
            currentNft?.contractAddress == pendingSaveNft?.contractAddress,
        [currentNft?.contractAddress, pendingSaveNft?.contractAddress],
    )

    useEffect(() => {
        if (isNftSaved) {
            setPendingSaveNft(undefined)
            onHide()
        }
    }, [isNftSaved, onHide, pendingSaveNft])

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
                    contractAddress: nft.data.address,
                    tokenId: nft.data.displayNft?.tokenId ?? '',
                } as const
            })
    }, [nfts])

    const saveNft = useCallback(() => {
        if (!selectedNft || !streamId) {
            return
        }
        setNft(streamId, selectedNft.tokenId, selectedNft.chainId, selectedNft.contractAddress)
        setPendingSaveNft(selectedNft)
    }, [selectedNft, streamId, setNft])

    const saveInProgress = !!pendingSaveNft
    const saveButtonEnabled =
        !saveInProgress && !isNftSaved && selectedNft?.tokenId != currentNft?.tokenId

    const onViewLinkedWalletsClick = useCallback(() => {
        onHide()
        openPanel(CHANNEL_INFO_PARAMS.WALLETS)
    }, [onHide, openPanel])

    const hasNfts = displayableNfts.length > 0 && !isFetching

    return (
        <ModalContainer asSheet maxWidth="600" onHide={onHide}>
            {!isTouch && (
                <Box position="relative">
                    <IconButton position="topRight" icon="close" onClick={onHide} />
                </Box>
            )}
            <Stack gap paddingTop={isTouch ? 'md' : 'lg'}>
                <Stack gap alignItems="center">
                    <Text size="lg" fontWeight="strong" color="default">
                        NFT Profile Picture
                    </Text>
                </Stack>

                {isFetching && (
                    <Box padding>
                        <ButtonSpinner />
                    </Box>
                )}
                {!hasNfts && (
                    <Box grow centerContent padding>
                        <Text textAlign="center" color="gray2">
                            No NFTs were found in your wallets.
                            <br /> Link a new wallet to set a verified NFT as your profile picture.
                        </Text>
                    </Box>
                )}
                <Stack
                    horizontal
                    centerContent
                    scrollbars
                    scroll
                    gap
                    flexWrap="wrap"
                    width="100%"
                    maxHeight={isTouch ? '50vh' : '300'}
                >
                    {displayableNfts.map((nft) => (
                        <Box
                            hoverable
                            key={nft.contractAddress}
                            position="relative"
                            width="x12"
                            height="x12"
                            background="level2"
                            rounded="xs"
                            border={{
                                default:
                                    nft.tokenId == selectedNft?.tokenId &&
                                    nft.contractAddress == selectedNft.contractAddress
                                        ? 'positive'
                                        : 'none',
                                hover: 'positive',
                            }}
                            style={{
                                backgroundImage: `url(${nft.image?.cachedUrl})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                            }}
                            onClick={() => setSelectedNft(nft)}
                        >
                            <AnimatePresence>
                                <MotionConfig transition={{ ease: 'easeOut', duration: 0.2 }}>
                                    {nft.tokenId == selectedNft?.tokenId &&
                                        nft.contractAddress == selectedNft.contractAddress && (
                                            <>
                                                <MotionIcon
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    zIndex="uiAbove"
                                                    square="square_xxs"
                                                    position="absolute"
                                                    top="xxs"
                                                    right="xxs"
                                                    type="verifiedEnsName"
                                                    style={{
                                                        strokeWidth: 1,
                                                        stroke: 'black',
                                                    }}
                                                />
                                                <MotionIcon
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    square="square_xxs"
                                                    position="absolute"
                                                    top="xxs"
                                                    right="xxs"
                                                    type="verifiedEnsName"
                                                    style={{
                                                        stroke: 'black',
                                                        strokeWidth: 2,
                                                        filter: 'brightness(0%)',
                                                    }}
                                                />
                                            </>
                                        )}
                                </MotionConfig>
                            </AnimatePresence>
                        </Box>
                    ))}
                </Stack>
                <Stack gap shrink={false}>
                    {hasNfts && (
                        <>
                            <Button
                                tone={saveButtonEnabled ? 'cta1' : 'level2'}
                                width="100%"
                                disabled={!saveButtonEnabled}
                                onClick={saveNft}
                            >
                                {pendingSaveNft ? <ButtonSpinner /> : 'Set as Profile Picture'}
                            </Button>
                            <Stack horizontal gap="sm">
                                <Divider />
                                <Text shrink={false} color="gray2" fontSize="sm">
                                    Add more verified NFT profile pictures:
                                </Text>
                                <Divider />
                            </Stack>
                        </>
                    )}
                    <Button
                        tone={hasNfts ? 'level2' : 'cta1'}
                        width="100%"
                        onClick={onViewLinkedWalletsClick}
                    >
                        Link a Wallet
                    </Button>
                </Stack>
            </Stack>
        </ModalContainer>
    )
}
