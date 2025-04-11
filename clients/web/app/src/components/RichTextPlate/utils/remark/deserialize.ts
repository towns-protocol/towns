import { MentionPlugin } from '@udecode/plate-mention/react'
import { LinkPlugin } from '@udecode/plate-link/dist/react'
import {
    ELEMENT_CONTRACT_ADDRESS,
    ELEMENT_MENTION_TICKER,
} from '@components/RichTextPlate/plugins/createTickerMentionPlugin'
import {
    BlockQuoteNode,
    CodeBlockNode,
    DeserializedNode,
    HeadingNode,
    ImageNode,
    InputNodeTypes,
    LinkNode,
    ListItemNode,
    ListNode,
    MdastNode,
    MdastNodeType,
    OptionType,
    ParagraphNode,
    TextNode,
    defaultNodeTypes,
} from './ast-types'
import { ELEMENT_MENTION_CHANNEL } from '../../plugins/createChannelPlugin'

const PRESERVE_AS_LEAF = [MentionPlugin.key, ELEMENT_MENTION_CHANNEL, LinkPlugin.key]

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
                start: node.start,
                children,
            } as ListNode<T>
        case 'listItem':
            return { type: types.li, children } as ListItemNode<T>
        case 'lic':
            return { type: node.type, children } as ParagraphNode<T>
        case 'paragraph':
            return { type: defaultNodeTypes.paragraph, children } as ParagraphNode<T>
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
                        ? node.value.split('\n').map((val) => ({
                              type: 'code_line',
                              children: [{ text: val }],
                          }))
                        : [{ text: node.value }],
            } as CodeBlockNode<T>
        case MentionPlugin.key:
        case ELEMENT_MENTION_CHANNEL:
        case ELEMENT_MENTION_TICKER:
        case ELEMENT_CONTRACT_ADDRESS: {
            return node
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
        case 'strong':
        case 'underline':
        case 'delete': {
            const markType =
                node.type === 'emphasis'
                    ? types.emphasis_mark
                    : node.type === 'strong'
                    ? types.strong_mark
                    : node.type === 'underline'
                    ? types.underline_mark
                    : types.delete_mark

            // Split children around mention nodes
            const result: Array<DeserializedNode<T>> = []
            let currentTextNodes: Array<TextNode> = []

            children.forEach((child) => {
                if ('type' in child && PRESERVE_AS_LEAF.includes(child.type)) {
                    if (currentTextNodes.length > 0) {
                        result.push({
                            [markType as string]: true,
                            ...forceLeafNode(currentTextNodes),
                            ...persistLeafFormats(currentTextNodes as Array<MdastNode>),
                        })
                        currentTextNodes = []
                    }
                    result.push(child)
                } else {
                    currentTextNodes.push(child as TextNode)
                }
            })

            if (currentTextNodes.length > 0) {
                result.push({
                    [markType as string]: true,
                    ...forceLeafNode(currentTextNodes),
                    ...persistLeafFormats(currentTextNodes as Array<MdastNode>),
                })
            }

            return result.length === 1 ? result[0] : result
        }
        case 'inlineCode':
            return {
                [types.inline_code_mark as string]: true,
                text: node.value,
                ...persistLeafFormats(children as Array<MdastNode>),
            }
        case 'break':
        case 'thematicBreak':
            return { text: '  \n' }
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
