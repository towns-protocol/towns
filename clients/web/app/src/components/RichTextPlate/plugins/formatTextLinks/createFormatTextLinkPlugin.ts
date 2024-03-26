import { createPluginFactory } from '@udecode/plate-common'
import linkifyit from 'linkify-it'
import { deserializeMd } from '../../utils/deserializeMD'
const linkify = linkifyit()

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
                return !isHTML && linkify.test(data)
            },
            getFragment: ({ data }) => {
                return deserializeMd(convertPlainTextLinksToMd(data))
            },
        },
    },
})

const convertPlainTextLinksToMd = (fullText: string) => {
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

const isLinkMD = (link: linkifyit.Match, fullText: string) => {
    return [']', ')', '>'].includes(fullText.charAt(link.lastIndex + 1))
}
