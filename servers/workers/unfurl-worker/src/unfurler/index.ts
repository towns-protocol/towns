import { unfurl, Metadata } from 'unfurl.js'
import { Image, UnfurlData } from '../types'
import sizeOf from 'image-size'

function getImage(response: Metadata): Image | undefined {
    if (response?.oEmbed && response.oEmbed.type === 'photo') {
        if (response.oEmbed.thumbnails?.length) {
            return response.oEmbed.thumbnails[0]
        }
        return {
            url: response.oEmbed.url,
            width: response.oEmbed.width,
            height: response.oEmbed.height,
        }
    }
    if (response.twitter_card && response.twitter_card.images?.length) {
        return {
            url: response.twitter_card.images[0].url,
            width: undefined,
            height: undefined,
        }
    }
    if (response.open_graph && response.open_graph.images?.length) {
        return response.open_graph.images[0]
    }
}

function getTitle(response: Metadata): string | undefined {
    return (
        response.title ||
        response.oEmbed?.title ||
        response.twitter_card?.title ||
        response.open_graph?.title
    )
}

function getDescription(response: Metadata): string | undefined {
    return (
        response.description ||
        response.twitter_card?.description ||
        response.open_graph?.description
    )
}

/**
 * Get specific data.
 * Generally prefers this order: oEmbed, twitter, open_graph
 */
export function handleUnfurlJSResult(url: string, response: Metadata): UnfurlData {
    return {
        url,
        type: 'generic',
        image: getImage(response),
        title: getTitle(response),
        description: getDescription(response),
    }
}

async function handleRawImage(url: string): Promise<UnfurlData> {
    const response = await fetch(url)
    const buffer = await response.arrayBuffer()
    const { width, height } = sizeOf(Buffer.from(buffer))
    return {
        url,
        type: 'image',
        title: url,
        image: {
            url,
            width,
            height,
        },
    }
}

export async function formattedUnfurlJSData(url: string): Promise<UnfurlData | null> {
    let data: UnfurlData | null = null
    const query = await fetch(url, { method: 'HEAD' })
    if (query.headers.get('content-type')?.startsWith('image/')) {
        data = await handleRawImage(url)
    } else {
        const result = await unfurl(url)
        if (result) {
            data = handleUnfurlJSResult(url, result)
        } else {
            console.warn(`formattedUnfurlJSData: no result for ${url}`)
        }

        // if we didn't parse a description or image, nothing to show
        if (data && !data.description && !data.image) {
            data = null
        }
        if (data?.image?.url && (!data.image.width || !data.image.height)) {
            try {
                data.image = (await handleRawImage(data.image.url)).image
            } catch {
                // do nothing
            }
        }
    }
    return data
}
