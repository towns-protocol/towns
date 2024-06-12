import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import useResizeObserver from '@react-hook/resize-observer'
import debounce from 'lodash/debounce'
import { useChunkedMedia } from 'use-towns-client'
import { useDownloadFile } from 'use-towns-client/dist/hooks/use-chunked-media'
import { useMutation } from '@tanstack/react-query'
import { Box, Button, Icon, IconButton, Stack, Text } from '@ui'
import { isMediaMimeType } from 'utils/isMediaMimeType'
import { useDevice } from 'hooks/useDevice'
import { useIsMessageAttachementContext } from '@components/MessageAttachments/hooks/useIsMessageAttachementContext'
import { useSizeContext } from 'ui/hooks/useSizeContext'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'

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

    if (isMediaMimeType(props.mimetype)) {
        return <ChunkedMedia {...props} onDownloadClicked={onDownloadClicked} />
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

const getClosestEventDiv = (element: React.RefObject<HTMLDivElement>) =>
    element.current?.closest('[id^="event-"]') as HTMLDivElement

const ChunkedMedia = (
    props: Props & {
        onDownloadClicked: (event: React.MouseEvent<Element, MouseEvent>) => Promise<void>
    },
) => {
    const { width, height, filename, thumbnail, onClick, onDownloadClicked } = props
    const [thumbnailURL, setThumbnailURL] = useState<string | undefined>(undefined)
    const { objectURL } = useChunkedMedia(props)
    const { isTouch } = useDevice()
    const containerRef = useRef<HTMLDivElement>(null)
    const [displayHeight, setDisplayHeight] = useState(0)

    const calculateDimensions = useCallback(() => {
        if (!containerRef.current) {
            return
        }

        const multiplier = isTouch ? 0.7 : 1
        // By default, the image thumbnail will have a maximum height of 280px * MULTIPLIER
        const MAX_HEIGHT = 280 * multiplier

        // Get the element that is the closest ancestor of the current element that has an ID that starts with 'event-'
        // We do not use containerRef.current here because the containerRef is the parent of the image thumbnail and it
        // does not resize along with window because it has a fixed height set
        const containerWidth =
            (getClosestEventDiv(containerRef).getBoundingClientRect().width ?? 350) - 100
        // Calculate the height of the image thumbnail based on the available container width
        const heightBasedOnContainerWidth = (height / width) * containerWidth
        // Calculate the width of the image thumbnail based on the defined MAX_HEIGHT above
        const widthBasedOnMaxHeight = (width / height) * MAX_HEIGHT

        // First preference is to use the MAX_HEIGHT, but if the width of the image thumbnail is going to be larger
        // than the container width, then use the height based on the container width
        if (widthBasedOnMaxHeight > containerWidth) {
            setDisplayHeight(heightBasedOnContainerWidth)
        } else {
            setDisplayHeight(MAX_HEIGHT)
        }
    }, [width, height, isTouch, setDisplayHeight])

    const debouncedCalc = useMemo(() => debounce(calculateDimensions, 300), [calculateDimensions])

    // Recalculate the dimensions when the container is resized
    useResizeObserver(getClosestEventDiv(containerRef), debouncedCalc)

    useLayoutEffect(() => {
        calculateDimensions()
    }, [calculateDimensions])

    useEffect(() => {
        if (!containerRef.current) {
            return
        }

        debouncedCalc()
    }, [debouncedCalc])

    useEffect(() => {
        if (thumbnail) {
            const blob = new Blob([thumbnail])
            const url = URL.createObjectURL(blob)
            setThumbnailURL(url)
        }
    }, [thumbnail])

    const [isHovering, setIsHovering] = useState(false)
    const onPointerEnter = useCallback(() => {
        setIsHovering(true)
    }, [])
    const onPointerLeave = useCallback(() => {
        setIsHovering(false)
    }, [])

    const { isMessageAttachementContext } = useIsMessageAttachementContext()

    const src = objectURL ?? thumbnailURL ?? ''
    const applyBlur = !objectURL

    const touchButton = isTouch && (
        <IconButton
            opaque
            icon="maximize"
            position="absolute"
            bottom="sm"
            right="sm"
            onClick={onClick}
        />
    )

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
            ref={containerRef}
            cursor={onClick ? 'zoom-in' : undefined}
            style={{
                height: displayHeight,
                filter: applyBlur ? 'blur(10px) brightness(80%)' : undefined,
            }}
            rounded="sm"
            overflow="hidden"
            onPointerEnter={isTouch ? undefined : onPointerEnter}
            onPointerLeave={isTouch ? undefined : onPointerLeave}
            onClick={isTouch ? undefined : onClick}
        >
            <img
                src={src}
                alt={filename}
                style={{ minWidth: '100%', height: '100%', objectFit: 'cover' }}
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
