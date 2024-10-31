import { createPlatePlugin } from '@udecode/plate-common/react'
import { deserializeMd } from '../utils/deserializeMD'
import { containsUrl, convertPlainTextLinksToMd, isCodeBlockElement } from '../utils/helpers'

export const KEY_FORMAT_TEXT_LINK = 'KEY_FORMAT_TEXT_LINK'

/**
 * @description The purpose of this plugin is to convert plain text links to markdown links.
 * @example
 * // Before
 * (Following would render as a plain text.)
 * Random text with a link https://www.google.com
 *
 *
 * // After
 * (It will render as a markdown link)
 * Random text with a link [https://www.google.com](https://www.google.com)
 *
 * We are using `linkify-it` to detect links in the text and then converting them to markdown links.
 * Also, we need to ensure that the link is not already in markdown or HTML format, because that is already
 * supported by the editor and we don't want to get into a conflict.
 */
export const FormatTextLinkPlugin = createPlatePlugin({
    key: KEY_FORMAT_TEXT_LINK,
    parser: {
        format: 'text/plain',
        query: ({ data, dataTransfer, editor }) => {
            // If we're pasting in a code block, ignore this plugin
            if (data.length < 2 || isCodeBlockElement(editor)) {
                return false
            }

            const isHTML =
                dataTransfer.types.includes('text/html') &&
                dataTransfer.getData('text/html').includes('<a')
            return !isHTML && containsUrl(data)
        },
        deserialize: ({ data }) => {
            return deserializeMd(convertPlainTextLinksToMd(data))
        },
    },
})

export const KEY_IOS_PASTE_LINK = 'KEY_IOS_PASTE_LINK'

/**
 * @description On iOS when we copy a URL in browser using share button, it is added to clipboard as text/uri-list.
 * `text/uri-list` is a MIME type for a list of URIs, each on a separate line. It is not handled natively by
 * Plate JS editor so we need to handle it manually.
 *
 * @description We are using `linkify-it` to detect links in the text and then converting them to markdown links.
 */
export const IOSPasteLinkPlugin = createPlatePlugin({
    key: KEY_IOS_PASTE_LINK,
    parser: {
        // insertData is a function that is called when the user pastes data into the editor.
        format: 'text/uri-list',
        query: ({ data, editor }) => {
            // If we're pasting in a code block, ignore this plugin
            if (data.length < 2 || isCodeBlockElement(editor)) {
                return false
            }

            return containsUrl(data)
        },
        deserialize: ({ data }) => {
            return deserializeMd(convertPlainTextLinksToMd(data))
        },
    },
})
