import linkifyit from 'linkify-it'
import { BaseBlockquotePlugin } from '@udecode/plate-block-quote'
import { BaseCodeLinePlugin } from '@udecode/plate-code-block'
import { BaseLinkPlugin, TLinkElement, unwrapLink } from '@udecode/plate-link'
import { BaseMentionInputPlugin, TMentionInputElement } from '@udecode/plate-mention'
import { TPlateEditor, focusEditor } from '@udecode/plate-common/react'
import {
    type TNodeEntry,
    findNode,
    getBlockAbove,
    getEndPoint,
    getNodeString,
    getPreviousSiblingNode,
    moveSelection,
} from '@udecode/plate-common'
import { isType } from '@udecode/plate-utils'
import { Channel } from 'use-towns-client'
import debounce from 'lodash/debounce'
import { SECOND_MS } from 'data/constants'

const linkify = linkifyit()
export const BREAK_TAG = '<br>'

export const isInputFocused = () => document.activeElement?.tagName === 'INPUT'

/**
 * Convert plain text links in a larger text to markdown links. This function uses `linkify-it`
 * to detect links in the text and then converts them to markdown links.
 *
 * It will not convert links that are already in markdown format.
 * @see isLinkMD
 * @example
 * convertPlainTextLinksToMd('This is a link to google.com') => 'This is a link to [google.com](http://google.com)'
 */
export const convertPlainTextLinksToMd = (fullText: string) => {
    const links = linkify.match(fullText)
    if (!links) {
        return fullText
    }
    let result = fullText
    links.forEach((link) => {
        if (isLinkMD(link, fullText)) {
            return
        }
        const linkText = fullText.substring(link.index, link.lastIndex)
        result = result.replace(linkText, `[${linkText}](${link.url})`)
    })
    return result
}

/**
 * Check if the string contains a URL in Markdown format
 *
 * @example
 * isLinkMD('google.com', 'This is [google.com](https://google.com)') => true
 * isLinkMD('google.com', 'This is google.com') => false
 * isLinkMD('google.com', 'This is [Search](google.com)') => true
 */
export const isLinkMD = (link: linkifyit.Match, fullText: string) => {
    const regex = new RegExp(`(\\[${link.text}]\\(.*)|(\\[.*]\\(${link.text}\\))`)
    return fullText.match(regex)
}

/**
 * Check if the string is a valid URL and has no other characters.
 * The URL should not be a part of a larger string
 *
 * @example
 * isExactlyUrl('https://www.google.com') => true
 * isExactlyUrl('google.com') => true
 * isExactlyUrl('Hello google.com') => false
 * */
export const isExactlyUrl = (url: string) => {
    const matches = linkify.match(url)
    if (!matches || matches.length === 0) {
        return false
    }
    return matches[0].text === url
}

/**
 * Check if the string contains a URL. Could contain other non-URL elements as well
 *
 * @example
 * containsUrl('https://www.google.com') => true
 * containsUrl('https://www.google.com and some text') => true
 * containsUrl('some text and more text') => false
 * */
export const containsUrl = (text: string) => linkify.test(text)

/**
 * Get a fully formed valid URL from a string. This function will add linkify schema like `mailto:`, `tel:`, `http://`, `https://`
 *
 * Only works if text is entirely a URL and not a part of a larger string
 * @example
 * getUrlHref('towns.com') => 'http://www.towns.com'
 * getUrlHref('test') => false
 * getUrlHref('towns.com is great') => false
 * getUrlHref('https://towns.com?test%2Dparam') => 'https://towns.com/?test%2Dparam'
 * getUrlHref('user@email.com') => 'mailto:user@email.com'
 */
export const getUrlHref = (url: string) => {
    try {
        if (!url || url === '%' || !isExactlyUrl(url)) {
            return
        }

        let _url = url
        const linkSchema = linkify.match(url)?.[0]
        if (linkSchema && linkSchema.url !== url) {
            _url = linkSchema.url
        }
        return _url
    } catch (e) {
        return url
    }
}

export const getLinkURLAtSelection = (editor: TPlateEditor) => {
    const linkNode = getLinkNodeAtSelection(editor)
    if (!linkNode || !linkNode?.[0]?.url) {
        return
    }
    return linkNode[0].url as string
}

/**
 * Unwrap the link at the current selection. If the link is not a valid URL, it will be unwrapped
 * and converted to plain text.
 *
 * Exported as a debounced function below to prevent multiple calls in quick succession.
 */
const unwrapLinkAtSelection = (editor: TPlateEditor) => {
    const { selection } = editor
    if (!selection) {
        return
    }
    const previousNode = getPreviousSiblingNode(editor, selection.focus.path)
    if (
        !Array.isArray(previousNode) ||
        (previousNode[0] as TLinkElement).type !== BaseLinkPlugin.key
    ) {
        return
    }
    const previousNodeText = getNodeString(previousNode[0] as TLinkElement)
    if (!isExactlyUrl(previousNodeText)) {
        moveSelection(editor, { distance: 1, reverse: true })
        unwrapLink(editor)
        moveSelection(editor, { distance: 1 })
    }
}

export const debouncedUnwrapLinkAtSelection = debounce(unwrapLinkAtSelection, SECOND_MS / 10)

export const getLinkNodeAtSelection = (editor: TPlateEditor) => {
    return findNode(editor, { match: { type: BaseLinkPlugin.key } })
}

export const isCodeBlockElement = (editor: TPlateEditor) =>
    isType(editor, getBlockAbove(editor)?.[0], BaseCodeLinePlugin.key)

export const isBlockquoteElement = (editor: TPlateEditor) =>
    isType(editor, getBlockAbove(editor)?.[0], BaseBlockquotePlugin.key)

export const getMentionInputElement = (editor: TPlateEditor) =>
    findNode<TMentionInputElement>(editor, {
        match: { type: BaseMentionInputPlugin.key },
    })

export const isBlockquoteWithEmptyLines = ([node]: TNodeEntry): boolean => {
    const blockQuoteText = getNodeString(node)
    if (blockQuoteText.endsWith('\n\n')) {
        node.children = [{ text: blockQuoteText.trim() }]
        return true
    }
    return false
}

export const focusEditorTowns = (editor?: TPlateEditor | null, end = false) => {
    if (!editor) {
        return
    }
    try {
        focusEditor(editor, end ? getEndPoint(editor, []) : undefined)
    } catch (_error) {
        /* empty */
    }
}

export const dispatchMockEnterEvent = () => {
    const mockEnterEvent = new KeyboardEvent('keydown', {
        bubbles: true,
        key: 'Enter',
        keyCode: 13,
    })
    document.activeElement?.dispatchEvent(mockEnterEvent)
}

export const getChannelNames = (channels?: Channel[]): string =>
    (channels || []).map((c) => c.label).join('')

export const getMentionIds = (mentions?: { displayName: string }[]): string =>
    (mentions || []).map((u) => u.displayName).join('')
