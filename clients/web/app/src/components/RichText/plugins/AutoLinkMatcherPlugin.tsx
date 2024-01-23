/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { AutoLinkPlugin } from '@lexical/react/LexicalAutoLinkPlugin'
import * as React from 'react'

export const URL_MATCHER =
    /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9]{2,10}(?:\/(?:[-a-zA-Z0-9()[\]',@:%!_+.~#?&//=]*)|)/

// matches without https?:// prefix (e.g. `app.towns.com/?invite`). needs to be more strict than the above
// since it could easily mess up a normal sentence.
// 1/ domain (pattern repeated once for potential subdomain)
// 2/ tld - any 2 char is ok, otherwise pick from a list of known tlds
// 3/ path - optional
export const NON_PREFIXED_MATCHER =
    /^([-a-z0-9@:%._+~#=]{1,256}\.){1,2}(?:com|net|org|co|dev|app|inc|online|info|live|us|technology|tech|pro|world|space|life|shop|art|[a-z]{2})\b([-a-zA-Z0-9()[\]',@:%!_+.~#?&//=]*)$/

export const EMAIL_MATCHER =
    /(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/

const MATCHERS = [
    (text: string) => {
        const match = URL_MATCHER.exec(text)
        if (match === null) {
            return null
        }
        const fullMatch = match[0]
        return {
            index: match.index,
            length: fullMatch.length,
            text: fullMatch,
            url: fullMatch.startsWith('http') ? fullMatch : `https://${fullMatch}`,
            attributes: {
                target: '_blank',
                rel: 'noopener noreferrer',
            },
        }
    },
    (text: string) => {
        const match = NON_PREFIXED_MATCHER.exec(text)
        if (match === null) {
            return null
        }
        const fullMatch = match[0]
        return {
            index: match.index,
            length: fullMatch.length,
            text: fullMatch,
            url: fullMatch.startsWith('http') ? fullMatch : `https://${fullMatch}`,
            attributes: {
                target: '_blank',
                rel: 'noopener noreferrer',
            },
        }
    },
    (text: string) => {
        const match = EMAIL_MATCHER.exec(text)
        return (
            match && {
                index: match.index,
                length: match[0].length,
                text: match[0],
                url: `mailto:${match[0]}`,
                attributes: {
                    target: '_blank',
                    rel: 'noopener noreferrer',
                },
            }
        )
    },
]

export const AutoLinkMatcherPlugin = () => {
    return <AutoLinkPlugin matchers={MATCHERS} />
}
