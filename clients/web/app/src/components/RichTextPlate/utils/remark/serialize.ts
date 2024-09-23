import escapeHtml from 'escape-html'
import { BlockType, LeafType, NodeTypes, defaultNodeTypes } from './ast-types'
import { BREAK_TAG } from '../helpers'

interface Options {
    nodeTypes: NodeTypes
    listDepth?: number
    olStartIndex?: number
    ignoreParagraphNewline?: boolean
    leafIndex?: number
    childrenLength?: number
}

const MENTION_TYPES = [
    defaultNodeTypes.mention,
    defaultNodeTypes.mention_channel,
    defaultNodeTypes.mention_emoji,
]

const isLeafNode = (node: BlockType | LeafType): node is LeafType => {
    return (
        typeof (node as LeafType).text === 'string' ||
        MENTION_TYPES.includes((node as BlockType).type)
    )
}

const VOID_ELEMENTS: Array<keyof NodeTypes> = ['thematic_break', 'image']

export default function serialize(
    chunk: BlockType | LeafType,
    opts: Options = { nodeTypes: defaultNodeTypes },
) {
    const {
        nodeTypes: userNodeTypes = defaultNodeTypes,
        ignoreParagraphNewline = false,
        listDepth = 0,
    } = opts

    let text = (chunk as LeafType).text || ''
    const type = (chunk as BlockType).type || ''

    // Handle mentions
    if (MENTION_TYPES.includes(type)) {
        text = (chunk as BlockType).value || ''
    }

    const nodeTypes: NodeTypes = {
        ...defaultNodeTypes,
        ...userNodeTypes,
        heading: {
            ...defaultNodeTypes.heading,
            ...userNodeTypes.heading,
        },
    }

    const LIST_TYPES = [nodeTypes.ul_list, nodeTypes.ol_list]

    let children = text ? text.split('\n').join('  \n') : text

    if (!isLeafNode(chunk)) {
        children = chunk.children
            .map((c: BlockType | LeafType, index) => {
                const isList = !isLeafNode(c)
                    ? (LIST_TYPES as string[]).includes(c.type || '')
                    : false

                const selfIsList = (LIST_TYPES as string[]).includes(chunk.type || '')

                // Links can have the following shape
                // In which case we don't want to surround
                // with break tags
                // {
                //  type: 'paragraph',
                //  children: [
                //    { text: '' },
                //    { type: 'link', children: [{ text: foo.com }]}
                //    { text: '' }
                //  ]
                // }
                let childrenHasLink = false

                if (!isLeafNode(chunk) && Array.isArray(chunk.children)) {
                    childrenHasLink = chunk.children.some(
                        (f) => !isLeafNode(f) && f.type === nodeTypes.link,
                    )
                }

                return serialize(
                    { ...c, parentType: type },
                    {
                        nodeTypes,
                        // WOAH.
                        // what we're doing here is pretty tricky, it relates to the block below where
                        // we check for ignoreParagraphNewline and set type to paragraph.
                        // We want to strip out empty paragraphs sometimes, but other times we don't.
                        // If we're the descendant of a list, we know we don't want a bunch
                        // of whitespace. If we're parallel to a link we also don't want
                        // to respect neighboring paragraphs
                        ignoreParagraphNewline:
                            (ignoreParagraphNewline || isList || selfIsList || childrenHasLink) &&
                            // if we have c.break, never ignore empty paragraph new line
                            !(c as BlockType).break,

                        // track depth of nested lists so we can add proper spacing
                        listDepth: (LIST_TYPES as string[]).includes((c as BlockType).type || '')
                            ? listDepth + 1
                            : listDepth,
                        olStartIndex: (chunk as BlockType).start ?? 1,
                        leafIndex: index,
                        childrenLength: chunk.children.length,
                    },
                )
            })
            .join('')
    }

    if (children === '') {
        if (
            ![nodeTypes.code_line, nodeTypes.code_block].includes(chunk.parentType as string) &&
            !VOID_ELEMENTS.find((k) => nodeTypes[k] === type)
        ) {
            return
        }
    }

    /**
     * Handle the case where we have a leaf node, and NOT a break tag (\n, <br>). We want to apply formatting in the
     * correct order. We also want to ensure that we're not applying formatting to a string that is only whitespace.
     * For every formatting type, we add the corresponding markdown format string to the `markdownFormatStr` variable.
     *
     * @example
     * { text: 'foo', bold: true, code: true }
     * // will become
     * '**`foo`**'
     *
     * @description Code is ALWAYS last, so we can't have a string like this:
     * \`\*\*foo\*\*\`, as it will not be formatted
     */
    if (children !== BREAK_TAG && isLeafNode(chunk)) {
        let markdownFormatStr = ''
        // Order of these if statements is important
        if (chunk.strikethrough) {
            markdownFormatStr += '~~'
        }
        if (chunk.underline) {
            markdownFormatStr += '__'
        }
        if (chunk.bold) {
            markdownFormatStr += '**'
        }
        if (chunk.italic) {
            markdownFormatStr += '*'
        }
        // Code is always last
        if (chunk.code) {
            markdownFormatStr += '`'
        }

        /**
         * Thematic break is a special case where we don't want to apply formatting
         * to the children. We just want to return the thematic break
         *
         * @example
         * { text: '-------' }
         * // will become
         * \\-------
         */
        if (children.match(/^[-_*]{3,}/gi)) {
            children = '\\' + children
        }

        /**
         * If an empty string is being formatted, we don't want to apply formatting and just return empty string
         */
        children =
            children.trim() === ''
                ? children
                : retainWhitespaceAndFormat(children, markdownFormatStr)
    }

    switch (type) {
        case nodeTypes.block_quote:
            // For some reason, marked is parsing blockquotes w/ one new line
            // as contiued blockquotes, so adding two new lines ensures that doesn't
            // happen
            return `> ${children}\n\n`

        case nodeTypes.code_block:
            return `\`\`\`${(chunk as BlockType).language || ''}\n${children}\`\`\`\n`

        case nodeTypes.link:
            return `[${children}](${(chunk as BlockType).url || ''})`

        case nodeTypes.ul_list:
        case nodeTypes.ol_list:
            return `\n${children}\n`

        case nodeTypes.li: {
            const isOL = chunk && chunk.parentType === nodeTypes.ol_list
            const treatAsLeaf =
                (chunk as BlockType).children.length === 1 &&
                isLeafNode((chunk as BlockType).children[0])

            let spacer = ''
            for (let k = 0; listDepth > k; k++) {
                if (isOL) {
                    // https://github.com/remarkjs/remark-react/issues/65
                    spacer += '   '
                } else {
                    spacer += '  '
                }
            }
            return `${spacer}${isOL ? `${opts.olStartIndex ?? 1}.` : '-'} ${children}${
                treatAsLeaf ? '\n' : ''
            }`
        }
        case nodeTypes.heading[1]:
        case nodeTypes.heading[2]:
        case nodeTypes.heading[3]:
        case nodeTypes.heading[4]:
        case nodeTypes.heading[5]:
        case nodeTypes.heading[6]:
        case nodeTypes.code_line:
        case nodeTypes.lic:
        case nodeTypes.paragraph:
            return `${children}\n`

        case nodeTypes.thematic_break:
            return `---\n`

        default:
            return escapeHtml(children)
    }
}

// This function handles the case of a string like this: "   foo   "
// Where it would be invalid markdown to generate this: "**   foo   **"
// We instead, want to trim the whitespace out, apply formatting, and then
// bring the whitespace back. So our returned string looks like this: "   **foo**   "
function retainWhitespaceAndFormat(string: string, format: string) {
    // we keep this for a comparison later
    const frozenString = string.trim()

    // children will be mutated
    const children = frozenString

    // We reverse the right side formatting, to properly handle bold/italic and strikethrough
    // formats, so we can create ~~***FooBar***~~
    const fullFormat = `${format}${children}${reverseStr(format)}`

    // This conditions accounts for no whitespace in our string
    // if we don't have any, we can return early.
    if (children.length === string.length) {
        return fullFormat
    }

    // if we do have whitespace, let's add our formatting around our trimmed string
    // We reverse the right side formatting, to properly handle bold/italic and strikethrough
    // formats, so we can create ~~***FooBar***~~
    const formattedString = format + children + reverseStr(format)

    // and replace the non-whitespace content of the string
    return string.replace(frozenString, formattedString)
}

const reverseStr = (string: string) => string.split('').reverse().join('')
