import { isEqual, isEqualWith, uniq, uniqBy } from 'lodash'
import { useMemo, useRef } from 'react'
import { matchPath } from 'react-router'
import { UnfurledLinkAttachment } from '@towns-protocol/sdk'
import { useUnfurlContent } from 'api/lib/unfurl'
import { PATHS } from 'routes'
import { notUndefined } from 'ui/utils/utils'
import { isTownsAppUrl } from 'utils/isTownsAppUrl'

export type EmbeddedMessageLink = {
    type: 'message'
    id: string
    pathname: string
    spaceId: string
    channelId: string
    messageId: string
    url: string
}

export interface GoogleMeetAttachment extends UnfurledLinkAttachment {
    dialInLink?: string
    isGoogleMeet?: boolean
}

export type LoadingUnfurledLinkAttachment = UnfurledLinkAttachment & { isLoading: true }

export const useExtractInternalLinks = (text: string): EmbeddedMessageLink[] => {
    const links = getTownsLinks(text)
    const linksRef = useRef(links)
    return useMemo(() => {
        const cleanLinks = uniqBy(links ?? [], 'id')
        return isEqual(cleanLinks, linksRef.current)
            ? linksRef.current
            : (linksRef.current = cleanLinks)
    }, [links])
}

export const useExtractExternalLinks = (
    text: string,
): {
    attachments: (UnfurledLinkAttachment | LoadingUnfurledLinkAttachment)[]
    isLoading: boolean
} => {
    const links = getExternalLinks(text)

    const linksRef = useRef(links)
    const cleanLinks = useMemo(() => {
        const cleanLinks = uniq(links ?? [])
        return isEqualWith(cleanLinks, linksRef.current, (u) => u.href)
            ? linksRef.current
            : (linksRef.current = cleanLinks)
    }, [links])

    // async fetch unfurled content
    const {
        data: unfurledLinksQuery,
        isError,
        isLoading,
    } = useUnfurlContent({
        urlsArray: Array.from(new Set(cleanLinks.map((l) => l.href))),
        enabled: cleanLinks.length > 0,
    })

    const unfurledLinks = useMemo(() => {
        if (!unfurledLinksQuery || !Array.isArray(unfurledLinksQuery) || isError) {
            return cleanLinks.map((link) => {
                return {
                    type: 'unfurled_link',
                    isLoading: true,
                    url: link.href,
                    id: link.href,
                } as LoadingUnfurledLinkAttachment
            })
        } else {
            const phoneNumbers: Record<string, string> = {}

            unfurledLinksQuery.forEach((value) => {
                try {
                    const url = new URL(value.url)
                    if (url.hostname === 'tel.meet') {
                        const parts = url.pathname.split('/')
                        if (parts.length > 2) {
                            const meetingId = parts[1]
                            const phoneNumber = parts[2]
                            if (meetingId && phoneNumber) {
                                phoneNumbers[meetingId] = phoneNumber
                            }
                        }
                    }
                } catch (e) {
                    /* Ignore URL parsing errors */
                }
            })

            return unfurledLinksQuery
                .map((value) => {
                    try {
                        const url = new URL(value.url)

                        if (url.hostname === 'tel.meet') {
                            return null
                        }

                        if (url.hostname === 'meet.google.com') {
                            const meetingId = url.pathname.split('/')[1] || ''
                            const phoneNumber = phoneNumbers[meetingId]

                            return {
                                type: 'unfurled_link',
                                url: value.url,
                                title: value.title ?? '',
                                description: value.description ?? '',
                                image: value.image,
                                id: value.url,
                                dialInLink: phoneNumber
                                    ? `tel.meet/${meetingId}/${phoneNumber}`
                                    : undefined,
                                isGoogleMeet: true,
                            } satisfies GoogleMeetAttachment
                        }

                        return {
                            type: 'unfurled_link',
                            url: value.url,
                            title: value.title ?? '',
                            description: value.description ?? '',
                            image: value.image,
                            id: value.url,
                        } satisfies UnfurledLinkAttachment
                    } catch (e) {
                        return {
                            type: 'unfurled_link',
                            url: value.url,
                            title: value.title ?? '',
                            description: value.description ?? '',
                            image: value.image,
                            id: value.url,
                        } satisfies UnfurledLinkAttachment
                    }
                })
                .filter(Boolean) as UnfurledLinkAttachment[]
        }
    }, [unfurledLinksQuery, isError, cleanLinks])

    return { attachments: unfurledLinks, isLoading }
}

const matchTextLinks =
    /\[[^\]]+\]\((?<mdLink>https:\/\/[^\s)]+)\)|(?<simpleLink>https:\/\/[^\s)]+)/g

function getTownsLinks(text: string) {
    return getExternalLinks(text)
        .filter((u) => isTownsAppUrl(u.href))
        .map(parseTownLink)
        .filter(notUndefined)
}

export function getExternalLinks(text: string) {
    const urls = Array.from(text.matchAll(matchTextLinks))
        .map((u) => {
            if (u) {
                try {
                    const link = u.groups?.mdLink || u.groups?.simpleLink
                    if (link) {
                        const url = new URL(link)
                        return url
                    }
                } catch (e) {
                    // ignore, trivial error
                }
            }
        })
        .filter(notUndefined)

    return urls
}

const parseTownLink = (url: URL) => {
    let messageId = url.hash.replace('#', '')
    messageId = messageId.match(/[a-f0-9]{64}/i) ? messageId : ''

    const matchChannel = matchPath(
        `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId`,
        url.pathname,
    )

    const matchDM = matchPath(`/messages/:channelId`, url.pathname)

    const matchReplies = matchPath(
        `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/${PATHS.REPLIES}/:messageId`,
        url.pathname,
    )

    if (matchDM) {
        const matchParams = {
            ...matchDM.params,
            messageId,
            isReply: !!matchReplies,
        }

        return matchParams.channelId && matchParams.messageId
            ? {
                  type: 'message' as const,
                  id: `message-${matchParams.messageId}`,
                  pathname: url.pathname,
                  spaceId: '',
                  channelId: matchParams.channelId,
                  messageId: matchParams.messageId,
                  url: url.href,
              }
            : undefined
    }

    const match = matchChannel || matchReplies

    if (match) {
        const matchParams = {
            ...match.params,
            messageId,
            isReply: !!matchReplies,
        }

        return matchParams.spaceId && matchParams.channelId && matchParams.messageId
            ? {
                  type: 'message' as const,
                  id: `message-${matchParams.messageId}`,
                  pathname: url.pathname,
                  spaceId: matchParams.spaceId,
                  channelId: matchParams.channelId,
                  messageId: matchParams.messageId,
                  url: url.href,
              }
            : undefined
    }
}
