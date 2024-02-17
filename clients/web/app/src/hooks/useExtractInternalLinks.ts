import { isEqual, uniqBy } from 'lodash'
import { useMemo, useRef } from 'react'
import { matchPath } from 'react-router'
import { PATHS } from 'routes'
import { notUndefined } from 'ui/utils/utils'

export type EmbeddedMessageLink = {
    type: 'message'
    id: string
    pathname: string
    spaceId: string
    channelId: string
    messageId: string
    url: string
}

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

function getTownsLinks(text: string) {
    const urls = Array.from(text.matchAll(/https:\/\/[^\s]+/g))
        .map((u) => {
            if (u) {
                try {
                    const url = new URL(u[0])
                    return parseUrl(url)
                } catch (e) {
                    // ignore, trivial error
                }
            }
        })
        .filter(notUndefined)

    return urls
}

const isTownsLink = (url: URL) => {
    return url.host === window.location.host || url.host.match(/^([a-z0-9-]+\.|)towns\.com$/)
}

const parseUrl = (url: URL) => {
    if (isTownsLink(url)) {
        return parseTownLink(url)
    }
}

const parseTownLink = (url: URL) => {
    let messageId = url.hash.replace('#', '')
    messageId = messageId.match(/[a-f0-9]{64}/i) ? messageId : ''

    const matchChannel = matchPath(
        `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId`,
        url.pathname,
    )

    const matchReplies = matchPath(
        `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/${PATHS.REPLIES}/:messageId`,
        url.pathname,
    )
    const match = matchChannel || matchReplies

    if (match) {
        const matchParams = {
            ...match.params,
            messageId,
            isReply: !!matchReplies,
        }

        const parsedTownLink =
            matchParams.spaceId && matchParams.channelId && matchParams.messageId
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

        return parsedTownLink
    }
}
