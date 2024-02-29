import { queryParams } from '../src/twitter'
import { UnfurlData } from '../src/types'
import { interceptResponseWithMock } from './interceptRequest'
import {
    giphy as giphyMock,
    tweet as tweetMock,
    imgur as imgurMock,
    noContent as noContentMock,
} from './mocks'
import giphyJSON from './mocks/giphyJSON'
import imgurJSON from './mocks/imgurJSON'

import { jest } from '@jest/globals'

jest.unstable_mockModule('unfurl.js', () => {
    return {
        unfurl: jest.fn().mockImplementation(() => {
            return {
                title: 'Linear',
            }
        }),
    }
})

jest.unstable_mockModule('image-size', () => {
    return {
        default: () => {
            return {
                width: 100,
                height: 100,
            }
        },
    }
})

import { Env } from '../src/index'

const unfurlJs = await import('unfurl.js')
const unfurlImport = await import('../src/index')
const unfurlDefaultExport = unfurlImport.default
const worker = unfurlImport.worker

const TWITTER_URL = 'https://twitter.com/twitter/status/1589417294794752000'
const TWITTER_URL_WWW = 'https://www.twitter.com/twitter/status/1589417294794752000'
const IMAGE_TYPE_URL = {
    host: 'https://i.imgur.com',
    path: '/kJdpI5l.jpeg',
}

const GIPHY_URL = {
    host: 'https://giphy.com',
    path: '/gifs/mlb-baseball-playoffs-astros-rlO48a7OCYB3SIpndR',
}
const NO_CONTENT_URL = {
    host: 'https://linear.app',
    path: '/xxx/issue/xxx-817',
}
const IMGUR_URL = {
    host: 'https://imgur.com',
    path: '/gallery/wHrHONM',
}

const TWITTER_API_URL = {
    host: 'https://api.twitter.com',
    path: `/2/tweets/1589417294794752000?${queryParams}`,
}

const FAKE_SERVER_URL = 'http://fakeserver.com'

function generateRequest(urlArray: string[], method = 'GET'): [Request, Env, ExecutionContext] {
    const urls = urlArray.map((url) => encodeURIComponent(url)).join('&url=')
    const url = `${FAKE_SERVER_URL}?url=${urls}`

    const bindings = getMiniflareBindings()

    return [
        new Request(url, {
            method,
        }),
        bindings,
        { waitUntil: () => null, passThroughOnException: () => null },
    ]
}

describe('unfurl handler', () => {
    beforeEach(() => {
        interceptResponseWithMock(GIPHY_URL.host, GIPHY_URL.path, giphyMock, 'HEAD')
        interceptResponseWithMock(GIPHY_URL.host, GIPHY_URL.path, giphyMock)
        interceptResponseWithMock(IMGUR_URL.host, IMGUR_URL.path, imgurMock, 'HEAD')
        interceptResponseWithMock(IMGUR_URL.host, IMGUR_URL.path, imgurMock)
        interceptResponseWithMock(NO_CONTENT_URL.host, NO_CONTENT_URL.path, noContentMock)
        interceptResponseWithMock(
            IMAGE_TYPE_URL.host,
            IMAGE_TYPE_URL.path,
            imgurMock,
            'HEAD',
            'image/jpg',
        )
        interceptResponseWithMock(
            IMAGE_TYPE_URL.host,
            IMAGE_TYPE_URL.path,
            imgurMock,
            'GET',
            'image/jpg',
        )
        interceptResponseWithMock('https://twitter.com', '/status/twitter/123', '', 'HEAD')
        interceptResponseWithMock('https://twitter.com', '/status/twitter/123', '')
        interceptResponseWithMock(
            TWITTER_API_URL.host,
            TWITTER_API_URL.path,
            JSON.stringify(tweetMock),
            'HEAD',
        )
        interceptResponseWithMock(
            TWITTER_API_URL.host,
            TWITTER_API_URL.path,
            JSON.stringify(tweetMock),
        )
    })

    // !! TIP: make one mock request per test !!

    test('Returns unauthorized if not authorized request', async () => {
        const bindings = getMiniflareBindings()
        const response = await unfurlDefaultExport.fetch(
            new Request(FAKE_SERVER_URL, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer wrongkey`,
                },
            }),
            bindings,
            { waitUntil: () => null, passThroughOnException: () => null },
        )
        expect(response.status).toBe(401)
    })

    test('handles no url param', async () => {
        const bindings = getMiniflareBindings()
        const response = await worker.fetch(
            new Request(FAKE_SERVER_URL, {
                method: 'GET',
            }),
            bindings,
            { waitUntil: () => null, passThroughOnException: () => null },
        )
        expect(response.status).toBe(200)
        expect(await response.json()).toEqual([])
    })

    test('returns empty array when requesting corrupt urls', async () => {
        let response = await worker.fetch(...generateRequest(['']))

        let json: UnfurlData[] = await response.json()
        expect(response.status).toBe(200)
        expect(json.length).toBe(0)

        response = await worker.fetch(...generateRequest(['this is not a url']))
        json = await response.json()
        expect(response.status).toBe(200)
        expect(json.length).toBe(0)

        response = await worker.fetch(
            ...generateRequest([
                'this is not a url',
                'https://twitter.com/status/twitter/123', // no content
            ]),
        )
        expect(response.status).toBe(200)
        expect(json.length).toBe(0)
    })

    test('returns empty array when requesting urls that return no description and image', async () => {
        const spy = jest.spyOn(unfurlJs, 'unfurl').mockReturnValueOnce(
            Promise.resolve({
                title: 'Linear',
            } as any),
        )

        const response = await worker.fetch(
            ...generateRequest([`${NO_CONTENT_URL.host}${NO_CONTENT_URL.path}`]),
        )

        const json: UnfurlData[] = await response.json()
        expect(response.status).toBe(200)
        expect(json.length).toBe(0)
        spy.mockReset()
    })

    test('gets twitter data', async () => {
        const response = await worker.fetch(...generateRequest([TWITTER_URL]))

        const json: UnfurlData[] = await response.json()
        const twitterKeys = Object.keys(json[0].info || [])
        expect(json[0].type).toBe('twitter')
        expect(twitterKeys).toEqual(expect.arrayContaining(['data', 'includes']))
    })

    test('gets twitter data when www in URL', async () => {
        const response = await worker.fetch(...generateRequest([TWITTER_URL_WWW]))

        const json: UnfurlData[] = await response.json()
        const twitterKeys = Object.keys(json[0].info || [])
        expect(json[0].type).toBe('twitter')
        expect(twitterKeys).toEqual(expect.arrayContaining(['data', 'includes']))
    })

    test('gets giphy data', async () => {
        const spy = jest
            .spyOn(unfurlJs, 'unfurl')
            .mockReturnValueOnce(Promise.resolve(giphyJSON as any))

        const response = await worker.fetch(
            ...generateRequest([`${GIPHY_URL.host}${GIPHY_URL.path}`]),
        )

        const json: UnfurlData[] = await response.json()
        expect(json[0].image?.url).not.toBeUndefined()
        expect(json[0].title).toBe('Oh No Omg GIF by MLB - Find & Share on GIPHY')
        expect(json[0].description).not.toBeUndefined()
        spy.mockReset()
    })

    test('gets imgur data', async () => {
        const spy = jest
            .spyOn(unfurlJs, 'unfurl')
            .mockReturnValueOnce(Promise.resolve(imgurJSON as unknown as any))

        const response = await worker.fetch(
            ...generateRequest([`${IMGUR_URL.host}${IMGUR_URL.path}`]),
        )

        const json: UnfurlData[] = await response.json()
        expect(json[0].image?.url).not.toBeUndefined()
        expect(json[0].title?.trim()).toBe(
            'The James Webb Telescope discovered a quintet of galaxies! - Album on Imgur',
        )
        expect(json[0].description).not.toBeUndefined()
        spy.mockReset()
    })

    test('returns raw image', async () => {
        const url = `${IMAGE_TYPE_URL.host}${IMAGE_TYPE_URL.path}`

        const response = await worker.fetch(...generateRequest([url]))

        const json: UnfurlData[] = await response.json()
        expect(json[0].type).toBe('image')
        expect(json[0].url).toBe(url)
        expect(json[0].image?.url).toBe(url)
        expect(json[0].title).toBe(url)
        expect(json[0].image?.width).toBe(100)
    })

    test('returns content for valid urls when mixed with invalid urls', async () => {
        const response = await worker.fetch(...generateRequest(['this is not a url', TWITTER_URL]))
        const json: UnfurlData[] = await response.json()
        expect(response.status).toBe(200)
        expect(json.length).toBe(1)
    })

    test('returns content from various sources together', async () => {
        const spy = jest
            .spyOn(unfurlJs, 'unfurl')
            .mockReturnValueOnce(Promise.resolve(giphyJSON as any))

        const response = await worker.fetch(
            ...generateRequest([`${IMGUR_URL.host}${IMGUR_URL.path}`, TWITTER_URL]),
        )

        const json: UnfurlData[] = await response.json()

        const giphy = json[0]
        const twitter = json[1]
        const twitterKeys = Object.keys(twitter.info || [])
        expect(giphy.image?.url).not.toBeUndefined()
        expect(twitterKeys).toEqual(expect.arrayContaining(['data', 'includes']))
        spy.mockReset()
    })
})
