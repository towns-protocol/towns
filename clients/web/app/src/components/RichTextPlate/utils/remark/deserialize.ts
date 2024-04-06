import { ELEMENT_MENTION } from '@udecode/plate-mention'
import {
    BlockQuoteNode,
    CodeBlockNode,
    DeserializedNode,
    HeadingNode,
    ImageNode,
    InputNodeTypes,
    ItalicNode,
    LinkNode,
    ListItemNode,
    ListNode,
    MdastNode,
    MdastNodeType,
    OptionType,
    ParagraphNode,
    TextNode,
    ThematicBreakNode,
    defaultNodeTypes,
} from './ast-types'
import { ELEMENT_MENTION_CHANNEL } from '../../plugins/createChannelPlugin'

export default function deserialize<T extends InputNodeTypes>(
    node: MdastNode,
    opts?: OptionType<T>,
) {
    const types = {
        ...defaultNodeTypes,
        ...opts?.nodeTypes,
        heading: {
            ...defaultNodeTypes.heading,
            ...opts?.nodeTypes?.heading,
        },
    }

    const linkDestinationKey = opts?.linkDestinationKey ?? 'url'
    const imageSourceKey = opts?.imageSourceKey ?? 'link'
    const imageCaptionKey = opts?.imageCaptionKey ?? 'caption'

    let children: Array<DeserializedNode<T>> = [{ text: '' }]

    const nodeChildren = node.children
    if (nodeChildren && Array.isArray(nodeChildren) && nodeChildren.length > 0) {
        children = nodeChildren.flatMap((c: MdastNode) =>
            deserialize(
                {
                    ...c,
                    type:
                        [types.li, types.listItem].includes(node.type as MdastNodeType) &&
                        c.type === 'paragraph'
                            ? (types.lic as MdastNodeType)
                            : c.type,
                    ordered: node.ordered || false,
                },
                opts,
            ),
        )
    }

    switch (node.type) {
        case 'heading':
            return {
                type: types.heading[node.depth || 1],
                children,
            } as HeadingNode<T>
        case 'list':
            return {
                type: node.ordered ? types.ol_list : types.ul_list,
                children,
            } as ListNode<T>
        case 'listItem':
            return { type: types.li, children } as ListItemNode<T>
        case 'lic':
        case 'paragraph':
            return { type: node.type, children } as ParagraphNode<T>
        case 'link':
            return {
                type: types.link,
                [linkDestinationKey]: node.url,
                target: '_blank',
                children,
            } as LinkNode<T>
        case 'image':
            return {
                type: types.image,
                children: [{ text: '' }],
                [imageSourceKey]: node.url,
                [imageCaptionKey]: node.alt,
            } as ImageNode<T>
        case 'blockquote':
            return { type: types.block_quote, children } as BlockQuoteNode<T>
        case 'code':
            return {
                type: types.code_block,
                language: node.lang,
                children:
                    typeof node.value === 'string'
                        ? node.value
                              .split('\n')
                              .map((val) => ({ type: 'code_line', children: [{ text: val }] }))
                        : [{ text: node.value }],
            } as CodeBlockNode<T>
        case ELEMENT_MENTION: {
            return {
                type: ELEMENT_MENTION,
                value: node.value,
                userId: node.value,
                children: [{ text: '' }],
            }
        }
        case ELEMENT_MENTION_CHANNEL: {
            return {
                type: ELEMENT_MENTION_CHANNEL,
                value: node.value,
                channel: node.channel,
                children: [{ text: '' }],
            }
        }
        case 'html':
            if (node.value?.includes('<br>')) {
                return {
                    break: true,
                    type: types.paragraph,
                    children: [{ text: node.value?.replace(/<br>/g, '') || '' }],
                } as ParagraphNode<T>
            }
            return { type: 'paragraph', children: [{ text: node.value || '' }] }

        case 'emphasis':
            return {
                [types.emphasis_mark as string]: true,
                ...forceLeafNode(children as Array<TextNode>),
                ...persistLeafFormats(children as Array<MdastNode>),
            } as unknown as ItalicNode<T>
        case 'strong':
            return {
                [types.strong_mark as string]: true,
                ...forceLeafNode(children as Array<TextNode>),
                ...persistLeafFormats(children as Array<MdastNode>),
            }
        case 'delete':
            return {
                [types.delete_mark as string]: true,
                ...forceLeafNode(children as Array<TextNode>),
                ...persistLeafFormats(children as Array<MdastNode>),
            }
        case 'inlineCode':
            return {
                [types.inline_code_mark as string]: true,
                text: node.value,
                ...persistLeafFormats(children as Array<MdastNode>),
            }
        case 'break':
        case 'thematicBreak':
            return {
                type: types.thematic_break,
                children: [{ text: '' }],
            } as ThematicBreakNode<T>

        case 'text':
        default:
            return { text: node.value || '' }
    }
}

const forceLeafNode = (children: Array<TextNode>) => ({
    text: children.map((k) => k?.text).join(''),
})

// This function is will take any unknown keys, and bring them up a level
// allowing leaf nodes to have many different formats at once
// for example, bold and italic on the same node
function persistLeafFormats(
    children: Array<MdastNode>,
): Omit<MdastNode, 'children' | 'type' | 'text'> {
    return children.reduce((acc, node) => {
        ;(Object.keys(node) as Array<keyof MdastNode>).forEach(function (key) {
            if (key === 'children' || key === 'type' || key === 'text') {
                return
            }

            // eslint-disable-next-line
            // @ts-ignore
            acc[key] = node[key]
        })

        return acc
    }, {})
}
