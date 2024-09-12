import { useCallback, useEffect, useRef, useState } from 'react'
import { useImageStore } from 'use-towns-client'
import { getImageUrlFromStreamMetadata } from 'api/lib/fetchImage'

export const ImageVariants = {
    public: 'public',
    thumbnail100: 'thumbnail100',
    thumbnail50: 'thumbnail50',
    thumbnail300: 'thumbnail300',
    thumbnail600: 'thumbnail600',
} as const

export type ImageVariant = (typeof ImageVariants)[keyof typeof ImageVariants]

export const useImageSource = (resourceId: string, _variant: ImageVariant) => {
    const storedImageUrl = useImageStore((state) => state.loadedResource[resourceId]?.imageUrl)

    // TODO: image variant
    const externalImageUrl = getImageUrlFromStreamMetadata(resourceId)

    const [imageLoaded, setImageLoaded] = useState<boolean>(false)
    const [imageError, setImageError] = useState<boolean>(false)

    const onLoad = useCallback(() => {
        setImageLoaded(true)
    }, [])

    const onError = useCallback(() => {
        setImageError(true)
    }, [])

    const storedImageUrlRef = useRef(storedImageUrl)

    // reset image loading when a new image is uploaded
    useEffect(() => {
        if (storedImageUrlRef.current === storedImageUrl) {
            // prevent reset on initial mount, otherwise state might get reset wrongly
            return
        }
        storedImageUrlRef.current = storedImageUrl
        setImageLoaded(false)
        setImageError(false)
    }, [storedImageUrl])

    return {
        imageLoaded,
        onLoad,
        onError,
        imageError,
        // TODO: temporary cache busting
        // new images eventually show up, but the browser caches them and users who upload anything might see their old image for a while, even after refreshing
        // We're calling images directly from imagedelivery.net, we can't modify those headers unless we use some proxy - will need to revisit the CF worker or add a service worker interceptor
        imageSrc: storedImageUrl || externalImageUrl,
    }
}
