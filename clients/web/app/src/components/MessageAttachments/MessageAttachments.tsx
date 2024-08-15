import React, { MouseEventHandler, useCallback, useContext } from 'react'
import {
    Attachment,
    ChunkedMediaAttachment,
    EmbeddedMessageAttachment,
    MessageType,
    UnfurledLinkAttachment,
    useChannelSettings,
    useContractSpaceInfo,
    useGetRootKeyFromLinkedWallet,
    useTownsClient,
    useUserLookup,
} from 'use-towns-client'
import { useNavigate } from 'react-router-dom'
import { Image } from '@unfurl-worker/types'
import { isUrl } from 'utils/isUrl'
import { ChunkedFile } from '@components/ChunkedFile/ChunkedFile'
import { EmbeddedMessage } from '@components/EmbeddedMessageAttachement/EmbeddedMessage'
import { Box, BoxProps, Heading, Paragraph, Stack, Text } from '@ui'
import { isMediaMimeType } from 'utils/isMediaMimeType'
import { RatioedBackgroundImage } from '@components/RatioedBackgroundImage'
import { getTownParamsFromUrl } from 'utils/getTownParamsFromUrl'
import { LoadingUnfurledLinkAttachment } from 'hooks/useExtractInternalLinks'
import { InteractiveSpaceIcon } from '@components/SpaceIcon'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { Avatar } from '@components/Avatar/Avatar'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { useReadableMembershipInfo } from '@components/TownPageLayout/useReadableMembershipInfo'
import { getPriceText } from '@components/TownPageLayout/townPageUtils'
import { useTokensGatingMembership } from 'hooks/useTokensGatingMembership'
import { SelectedToken } from '@components/TownPageLayout/TokenInfoBox'
import { PATHS } from 'routes'
import { MessageAttachmentsContext } from './MessageAttachmentsContext'

const emptyArray: never[] = []

export const MessageAttachments = (props: {
    attachments: Attachment[] | undefined
    onClick?: (e: React.MouseEvent) => void
    onAttachmentClick?: (streamId: string) => void
}) => {
    const { onAttachmentClick, attachments, onClick } = props

    // prevent recursive rendering of message attachments
    const isMessageAttachementContext =
        useContext(MessageAttachmentsContext)?.isMessageAttachementContext

    if (!attachments) {
        return null
    }

    const mediaAttachments = attachments.filter(isRichMediaAttachment)
    const fileAttachments = attachments.filter(isRegularFileAttachment)
    const unfurledLinkAttachments = attachments.filter(isUnfurledLinkAttachment)
    const messageAttachments = isMessageAttachementContext
        ? emptyArray
        : attachments?.filter(isEmbeddedMessageAttachment)

    return (
        <>
            {mediaAttachments.length > 0 && (
                <Stack horizontal gap="sm" flexWrap="wrap" onClick={onClick}>
                    {mediaAttachments.map((attachment) => (
                        <ChunkedFile
                            key={attachment.streamId}
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
                    ))}
                </Stack>
            )}
            {fileAttachments.length > 0 && (
                <Stack horizontal gap="sm" flexWrap="wrap">
                    {fileAttachments.map((attachment) => (
                        <ChunkedFile
                            key={attachment.streamId}
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
                    ))}
                </Stack>
            )}

            {messageAttachments?.length > 0 && (
                <Stack gap="sm">
                    {messageAttachments.map((attachment) => (
                        <EmbeddedMessageContainer
                            key={attachment.id}
                            attachment={attachment}
                            onAttachmentClick={onAttachmentClick}
                            onClick={onClick}
                        />
                    ))}
                </Stack>
            )}
            {unfurledLinkAttachments.length > 0 && (
                <Box horizontal gap="sm" flexWrap="wrap" width="100%">
                    {unfurledLinkAttachments.map((attachment) => (
                        <UnfurledLinkAttachmentContainer key={attachment.id} {...attachment} />
                    ))}
                </Box>
            )}
        </>
    )
}

export function trimMessageBodyLinks(messageBody: string) {
    return messageBody.replace(/(?:https?|ftp):\/\/[\n\S]+/g, '...')
}

export function isRichMediaAttachment(
    attachment: Attachment,
): attachment is ChunkedMediaAttachment {
    return attachment.type === 'chunked_media' && isMediaMimeType(attachment.info.mimetype)
}

function isRegularFileAttachment(attachment: Attachment): attachment is ChunkedMediaAttachment {
    return attachment.type === 'chunked_media' && !isMediaMimeType(attachment.info.mimetype)
}

function isUnfurledLinkAttachment(attachment: Attachment): attachment is UnfurledLinkAttachment {
    return attachment.type === 'unfurled_link'
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
}) => {
    const { attachment } = props
    const attachedMessage =
        attachment.roomMessageEvent?.content?.msgType === MessageType.Text
            ? attachment.roomMessageEvent
            : undefined

    if (!attachedMessage) {
        return null
    }

    return (
        <EmbeddedMessage
            attachment={attachment}
            attachmentChildren={
                <MessageAttachments
                    attachments={attachment.roomMessageEvent?.attachments}
                    onAttachmentClick={props.onAttachmentClick}
                    onClick={props.onClick}
                />
            }
        />
    )
}

const UnfurledLinkAttachmentContainer = (
    props: UnfurledLinkAttachment | LoadingUnfurledLinkAttachment,
) => {
    const townData = getTownParamsFromUrl(props.url)

    return townData?.townId && townData?.townPath ? (
        <TownsContent {...props} {...townData} />
    ) : (
        <a href={props.url} rel="noopener noreferrer" target="_blank">
            <GenericContent {...props} />
        </a>
    )
}

const TownsContent = (
    props: UnfurledLinkAttachment & { townPath: string; townId: string; channelId?: string },
) => {
    const { townPath, townId } = props

    const channelId = townPath.match(new RegExp(`/${townId}/${PATHS.CHANNELS}/([0-9a-z]{64})`))?.[1]

    const { data: spaceInfo } = useContractSpaceInfo(townId)
    const { data: memberInfo, isLoading } = useReadableMembershipInfo(townId)
    const { data: tokensGatingMembership } = useTokensGatingMembership(townId)

    const priceText = getPriceText(memberInfo?.price)

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
                        {priceText ? (
                            <Pill>
                                {priceText?.value}
                                {parseFloat(priceText.value) > 0 ? ' ETH' : ''}
                            </Pill>
                        ) : (
                            <></>
                        )}
                        {(tokensGatingMembership?.tokens.length ?? 0) > 0 ? (
                            <Pill position="relative" alignSelf="start">
                                <Stack horizontal gap="xs">
                                    {tokensGatingMembership.tokens.map((token, index) => (
                                        <Box key={token.address + token.chainId}>
                                            <SelectedToken
                                                contractAddress={token.address}
                                                chainId={token.chainId}
                                                size="x2"
                                                borderRadius="xs"
                                            />
                                        </Box>
                                    ))}
                                    {tokensGatingMembership.tokens.at(-1)?.type}
                                </Stack>
                            </Pill>
                        ) : (
                            <></>
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

const GenericContent = (props: {
    image?: Image
    title?: string
    description?: string
    url?: string
}) => (
    <LinkContainer>
        {props.image?.url && !!props.image?.height && (
            <RatioedBackgroundImage
                alt={props.title}
                url={props.image.url}
                width={props.image.width}
                height={props.image.height}
            />
        )}
        <Stack gap="paragraph" padding="md">
            {props.title && !isUrl(props.title) && (
                <Box>
                    <Text
                        size="md"
                        style={{
                            overflowWrap: 'break-word',
                        }}
                    >
                        {props.title}
                    </Text>
                </Box>
            )}
            {props.description && (
                <Text>
                    <Text
                        size="sm"
                        color="gray2"
                        style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 5,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                        }}
                    >
                        {props.description}
                    </Text>
                </Text>
            )}
            <Box hoverable color={{ hover: 'cta2', default: 'gray2' }} maxWidth="100%">
                <Text truncate fontWeight="medium" size="sm">
                    {props.url}
                </Text>
            </Box>
        </Stack>
    </LinkContainer>
)

const LinkContainer = (props: BoxProps) => (
    <Box background="level2" borderRadius="md" maxWidth="300" {...props} />
)
