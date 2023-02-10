import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { axiosClient } from 'api/apiClient'
import { env } from 'utils'
import { useUploadImageStore } from '@components/UploadImage/UploadImage'
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

export function useSpaceIconUpload() {
    const queryClient = useQueryClient()
    return useMutation(uploadIcon, {
        onSuccess: (data) => {
            console.log(`[useSpaceIconUpload] upload success `, data)
            // Optional: returning this will cause the mutation state to stay in loading state while this query updates
            // on a brand new space icon upload, this can take a minute+ to resolve (up to cloudflare to generate images)
            queryClient.invalidateQueries([queryKeys.spaceIcon])
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
            Authorization: `Bearer Zm9v`,
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

export function useGetSpaceIcon({
    spaceId,
    useBypassUrl,
    imageFormatConfig,
}: {
    spaceId: string
    useBypassUrl: boolean
    imageFormatConfig?: CloudflareUrlFormat
}) {
    return useQuery(
        [queryKeys.spaceIcon, spaceId],
        () => getSpaceIcon(spaceId, useBypassUrl, imageFormatConfig),
        {
            refetchOnMount: false,
            refetchOnWindowFocus: false,
            refetchInterval: 1000 * 60 * 60 * 5, // 5 hours
            onSuccess: () => {
                useUploadImageStore.getState().setRenderKey()
            },
            // most spaces are likely to have an image, so in most cases retry won't be necessary
            // but when a space has no attached image we can retry a few times
            //
            // this is especially relevant in the uploading flow - the user will upload the image, this query is invalidated and refetched,
            // but the image isn't available yet so we retry up to 5 times, probably the image is ready by then
            retryDelay: 1000 * 30,
            retry: (failureCount, _error) => {
                if (failureCount < 5) {
                    return true
                }
                return false
            },
        },
    )
}
