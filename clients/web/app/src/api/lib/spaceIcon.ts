import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { axiosClient } from 'api/apiClient'
import { env } from 'utils'
import { useUploadImageStore } from '@components/UploadImage/useUploadImageStore'
import { Buffer } from 'buffer'

type PostVars = {
    id: string
    file: File
}

//https://developers.cloudflare.com/images/image-resizing/url-format
type CloudflareUrlFormat = {
    width?: number
    height?: number
    quality?: number // 1 - 100
    fit?: string
}

const queryKeys = {
    spaceIcon: 'spaceIcon',
} as const

async function uploadIcon(args: PostVars) {
    const URL = env.VITE_GATEWAY_URL
    const bodyFormData = new FormData()
    bodyFormData.append('id', args.id)
    bodyFormData.append('file', args.file)

    return axiosClient.post(`${URL}/space-icon/${args.id}`, bodyFormData, {
        withCredentials: true,
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    })
}

export function useSpaceIconUpload(spaceId: string) {
    const queryClient = useQueryClient()
    return useMutation(uploadIcon, {
        onSuccess: (data) => {
            console.log(`[useSpaceIconUpload] upload success `, data)
            // on a successful upload, update all our read queries to start the retry behavior
            useUploadImageStore.getState().setUploadRetryBehavior(true)

            // Optional: returning this will cause the mutation state to stay in loading state while this query updates
            // on a brand new space icon upload, this can take a minute+ to resolve (up to cloudflare to generate images)
            queryClient.invalidateQueries([queryKeys.spaceIcon, spaceId])
        },
        onError: (error) => {
            console.error(`[useSpaceIconUpload] upload error `, error)
        },
    })
}

const defaultImageFormatConfig: CloudflareUrlFormat = {
    quality: 3,
    width: 50,
    height: 50,
    fit: 'scale-down',
}

// Uses gateway worker to fetch images. Not using this b/c of cache issues, and likely we don't need this after all b/c we are able to get dynamic variants directly from imagedelivery.net
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getSpaceIcon(
    spaceId: string,
    useBypassUrl: boolean,
    imageFormatConfig: CloudflareUrlFormat = {},
) {
    const GATEWAY_SERVER = env.VITE_GATEWAY_URL

    const config: CloudflareUrlFormat = {
        ...defaultImageFormatConfig,
        ...imageFormatConfig,
    }

    const configStr = (Object.keys(config) as (keyof typeof defaultImageFormatConfig)[]).reduce(
        (acc, key) => {
            return `${acc}${key}=${config[key]},`
        },
        '',
    )

    const spaceIconUrl = `${GATEWAY_SERVER}/space-icon/${spaceId}/${configStr}`
    const spaceIconBypassUrl = `${GATEWAY_SERVER}/space-icon-bypass/${spaceId}`
    const URL = useBypassUrl ? spaceIconBypassUrl : spaceIconUrl

    const res = await axiosClient.get(URL, {
        responseType: 'arraybuffer',
        headers: {
            'Cache-Control': 'no-cache',
        },
    })

    console.log('[getSpaceIcon] e tag:', res.headers.etag)
    const b64Response = Buffer.from(res.data, 'binary').toString('base64')
    const contentType = res.headers['content-type'] ?? 'image/jpeg'

    return {
        base64: `data:${contentType};base64,${b64Response}`,
    }
}

async function checkForImage(spaceId: string) {
    // just check the public default variant
    const IMAGE_DELIVERY_URL = `https://imagedelivery.net/qaaQ52YqlPXKEVQhjChiDA/${spaceId}/public`
    const image = new Image()
    image.src = IMAGE_DELIVERY_URL

    const promise = new Promise<boolean>((resolve, reject) => {
        image.onload = () => {
            resolve(true)
        }
        image.onerror = (error) => {
            reject(error)
        }
    })

    return promise
}

export function useGetSpaceIcon({ spaceId }: { spaceId: string }) {
    const hasUploadRetryBehavior = useUploadImageStore((state) => state.hasUploadRetryBehavior)

    return useQuery(
        [queryKeys.spaceIcon, spaceId, { hasUploadRetryBehavior }],
        () => checkForImage(spaceId),
        {
            refetchOnMount: false,
            refetchOnReconnect: false,
            refetchOnWindowFocus: false,
            staleTime: 1000 * 60 * 60 * 5, // 5 hours
            refetchInterval: 1000 * 60 * 60 * 5, // 5 hours
            onSuccess: () => {
                useUploadImageStore.getState().setRenderKey(spaceId)
            },
            retryDelay: 1000 * 30,
            retry: (failureCount, _error) => {
                // typical user loading app doesn't need to retry for the space image - it either exists or it doesn't
                if (!hasUploadRetryBehavior) {
                    return false
                }
                // but if the owner uploads an image, the `hasUploadRetryBehavior` will cause a new query to be kicked off
                // and we want to retry up to X times to give the image time to be generated and updated all instances of the image component
                if (failureCount < 5) {
                    return true
                }
                return false
            },
        },
    )
}
