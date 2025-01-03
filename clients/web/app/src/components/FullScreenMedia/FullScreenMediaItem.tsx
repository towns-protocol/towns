import React, { useCallback, useEffect, useState } from 'react'
import { useChunkedMedia, useUser } from 'use-towns-client'
import { formatDistance } from 'date-fns'
import { Attachment } from '@river-build/sdk'
import { Box, Stack, Text } from '@ui'
import { darkTheme } from 'ui/styles/vars.css'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { Avatar } from '@components/Avatar/Avatar'
import { isVideoMimeType } from 'utils/isMediaMimeType'

type Props = {
    attachment: Attachment
    userId: string
    timestamp: number
}

type MediaSenderInfoProps = {
    userId: string
    timestamp?: number
}

export const FullScreenMediaItem = (props: Props) => {
    const { attachment, userId, timestamp } = props
    if (attachment.type === 'chunked_media' && attachment.encryption) {
        return (
            <ChunkedMediaFullScreen
                streamId={attachment.streamId}
                iv={attachment.encryption.iv}
                secretKey={attachment.encryption.secretKey}
                userId={userId}
                timestamp={timestamp}
                thumbnail={attachment.thumbnail?.content}
                mimetype={attachment.info.mimetype}
            />
        )
    }

    return undefined
}

const ChunkedMediaFullScreen = (
    props: {
        streamId: string
        iv: Uint8Array
        secretKey: Uint8Array
        thumbnail?: Uint8Array
        mimetype: string
    } & MediaSenderInfoProps,
) => {
    const { thumbnail, ...mediaProps } = props
    const [thumbnailURL, setThumbnailURL] = useState<string | undefined>(undefined)
    const { objectURL } = useChunkedMedia(mediaProps)

    useEffect(() => {
        if (thumbnail) {
            const blob = new Blob([thumbnail])
            const url = URL.createObjectURL(blob)
            setThumbnailURL(url)
        }
    }, [thumbnail])

    return (
        <MediaItemWithBackground
            url={objectURL ?? thumbnailURL ?? ''}
            userId={props.userId}
            timestamp={props.timestamp}
            mimetype={props.mimetype}
        />
    )
}

const MediaItemWithBackground = (
    props: { url: string; mimetype: string } & MediaSenderInfoProps,
) => {
    const { mimetype, url, userId, timestamp } = props

    const isVideo = isVideoMimeType(mimetype)

    return (
        <Box
            absoluteFill
            background="level1"
            style={{
                backgroundImage: !isVideo ? `url(${url})` : undefined,
                backgroundPosition: 'center',
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
            }}
        >
            <Box
                absoluteFill
                style={{
                    backdropFilter: 'blur(10px) brightness(10%)',
                    WebkitBackdropFilter: 'blur(10px) brightness(10%)',
                }}
            >
                {!isVideo ? (
                    <Box
                        width="100%"
                        height="100%"
                        style={{
                            backgroundImage: `url(${url})`,
                            backgroundPosition: 'center',
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                        }}
                    />
                ) : (
                    <>
                        <VideoPreview src={url} />
                    </>
                )}
            </Box>
            <Box
                padding
                position="topLeft"
                width="100%"
                style={{
                    background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%)',
                }}
                alignItems="start"
            >
                <MediaSenderInfo userId={userId} timestamp={timestamp} />
            </Box>
        </Box>
    )
}

const VideoPreview = (props: { src: string }) => {
    const { src } = props

    const onRef = useCallback((instance: HTMLVideoElement | null) => {
        instance?.load()
    }, [])

    return (
        <Box
            padding
            controls
            width="100%"
            height="100%"
            as="video"
            src={src}
            objectFit="contain"
            ref={onRef}
        />
    )
}

const MediaSenderInfo = (props: { userId: string; timestamp?: number }) => {
    const { userId, timestamp } = props
    const profile = useUser(userId)
    if (!profile) {
        return null
    }

    const date = timestamp
        ? `${formatDistance(timestamp, Date.now(), {
              addSuffix: true,
          })}`
        : undefined

    const prettyName = getPrettyDisplayName(profile)

    return (
        <Stack horizontal centerContent gap className={darkTheme} paddingTop="safeAreaInsetTop">
            <Avatar userId={props.userId} />
            <Stack gap="sm">
                <Text fontWeight="medium" color="default">
                    {prettyName}
                </Text>
                <Text color="gray2" size="sm">
                    {date}
                </Text>
            </Stack>
        </Stack>
    )
}
