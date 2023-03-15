import { useMutation } from '@tanstack/react-query'
import { axiosClient } from 'api/apiClient'
import { env } from 'utils'
import { useUploadImageStore } from '@components/UploadImage/useUploadImageStore'

type PostVars = {
    id: string
    file: File
    type: 'spaceIcon' | 'avatar'
}

async function uploadIcon(
    args: PostVars & {
        temporaryImageUrl: string
    },
) {
    const url = new URL(env.VITE_GATEWAY_URL)
    url.pathname = args.type === 'spaceIcon' ? `/space-icon/${args.id}` : `/user/${args.id}/avatar`

    const bodyFormData = new FormData()
    bodyFormData.append('id', args.id)
    bodyFormData.append('file', args.file)

    const res = await axiosClient.post(url.toString(), bodyFormData, {
        withCredentials: true,
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    })

    return { response: res, temporaryImageUrl: args.temporaryImageUrl }
}

export function useUploadImage(referenceId: string) {
    return useMutation(uploadIcon, {
        retry: 3,
        retryDelay: 2500,
        onSuccess: (data) => {
            console.log(`[useUploadImage] upload success `, data.response)
            const { temporaryImageUrl } = data
            const { setResource } = useUploadImageStore.getState()
            // on a successful upload, update all our read queries to start the retry behavior
            setResource(referenceId, {
                renderKey: referenceId + '_' + Date.now(),
                temporaryImageUrl,
            })

            // 3.15.23 - we don't need this for now
            // Optional: returning this will cause the mutation state to stay in loading state while this query updates
            // on a brand new space icon upload, this can take a minute+ to resolve (up to cloudflare to generate images)
            // queryClient.invalidateQueries([queryKeys.spaceIcon, referenceId])
        },
        onError: (error) => {
            console.error(`[useSpaceIconUpload] upload error `, error)
        },
    })
}

// 3.15.23 - we may switch to calling worker apis to grab images in future. For now, we are using imagedelivery.net
// const queryKeys = {
//     spaceIcon: 'spaceIcon',
// } as const
//https://developers.cloudflare.com/images/image-resizing/url-format
// type CloudflareUrlFormat = {
//     width?: number
//     height?: number
//     quality?: number // 1 - 100
//     fit?: string
// }

// const defaultImageFormatConfig: CloudflareUrlFormat = {
//     quality: 3,
//     width: 50,
//     height: 50,
//     fit: 'scale-down',
// }

// // Uses gateway worker to fetch images. Not using this b/c of cache issues, and likely we don't need this after all b/c we are able to get dynamic variants directly from imagedelivery.net
// // eslint-disable-next-line @typescript-eslint/no-unused-vars
// async function getSpaceIcon(
//     spaceId: string,
//     useBypassUrl: boolean,
//     imageFormatConfig: CloudflareUrlFormat = {},
// ) {
//     const GATEWAY_SERVER = env.VITE_GATEWAY_URL

//     const config: CloudflareUrlFormat = {
//         ...defaultImageFormatConfig,
//         ...imageFormatConfig,
//     }

//     const configStr = (Object.keys(config) as (keyof typeof defaultImageFormatConfig)[]).reduce(
//         (acc, key) => {
//             return `${acc}${key}=${config[key]},`
//         },
//         '',
//     )

//     const spaceIconUrl = `${GATEWAY_SERVER}/space-icon/${spaceId}/${configStr}`
//     const spaceIconBypassUrl = `${GATEWAY_SERVER}/space-icon-bypass/${spaceId}`
//     const URL = useBypassUrl ? spaceIconBypassUrl : spaceIconUrl

//     const res = await axiosClient.get(URL, {
//         responseType: 'arraybuffer',
//         headers: {
//             'Cache-Control': 'no-cache',
//         },
//     })

//     console.log('[getSpaceIcon] e tag:', res.headers.etag)
//     const b64Response = Buffer.from(res.data, 'binary').toString('base64')
//     const contentType = res.headers['content-type'] ?? 'image/jpeg'

//     return {
//         base64: `data:${contentType};base64,${b64Response}`,
//     }
// }

// async function checkForImage(spaceId: string) {
//     // just check the public default variant
//     const IMAGE_DELIVERY_URL = `https://imagedelivery.net/qaaQ52YqlPXKEVQhjChiDA/${spaceId}/public`
//     const image = new Image()
//     image.src = IMAGE_DELIVERY_URL

//     const promise = new Promise<boolean>((resolve, reject) => {
//         image.onload = () => {
//             resolve(true)
//         }
//         image.onerror = (error) => {
//             reject(error)
//         }
//     })

//     return promise
// }

// export function useGetImageResource({ resourceId }: { resourceId: string }) {
//     const hasUploadRetryBehavior = useUploadImageStore(
//         (state) => state.resources[resourceId]?.hasUploadRetryBehavior,
//     )

//     return useQuery(
//         [queryKeys.spaceIcon, resourceId, { hasUploadRetryBehavior }],
//         () => checkForImage(resourceId),
//         {
//             refetchOnMount: false,
//             refetchOnReconnect: false,
//             refetchOnWindowFocus: false,
//             staleTime: 1000 * 60 * 60 * 5, // 5 hours
//             enabled: useUploadImageStore.getState().resources[resourceId]?.enabled,
//             retryDelay: hasUploadRetryBehavior ? 1000 * 30 : 1000,
//             onSuccess: () => {
//                 useUploadImageStore
//                     .getState()
//                     .setRenderKey(resourceId, resourceId + '_' + Date.now())
//             },
//             onError: () => {
//                 // when there's an error, the image doesn't exist, we can just disable the query
//                 useUploadImageStore.getState().setEnabled(resourceId, false)
//             },
//             retry: (failureCount, _error) => {
//                 // typical user loading app doesn't need to retry for the space image - it either exists or it doesn't
//                 if (!hasUploadRetryBehavior) {
//                     return false
//                 }
//                 // but if the the reource has `hasUploadRetryBehavior` will cause a new query to be kicked off
//                 // NOTE: this was being used but as of 3.15.23 we are not using this. Instead, if a user uploads an image, we use the temporaryImageSrc for the rest of their session
//                 if (failureCount < 5) {
//                     return true
//                 }
//                 return false
//             },
//         },
//     )
// }
