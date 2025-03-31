import React, { MouseEventHandler, useCallback, useContext, useState } from 'react'
import {
    useChannelSettings,
    useContractSpaceInfo,
    useGetRootKeyFromLinkedWallet,
    useTownsClient,
    useUserLookup,
} from 'use-towns-client'
import { useNavigate } from 'react-router-dom'
import { Image } from '@unfurl-worker/types'
import {
    Attachment,
    ChunkedMediaAttachment,
    EmbeddedMessageAttachment,
    MessageType,
    TickerAttachment,
    UnfurledLinkAttachment,
} from '@towns-protocol/sdk'
import { isUrl } from 'utils/isUrl'
import { ChunkedFile } from '@components/ChunkedFile/ChunkedFile'
import { EmbeddedMessage } from '@components/EmbeddedMessageAttachement/EmbeddedMessage'
import { Box, BoxProps, Heading, Icon, Paragraph, Stack, Text } from '@ui'
import { isImageMimeType, isMediaMimeType, isVideoMimeType } from 'utils/isMediaMimeType'
import { getTownParamsFromUrl } from 'utils/getTownParamsFromUrl'
import { LoadingUnfurledLinkAttachment } from 'hooks/useExtractInternalLinks'
import { InteractiveSpaceIcon } from '@components/SpaceIcon'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { Avatar } from '@components/Avatar/Avatar'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { useReadableMembershipInfo } from '@components/TownPageLayout/useReadableMembershipInfo'
import { getPriceText } from '@components/TownPageLayout/townPageUtils'
import { useEntitlements } from 'hooks/useEntitlements'
import { PATHS } from 'routes'
import { ErrorBoundary } from '@components/ErrorBoundary/ErrorBoundary'
import { addressFromSpaceId } from 'ui/utils/utils'
import { minterRoleId } from '@components/SpaceSettingsPanel/rolePermissions.const'
import { useSizeContext } from 'ui/hooks/useSizeContext'
import { Ticker } from '@components/TradingChart/Ticker'
import { useMessageEditContext } from '@components/MessageTimeIineItem/items/MessageEditContext'
import { useDevice } from 'hooks/useDevice'
import {
    EmbeddedAttachmentsContext,
    MessageAttachmentPresentationContext,
} from './MessageAttachmentsContext'

const emptyArray: never[] = []

export const MessageAttachments = (props: {
    attachments: Attachment[] | undefined
    onClick?: (e: React.MouseEvent) => void
    onAttachmentClick?: (streamId: string) => void
    eventId: string | undefined
    threadParentId?: string
}) => {
    const { onAttachmentClick, onClick, eventId, threadParentId } = props

    const filteredAttachments = useMessageEditContext()?.removedAttachmentIds

    const attachments = filteredAttachments
        ? props.attachments?.filter((a) => !filteredAttachments.includes(a.id))
        : props.attachments

    // prevent recursive rendering of message attachments
    const isMessageAttachementContext = useContext(
        EmbeddedAttachmentsContext,
    )?.isMessageAttachementContext

    const isWideContainer = useSizeContext().moreThan(420)

    if (!attachments) {
        return null
    }

    const mediaAttachments = attachments.filter(isMediaAttachment)
    const fileAttachments = attachments.filter(isRegularFileAttachment)
    const unfurledLinkAttachments = attachments.filter(isUnfurledLinkAttachment)
    const tickerAttachments = attachments.filter(isTickerAttachment)
    const messageAttachments = isMessageAttachementContext
        ? emptyArray
        : attachments?.filter(isEmbeddedMessageAttachment)

    return (
        <>
            {mediaAttachments.length > 0 && (
                <MessageAttachmentPresentationContext.Provider
                    value={{
                        isGridContext: mediaAttachments.length > 1 && isWideContainer,
                        gridRowHeight: 250,
                    }}
                >
                    <Box horizontal flexWrap="wrap" gap="sm" onClick={onClick}>
                        {mediaAttachments.map((attachment) => (
                            <EditAttachmentContainer
                                key={attachment.streamId}
                                attachmentId={attachment.id}
                            >
                                <ChunkedFile
                                    mimetype={attachment.info.mimetype}
                                    width={attachment.info.widthPixels}
                                    height={attachment.info.heightPixels}
                                    filename={attachment.info.filename}
                                    streamId={attachment.streamId}
                                    iv={attachment.encryption.iv}
                                    secretKey={attachment.encryption.secretKey}
                                    thumbnail={attachment.thumbnail?.content}
                                    onClick={
                                        onAttachmentClick
                                            ? (e) => {
                                                  e.preventDefault()
                                                  e.stopPropagation()
                                                  onAttachmentClick?.(attachment.id)
                                              }
                                            : undefined
                                    }
                                />
                            </EditAttachmentContainer>
                        ))}
                    </Box>
                </MessageAttachmentPresentationContext.Provider>
            )}
            {fileAttachments.length > 0 && (
                <Stack horizontal gap="sm" flexWrap="wrap">
                    {fileAttachments.map((attachment) => (
                        <EditAttachmentContainer
                            key={attachment.streamId}
                            attachmentId={attachment.id}
                        >
                            <ChunkedFile
                                mimetype={attachment.info.mimetype}
                                width={attachment.info.widthPixels}
                                height={attachment.info.heightPixels}
                                filename={attachment.info.filename}
                                streamId={attachment.streamId}
                                iv={attachment.encryption.iv}
                                secretKey={attachment.encryption.secretKey}
                                onClick={
                                    onAttachmentClick
                                        ? (e) => {
                                              e.preventDefault()
                                              e.stopPropagation()
                                              onAttachmentClick?.(attachment.id)
                                          }
                                        : undefined
                                }
                            />
                        </EditAttachmentContainer>
                    ))}
                </Stack>
            )}

            {messageAttachments?.length > 0 && (
                <Stack gap="sm">
                    {messageAttachments.map((attachment) => (
                        <EditAttachmentContainer key={attachment.id} attachmentId={attachment.id}>
                            <EmbeddedMessageContainer
                                attachment={attachment}
                                eventId={eventId}
                                onAttachmentClick={onAttachmentClick}
                                onClick={onClick}
                            />
                        </EditAttachmentContainer>
                    ))}
                </Stack>
            )}
            {unfurledLinkAttachments.length > 0 && (
                <MessageAttachmentPresentationContext.Provider
                    value={{
                        isGridContext: unfurledLinkAttachments.length > 1 && isWideContainer,
                        gridRowHeight: 250,
                    }}
                >
                    <Box horizontal gap="sm" flexWrap="wrap" width="100%">
                        {unfurledLinkAttachments.map((attachment) => (
                            <EditAttachmentContainer
                                key={attachment.id}
                                attachmentId={attachment.id}
                            >
                                <UnfurledLinkAttachmentContainer attachment={attachment} />
                            </EditAttachmentContainer>
                        ))}
                    </Box>
                </MessageAttachmentPresentationContext.Provider>
            )}
            {/* show ticker attachments in vertical stack */}
            {tickerAttachments.length > 0 && (
                <Stack>
                    {tickerAttachments.slice(0, 1).map((ticker) => {
                        return (
                            <Box key={ticker.id} gap="lg">
                                <Ticker
                                    attachment={ticker}
                                    eventId={eventId}
                                    threadParentId={threadParentId}
                                />
                            </Box>
                        )
                    })}
                </Stack>
            )}
        </>
    )
}

export function trimMessageBodyLinks(messageBody: string) {
    return messageBody.replace(/(?:https?|ftp):\/\/[\n\S]+/g, '...')
}

export function isMediaAttachment(attachment: Attachment): attachment is ChunkedMediaAttachment {
    return attachment.type === 'chunked_media' && isMediaMimeType(attachment.info.mimetype)
}

export function isImageAttachment(attachment: Attachment): attachment is ChunkedMediaAttachment {
    return attachment.type === 'chunked_media' && isImageMimeType(attachment.info.mimetype)
}

export function isVideoAttachment(attachment: Attachment): attachment is ChunkedMediaAttachment {
    return attachment.type === 'chunked_media' && isVideoMimeType(attachment.info.mimetype)
}

function isRegularFileAttachment(attachment: Attachment): attachment is ChunkedMediaAttachment {
    return attachment.type === 'chunked_media' && !isMediaMimeType(attachment.info.mimetype)
}

function isUnfurledLinkAttachment(attachment: Attachment): attachment is UnfurledLinkAttachment {
    return attachment.type === 'unfurled_link'
}

function isTickerAttachment(attachment: Attachment): attachment is TickerAttachment {
    return attachment.type === 'ticker'
}

export function isEmbeddedMessageAttachment(
    attachment: Attachment,
): attachment is EmbeddedMessageAttachment {
    return attachment.type === 'embedded_message'
}

export function isUrlAttachement(
    attachment: Attachment,
): attachment is UnfurledLinkAttachment | EmbeddedMessageAttachment {
    return isUnfurledLinkAttachment(attachment) || isEmbeddedMessageAttachment(attachment)
}

// need this pattern to avoid circular dependency
const EmbeddedMessageContainer = (props: {
    attachment: EmbeddedMessageAttachment
    onClick?: (e: React.MouseEvent) => void
    onAttachmentClick?: (attachmentId: string) => void
    eventId: string | undefined
}) => {
    const { attachment, eventId } = props
    const attachedMessage =
        attachment.channelMessageEvent?.content?.msgType === MessageType.Text
            ? attachment.channelMessageEvent
            : undefined

    if (!attachedMessage) {
        return null
    }

    return (
        <EmbeddedMessage
            attachment={attachment}
            attachmentChildren={
                <MessageAttachments
                    attachments={attachment.channelMessageEvent?.attachments}
                    eventId={eventId}
                    onAttachmentClick={props.onAttachmentClick}
                    onClick={props.onClick}
                />
            }
        />
    )
}

const UnfurledLinkAttachmentContainer = (props: {
    attachment: UnfurledLinkAttachment | LoadingUnfurledLinkAttachment
}) => {
    const { attachment } = props
    const { url } = attachment
    const townData = getTownParamsFromUrl(url)

    return (
        <ErrorBoundary FallbackComponent={() => <UnfurlErrorContainer url={url} />}>
            {townData?.townId && townData?.townPath ? (
                <TownsContent {...townData} />
            ) : (
                <Box
                    as="a"
                    href={url}
                    rel="noopener noreferrer"
                    target="_blank"
                    position="relative"
                >
                    <GenericContent {...attachment} />
                </Box>
            )}
        </ErrorBoundary>
    )
}

const TownsContent = (props: { townPath: string; townId: string; channelId?: string }) => {
    const { townPath, townId } = props

    const channelId = townPath.match(
        new RegExp(`/${addressFromSpaceId(townId)}/${PATHS.CHANNELS}/([0-9a-z]{64})`),
    )?.[1]

    const { data: spaceInfo } = useContractSpaceInfo(townId)
    const { data: memberInfo, isLoading } = useReadableMembershipInfo(townId)
    const { data: entitlements } = useEntitlements(townId, minterRoleId)

    const priceText = getPriceText(memberInfo?.price, memberInfo?.remainingFreeSupply)

    const navigate = useNavigate()

    const onClick = useCallback(() => {
        navigate(townPath, { state: { fromLink: true } })
    }, [navigate, townPath])

    const { channelSettings } = useChannelSettings(townId, channelId ?? '')

    return (
        <LinkContainer
            horizontal
            hoverable
            padding="sm"
            minWidth={{ mobile: '300', default: '150' }}
            gap="sm"
            maxWidth={{ mobile: '300', default: '400' }}
            width="100%"
            cursor="pointer"
            onClick={onClick}
        >
            <InteractiveSpaceIcon
                reduceMotion
                spaceId={townId}
                address={spaceInfo?.address}
                size="xs"
                spaceName={spaceInfo?.name}
            />
            <Box gap="paragraph" paddingY="sm" paddingRight="sm" overflow="hidden">
                <Stack gap="paragraph">
                    {!!channelSettings && (
                        <Paragraph strong size="lg" color="default" whiteSpace="normal">
                            #{channelSettings?.name}
                        </Paragraph>
                    )}
                    <Heading level={3} color="default" whiteSpace="normal">
                        {spaceInfo?.name}
                    </Heading>
                    {spaceInfo?.shortDescription && (
                        <Paragraph color="gray2">{spaceInfo?.shortDescription}</Paragraph>
                    )}
                </Stack>
                {!!spaceInfo?.longDescription && (
                    <Stack>
                        <Paragraph color="gray2" size="sm">
                            {spaceInfo?.longDescription}
                        </Paragraph>
                    </Stack>
                )}
                {!!spaceInfo?.owner && (
                    <Stack horizontal gap="sm" alignItems="center">
                        <Paragraph size="sm" color="gray2">
                            By
                        </Paragraph>
                        <OwnerPill userId={spaceInfo?.owner} />
                    </Stack>
                )}
                {!isLoading && (
                    <Stack horizontal flexWrap="wrap" gap="sm">
                        {(memberInfo?.totalSupply ?? 0 > 1) && (
                            <Pill>
                                {memberInfo?.totalSupply} Member
                                {(memberInfo?.totalSupply ?? 0) > 1 ? `s` : ``}
                            </Pill>
                        )}
                        {priceText && (
                            <Pill>
                                {priceText?.value}
                                {parseFloat(priceText.value) > 0 ? ' ETH' : ''}
                            </Pill>
                        )}
                        {entitlements?.hasEntitlements && (
                            <Pill position="relative" alignSelf="start">
                                Gated
                            </Pill>
                        )}
                    </Stack>
                )}
            </Box>
        </LinkContainer>
    )
}

const OwnerPill = (props: { userId: string | undefined }) => {
    const { client } = useTownsClient()

    const isAccountAbstractionEnabled = client?.isAccountAbstractionEnabled()
    const { data: rootKeyAddress } = useGetRootKeyFromLinkedWallet({
        walletAddress: props.userId,
    })

    const userId = isAccountAbstractionEnabled ? rootKeyAddress : props.userId
    const user = useUserLookup(userId || '')

    const { openPanel } = usePanelActions()
    const onOwnerClick: MouseEventHandler = useCallback(
        (e) => {
            e.preventDefault()
            e.stopPropagation()
            openPanel('profile', { profileId: user.userId })
        },
        [openPanel, user.userId],
    )
    if (!userId) {
        return null
    }
    return (
        <Box
            horizontal
            centerContent
            hoverable
            gap="sm"
            background="lightHover"
            padding="xs"
            paddingRight="paragraph"
            borderRadius="lg"
            onClick={onOwnerClick}
        >
            <Avatar userId={userId} size="avatar_sm" />
            <Paragraph fontWeight="medium" size="sm" color="default">
                {getPrettyDisplayName(user)}
            </Paragraph>
        </Box>
    )
}

const Pill = ({ children, ...props }: BoxProps) => (
    <Box
        background="lightHover"
        borderRadius="md"
        paddingY="sm"
        paddingX="paragraph"
        {...props}
        justifyContent="center"
        height="height_md"
        overflow="hidden"
    >
        <Text truncate size="sm" color="gray1" whiteSpace="nowrap">
            {children}
        </Text>
    </Box>
)

const SKIP_PROFILE_IMAGES = false

function isProfileImage(url?: string) {
    return !!(url?.match('profile_image') || url?.match('avatars.githubusercontent.com'))
}

function validateImage(image?: Image): image is Image {
    if (!image?.url || !image?.height) {
        return false
    }
    if (SKIP_PROFILE_IMAGES && isProfileImage(image.url)) {
        return false
    }
    return true
}

const GenericContent = (props: {
    image?: Image
    title?: string
    description?: string
    url?: string
}) => {
    const [isImageLoaded, setIsImageLoaded] = useState(false)
    const { containerHeight, aspectRatio: containerAspectRatio } = useSizeContext()
    const { isGridContext: isGrid } = useContext(MessageAttachmentPresentationContext)

    const { image } = props

    const aspectRatio =
        image?.width && image?.height ? `${image?.width}/${image?.height}` : undefined

    return (
        <LinkContainer>
            {!isImageLoaded && validateImage(props.image) ? (
                <Box
                    roundedTop="md"
                    as="img"
                    src={props.image.url}
                    alt={props.title}
                    objectFit="cover"
                    objectPosition="center"
                    style={{
                        width: '100%',
                        aspectRatio: aspectRatio,
                        maxHeight: isGrid
                            ? 150
                            : `min(${!isProfileImage(image?.url) ? '290px' : '150px'}, ${
                                  containerAspectRatio > 1
                                      ? containerHeight * 0.5
                                      : containerHeight * 0.5
                              }px)`,
                    }}
                    onError={() => setIsImageLoaded(true)}
                />
            ) : isGrid ? (
                <Box
                    centerContent
                    roundedTop="md"
                    width="100%"
                    height="150"
                    background="level2"
                    onError={() => setIsImageLoaded(true)}
                />
            ) : (
                <></>
            )}
            <Stack padding gap="paragraph">
                {props.title && !isUrl(props.title) && (
                    <Paragraph
                        style={{
                            overflowWrap: 'break-word',
                        }}
                    >
                        {props.title}
                    </Paragraph>
                )}
                {props.description && (
                    <Text>
                        <Text
                            size="sm"
                            color="gray2"
                            style={{
                                display: '-webkit-box',
                                WebkitLineClamp: isGrid ? 1 : 5,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                            }}
                        >
                            {props.description}
                        </Text>
                    </Text>
                )}
                <Box
                    hoverable
                    color={{ hover: 'cta2', default: 'gray1' }}
                    maxWidth="100%"
                    paddingBottom="xs"
                >
                    <Text truncate fontWeight="medium" size="sm">
                        {props.url?.match(/^https?:\/\//)
                            ? new URL(props.url).hostname
                            : 'invalid host'}
                    </Text>
                </Box>
            </Stack>
        </LinkContainer>
    )
}

const LinkContainer = (props: BoxProps) => (
    <Box background="level2" borderRadius="md" maxWidth="300" {...props} />
)

const UnfurlErrorContainer = (props: { url: string }) => (
    <Box gap="xs">
        <Box as="a" color="cta2" href={props.url} rel="noopener noreferrer" target="_blank">
            {props.url}
        </Box>
        <Box horizontal gap="xs" color="gray2" alignItems="center">
            <Icon type="alert" size="square_xs" />
            <Text size="sm" color="gray2">
                Error loading link content
            </Text>
        </Box>
    </Box>
)

const EditAttachmentContainer = (
    props: {
        children: React.ReactNode
        attachmentId: string
    } & BoxProps,
) => {
    const { children, attachmentId, ...boxProps } = props
    const removeAttachment = useMessageEditContext()?.removeAttachmentId

    const { isTouch } = useDevice()
    const [hovering, setHovering] = useState(isTouch)

    return (
        <Box
            position="relative"
            {...boxProps}
            onMouseOver={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
        >
            {children}
            {removeAttachment && hovering && (
                <RemoveAttachmentButton onClick={() => removeAttachment?.(attachmentId)} />
            )}
        </Box>
    )
}

const RemoveAttachmentButton = (props: { onClick: () => void }) => {
    const onClick = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault()
            e.stopPropagation()
            props.onClick()
        },
        [props],
    )
    return (
        <Box padding="sm" position="absolute" right="none" cursor="pointer" onClick={onClick}>
            <Box hoverable padding="xxs" background="level2" borderRadius="full">
                <Icon type="close" size="square_xxs" boxShadow="card" />
            </Box>
        </Box>
    )
}
