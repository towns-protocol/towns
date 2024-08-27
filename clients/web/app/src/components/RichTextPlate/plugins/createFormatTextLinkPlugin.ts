import { createPluginFactory } from '@udecode/plate-common'
import { deserializeMd } from '../utils/deserializeMD'
import { containsUrl, convertPlainTextLinksToMd } from '../utils/helpers'

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
export const createFormatTextLinkPlugin = createPluginFactory({
    key: KEY_FORMAT_TEXT_LINK,
    editor: {
        // insertData is a function that is called when the user pastes data into the editor.
        insertData: {
            format: 'text/plain',
            query: ({ data, dataTransfer }) => {
                if (data.length < 2) {
                    return false
                }

                const isHTML =
                    dataTransfer.types.includes('text/html') &&
                    dataTransfer.getData('text/html').includes('<a')
                return !isHTML && containsUrl(data)
            },
            getFragment: ({ data }) => {
                return deserializeMd(convertPlainTextLinksToMd(data))
            },
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
export const createIOSPasteLinkPlugin = createPluginFactory({
    key: KEY_IOS_PASTE_LINK,
    editor: {
        // insertData is a function that is called when the user pastes data into the editor.
        insertData: {
            format: 'text/uri-list',
            query: ({ data }) => {
                if (data.length < 1) {
                    return false
                }

                return containsUrl(data)
            },
            getFragment: ({ data }) => {
                return deserializeMd(convertPlainTextLinksToMd(data))
            },
        },
    },
})
