import { useMutation } from '@tanstack/react-query'
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useChunkedMedia, useDownloadFile } from 'use-towns-client'
import { Box, Button, Icon, IconButton, Stack, Text } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { useSizeContext } from 'ui/hooks/useSizeContext'
import { useIsMessageAttachementContext } from '@components/MessageAttachments/hooks/useIsMessageAttachementContext'
import { isImageMimeType, isVideoMimeType } from 'utils/isMediaMimeType'
import { MessageAttachmentPresentationContext } from '@components/MessageAttachments/MessageAttachmentsContext'

type Props = {
    streamId: string
    mimetype: string
    width: number
    height: number
    filename: string
    iv: Uint8Array
    secretKey: Uint8Array
    thumbnail?: Uint8Array
    onClick?: (event: React.MouseEvent<HTMLElement>) => void
}

export const ChunkedFile = (props: Props) => {
    const { filename } = props
    const { downloadFile } = useDownloadFile(props)
    const {
        mutateAsync,
        isPending,
        isSuccess,
        data: objectUrl,
    } = useMutation({
        mutationFn: async () => {
            const objectUrl = await downloadFile()
            if (!objectUrl) {
                return Promise.reject()
            }
            return objectUrl
        },
    })

    useEffect(() => {
        let timeout: NodeJS.Timeout | undefined
        // based on https://pqina.nl/blog/how-to-prompt-the-user-to-download-a-file-instead-of-navigating-to-it/
        if (isSuccess && objectUrl) {
            console.log('[ChunkedFile][route] downloading file', objectUrl)
            const link = document.createElement('a')
            link.style.display = 'none'
            link.href = objectUrl
            link.download = filename

            document.body.appendChild(link)
            link.click()
            timeout = setTimeout(() => {
                URL.revokeObjectURL(link.href)
                link.parentNode?.removeChild(link)
            }, 0)
        }

        return () => {
            if (timeout) {
                clearTimeout(timeout)
            }
        }
    }, [filename, isSuccess, objectUrl])

    const onDownloadClicked = useCallback(
        async (event: React.MouseEvent) => {
            event.preventDefault()
            event.stopPropagation()
            mutateAsync()
        },
        [mutateAsync],
    )

    if (isImageMimeType(props.mimetype)) {
        return <ChunkedImageMedia {...props} onDownloadClicked={onDownloadClicked} />
    } else if (isVideoMimeType(props.mimetype)) {
        return <ChunkedVideoMedia {...props} onDownloadClicked={onDownloadClicked} />
    } else {
        return (
            <ChunkedFileDownload
                {...props}
                isDownloading={isPending}
                onDownloadClicked={onDownloadClicked}
            />
        )
    }
}

const ChunkedFileDownload = (
    props: Props & {
        onDownloadClicked: (event: React.MouseEvent<Element, MouseEvent>) => Promise<void>
        isDownloading: boolean
    },
) => {
    const { filename, mimetype, isDownloading, onDownloadClicked } = props

    const size = useSizeContext()
    const reducedWidth = size.lessThan(370)

    return (
        <Stack
            horizontal
            gap
            padding="sm"
            border="level3"
            rounded="sm"
            pointerEvents="auto"
            cursor="pointer"
            alignItems="center"
            maxWidth={reducedWidth ? '200' : '300'}
            tooltip={filename}
            onClick={isDownloading ? undefined : onDownloadClicked}
        >
            <Icon type="file" size="square_md" color="gray2" />
            <Stack gap="sm" overflow="hidden" minHeight="x5" justifyContent="center">
                <Text truncate fontWeight="medium" color="default" size="md">
                    {filename}
                </Text>
                {mimetype.length > 0 && (
                    <Text truncate color="gray2" size="sm">
                        {mimetype}
                    </Text>
                )}
            </Stack>
            <Button tone="level2" color="gray2" border="level3" size="button_sm" rounded="sm">
                {isDownloading ? (
                    <ButtonSpinner color="gray2" square="square_sm" />
                ) : (
                    <Icon type="download" color="gray2" size="square_sm" />
                )}
            </Button>
        </Stack>
    )
}

const ChunkedImageMedia = (
    props: Props & {
        onDownloadClicked: (event: React.MouseEvent<Element, MouseEvent>) => Promise<void>
    },
) => {
    const { width, height, thumbnail, onClick, onDownloadClicked } = props

    const { containerWidth, containerHeight } = useSizeContext()
    const { isGridContext, gridRowHeight: rowHeight } = useContext(
        MessageAttachmentPresentationContext,
    )

    const { isMessageAttachementContext } = useIsMessageAttachementContext()
    const { isTouch } = useDevice()

    const [isHovering, setIsHovering] = useState(false)
    const onPointerEnter = useCallback(() => {
        setIsHovering(true)
    }, [])
    const onPointerLeave = useCallback(() => {
        setIsHovering(false)
    }, [])

    const objectURL = useChunkedMedia(props).objectURL

    const [thumbnailURL] = useState<string | undefined>(() => {
        if (thumbnail) {
            const blob = new Blob([thumbnail])
            return URL.createObjectURL(blob)
        }
        return undefined
    })
    const src = objectURL ?? thumbnailURL ?? ''
    const applyBlur = !objectURL && !thumbnailURL

    const touchButton = useMemo(() => {
        return (
            isTouch && (
                <IconButton
                    opaque
                    icon="maximize"
                    position="absolute"
                    bottom="sm"
                    right="sm"
                    onClick={onClick}
                />
            )
        )
    }, [isTouch, onClick])

    const safeArea = useMemo(() => {
        // slightly arbitrary, the margin around the container (avatars, textbox, etc)
        const marginX = 85
        const marginY = 150

        // max size of the image
        const imageMaxWidth = 600
        const imageMaxHeight = 600

        // viewport size
        const vpw = containerWidth - marginX
        const vph = containerHeight - marginY
        const ca = vpw / vph

        return isGridContext
            ? {
                  width: rowHeight,
                  height: rowHeight,
              }
            : {
                  // - never larger than the viewport
                  // - never larger than the image itself
                  // - for stretched landscape (text) downscale 66% otherwise 50%
                  width: Math.min(
                      vpw,
                      imageMaxWidth,
                      width / height > 3 ? width * 0.66 : width * 0.5,
                  ),

                  // - never larger than the imageMaxHeight
                  // - if the image is landscape, never larger than 75% of the viewport height
                  // - if the image is portrait, never larger than 50% of the viewport height
                  // - for stretched landscape (text) downscale 66% otherwise 50%
                  // - but never smaller than 300px height
                  height: Math.max(
                      300,
                      Math.min(
                          imageMaxHeight,
                          ca > 1 ? vph * 0.75 : vph * 0.66,
                          height / width > 3 ? height * 0.66 : height * 0.5,
                      ),
                  ),
              }
    }, [containerHeight, containerWidth, rowHeight, height, isGridContext, width])

    const direction =
        isGridContext || !safeArea.width || !safeArea.height
            ? undefined
            : width / height > safeArea.width / safeArea.height
            ? 'h'
            : 'v'

    return isMessageAttachementContext ? (
        <Box
            width="x8"
            height="x8"
            rounded="md"
            overflow="hidden"
            cursor={onClick ? 'zoom-in' : undefined}
            onClick={isTouch ? undefined : onClick}
        >
            <Box fit="full" as="img" src={src} objectFit="cover" />
            {touchButton}
        </Box>
    ) : (
        <Box
            position="relative"
            cursor={onClick ? 'zoom-in' : undefined}
            style={{
                width: direction === 'h' ? safeArea.width : undefined,
                height: direction === 'v' ? safeArea.height : undefined,
            }}
            rounded="xs"
            overflow="hidden"
            onPointerEnter={isTouch ? undefined : onPointerEnter}
            onPointerLeave={isTouch ? undefined : onPointerLeave}
            onClick={isTouch ? undefined : onClick}
        >
            <img
                role="image"
                src={src}
                width={width}
                height={height}
                style={{
                    height: isGridContext && rowHeight ? rowHeight : '100%',
                    width: isGridContext && rowHeight ? rowHeight * (width / height) : '100%',
                    filter: applyBlur ? 'blur(10px) brightness(80%)' : undefined,
                }}
                onClick={isTouch ? undefined : onClick}
            />
            {isHovering && (
                <Box position="bottomRight" padding="sm">
                    <IconButton icon="download" onClick={onDownloadClicked} />
                </Box>
            )}
            {touchButton}
        </Box>
    )
}

const ChunkedVideoMedia = (
    props: Props & {
        onDownloadClicked: (event: React.MouseEvent<Element, MouseEvent>) => Promise<void>
    },
) => {
    const { aspectRatio, containerWidth, containerHeight } = useSizeContext()
    const { objectURL } = useChunkedMedia(props)
    const { isMessageAttachementContext } = useIsMessageAttachementContext()
    const src = objectURL

    const style = useMemo(() => {
        if (aspectRatio > 1) {
            // landscape
            return {
                width: 'auto',
                height: containerHeight * 0.66,
                maxWidth: containerWidth / 2,
            } as const
        } else {
            // portrait
            return {
                width: '100%',
                height: 'auto',
                maxHeight: containerHeight,
            } as const
        }
    }, [aspectRatio, containerHeight, containerWidth])

    const onLoadedMetadata = useCallback((event: React.SyntheticEvent<HTMLVideoElement>) => {
        const video = event.currentTarget
        // hack to get the first frame on safary
        video.currentTime = 0.01
    }, [])

    return isMessageAttachementContext ? (
        <Stack
            horizontal
            border
            background="level1"
            overflow="hidden"
            width="x8"
            height="x8"
            position="relative"
            cursor="zoom-in"
            borderRadius="sm"
            onClick={props.onClick}
        >
            <Box absoluteFill centerContent>
                <Icon type="play" />
            </Box>
        </Stack>
    ) : (
        <Box
            controls
            playsInline
            muted
            preload="metadata"
            rounded="sm"
            overflow="hidden"
            role="video"
            as="video"
            src={src}
            style={style}
            objectFit="cover"
            onLoadedMetadata={onLoadedMetadata}
        />
    )
}
