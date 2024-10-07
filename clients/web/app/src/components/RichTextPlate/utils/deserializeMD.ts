import { Value } from '@udecode/plate-common'
import markdown from 'remark-parse'
import remarkGfm from 'remark-gfm'
import { unified } from 'unified'
import { Channel, useUserLookupContext } from 'use-towns-client'
import remarkDecodeHTMLCodeBlocks from './remark/remarkDecodeHTMLCodeBlocks'
import remarkSlate from './remark/plugin'
import remarkTransformUserAndChannels from './remark/remarkTransformUserAndChannels'
import remarkRemoveHeadings from './remark/remarkRemoveHeadings'
import remarkUnderline from './remark/remarkUnderline'
import { TUserIDNameMap } from '../components/plate-ui/autocomplete/types'

/**
 * Before converting Markdown to Slate, we need to convert new lines to paragraphs, in order to prevent other bugs with text formatting.
 * In Markdown:
 * - a new line is denoted by two spaces at the end of a line and \n character.
 * - a new paragraph is denoted by two new line characters (\n\n).
 *
 * This function replaces all instances of two spaces and a new line with two new lines,
 * and all instances of four or more new lines with two new lines and a non-breaking space.
 *
 * This function is only used during edit and restore draft message from local storage. We DO NOT use it for
 * 1. displaying message content in timeline (Markdown -> Slate)
 * 2. converting Slate to Markdown and storing in DB (Slate -> Markdown)
 */
const convertNewLinesToParagraphs = (data: string) => {
    if (!data) {
        return data
    }
    const mdParagraph = '\n\n'
    const newData = data.replace(/\s\s\n/g, mdParagraph)
    return newData.replace(/\n{4,}/g, '\n\n&nbsp;\n\n')
}

/**
 * Deserialize content from Markdown format to Slate format.
 * This function is only used during edit and restore draft message from local storage.
 *
 * For displaying message content in timeline, use `MarkdownToJSX` component instead.
 *
 * @see MarkdownToJSX
 */
export const deserializeMd = <V extends Value>(
    data: string,
    channels: Channel[] = [],
    userHashMap: TUserIDNameMap = {},
    lookupUser?: ReturnType<typeof useUserLookupContext>['lookupUser'],
): V => {
    const tree = unified()
        .use(markdown)
        .use(remarkGfm)
        .use(remarkUnderline(data))
        .use(remarkRemoveHeadings)
        .use(remarkDecodeHTMLCodeBlocks)
        .use(remarkSlate)
        .use(remarkTransformUserAndChannels(channels, userHashMap, lookupUser))
        .processSync(convertNewLinesToParagraphs(data))

    return tree.result as V
}
