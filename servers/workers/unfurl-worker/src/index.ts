import { withCorsHeaders } from '../../common/cors'
import { isUrl } from './utils/isUrl'
import { checkForTweetIdFromUrl, getTweet } from './twitter'
import { TwitterUnfurl, UnfurlData } from './types'
import { formattedUnfurlJSData } from './unfurler'

// These initial Types are based on bindings that don't exist in the project yet,
// you can follow the links to learn how to implement them.

export interface Env {
    TWITTER_BEARER: string
    // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
    // MY_KV_NAMESPACE: KVNamespace
    //
    // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
    // MY_DURABLE_OBJECT: DurableObjectNamespace
    //
    // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
    // MY_BUCKET: R2Bucket
}

// have to use module syntax to gain access to env which contains secret variables for local dev
export default {
    fetch(request: Request, env: Env, ctx: ExecutionContext) {
        return worker.fetch(request, env, ctx)
    },
}

/**
 * Unfurls content. If twitter link, then hit twitter API directly.
 * Otherwise handle with unfurl.js
 * TODO: optimize caching with KV API https://developers.cloudflare.com/workers/runtime-apis/kv/#kv-bindings
 */
async function unfurlLink(url: string, env: Env): Promise<UnfurlData | null> {
    let data: UnfurlData
    if (!isUrl(url)) {
        return null
    }

    const tweetId = checkForTweetIdFromUrl(url)
    const twitterBearerToken = env.TWITTER_BEARER

    if (tweetId) {
        try {
            const response = await getTweet(tweetId, twitterBearerToken)
            const json = await response.json()

            data = {
                url,
                type: 'twitter',
                info: json as TwitterUnfurl['info'],
            }
        } catch (error) {
            console.error('twitter error', error)
            return null
        }
    } else {
        try {
            data = await formattedUnfurlJSData(url)
        } catch (error) {
            console.error('unfurljs error', error)
            return null
        }
    }
    return data
}

export const worker = {
    async fetch(
        request: FetchEvent['request'],
        env: Env,
        ctx?: ExecutionContext,
    ): Promise<Response> {
        if (request.method !== 'GET') {
            return new Response('Method not allowed', { status: 405 })
        }

        const url = new URL(request.url)
        const cacheKey = url.toString()

        let response
        const cache = caches.default
        response = await cache.match(cacheKey)

        if (response) {
            return response
        }

        const { searchParams } = url
        // probably dont need to decodeURIComponent but just being safe
        const urls = searchParams.getAll('url').map((url) => decodeURIComponent(url))

        const unfurledUrls = await (
            await Promise.all(urls.map((url) => unfurlLink(url, env)))
        ).filter((data) => data !== null)

        const json = JSON.stringify(unfurledUrls, null, 2)

        response = new Response(json, {
            status: 200,
            headers: {
                'cache-control': 'public, max-age=14400',
                'content-type': 'application/json;charset=UTF-8',
                ...withCorsHeaders(request),
            },
        })

        if (ctx) {
            ctx.waitUntil(cache.put(cacheKey, response.clone()))
        }

        return response
    },
}
