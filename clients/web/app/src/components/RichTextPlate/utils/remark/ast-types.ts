import { ELEMENT_MENTION, TMentionElement } from '@udecode/plate-mention'
import { ELEMENT_CODE_BLOCK, ELEMENT_CODE_LINE, TCodeBlockElement } from '@udecode/plate-code-block'
import { TChannelMentionElement, TMentionEmoji } from '../ComboboxTypes'
import { ELEMENT_MENTION_EMOJI } from '../../plugins/emoji/createEmojiPlugin'
import { ELEMENT_MENTION_CHANNEL } from '../../plugins/createChannelPlugin'

export interface NodeTypes {
    paragraph: string
    block_quote: string
    code_block: string
    code_line: string
    link: string
    ul_list: string
    ol_list: string
    li: string
    listItem: string
    lic: string
    heading: {
        1: string
        2: string
        3: string
        4: string
        5: string
        6: string
    }
    emphasis_mark: string
    strong_mark: string
    delete_mark: string
    inline_code_mark: string
    thematic_break: string
    image: string
    mention: string
    mention_channel: string
    mention_emoji: string
}

export type MdastNodeType =
    | 'paragraph'
    | 'heading'
    | 'list'
    | 'listItem'
    | 'li'
    | 'lic'
    | 'link'
    | 'image'
    | 'blockquote'
    | 'code'
    | 'html'
    | 'emphasis'
    | 'strong'
    | 'delete'
    | 'inlineCode'
    | 'break'
    | 'thematicBreak'
    | 'text'
    | typeof ELEMENT_MENTION
    | typeof ELEMENT_MENTION_CHANNEL
    | typeof ELEMENT_MENTION_EMOJI

export const defaultNodeTypes: NodeTypes = {
    paragraph: 'p',
    block_quote: 'blockquote',
    code_block: ELEMENT_CODE_BLOCK,
    code_line: ELEMENT_CODE_LINE,
    link: 'a',
    ul_list: 'ul',
    ol_list: 'ol',
    li: 'li',
    listItem: 'listItem',
    lic: 'lic',
    heading: {
        1: 'heading_one',
        2: 'heading_two',
        3: 'heading_three',
        4: 'heading_four',
        5: 'heading_five',
        6: 'heading_six',
    },
    emphasis_mark: 'italic',
    strong_mark: 'bold',
    delete_mark: 'strikethrough',
    inline_code_mark: 'code',
    thematic_break: 'thematic_break',
    image: 'image',
    mention: ELEMENT_MENTION,
    mention_channel: ELEMENT_MENTION_CHANNEL,
    mention_emoji: ELEMENT_MENTION_EMOJI,
}

export interface LeafType {
    text: string
    strikethrough?: boolean
    bold?: boolean
    italic?: boolean
    code?: boolean
    parentType?: string
}

export interface BlockType {
    type: string
    parentType?: string
    link?: string
    url?: string
    value?: string
    caption?: string
    language?: string
    break?: boolean
    start?: number
    children: Array<BlockType | LeafType>
}

export interface InputNodeTypes {
    paragraph: string
    block_quote: string
    code_block: string
    link: string
    ul_list: string
    ol_list: string
    listItem: string
    heading: {
        1: string
        2: string
        3: string
        4: string
        5: string
        6: string
    }
    emphasis_mark: string
    strong_mark: string
    delete_mark: string
    inline_code_mark: string
    thematic_break: string
    image: string
}

type RecursivePartial<T> = {
    [P in keyof T]?: RecursivePartial<T[P]>
}

export interface OptionType<T extends InputNodeTypes = InputNodeTypes> {
    nodeTypes?: RecursivePartial<T>
    linkDestinationKey?: string
    imageSourceKey?: string
    imageCaptionKey?: string
}

export interface MdastNode {
    type?: MdastNodeType
    ordered?: boolean
    value?: string
    text?: string
    children?: Array<MdastNode>
    depth?: 1 | 2 | 3 | 4 | 5 | 6
    url?: string
    alt?: string
    lang?: string
    start?: number
    // position?: any
    // spread?: any
    // checked?: any
    // indent?: any
    channel?: Record<string, string>
}

export type TextNode = { text?: string | undefined }

export type CodeBlockNode<T extends InputNodeTypes> = {
    type: T['code_block']
    language: string | undefined
    children: Array<TextNode>
}

export type HeadingNode<T extends InputNodeTypes> = {
    type:
        | T['heading'][1]
        | T['heading'][2]
        | T['heading'][3]
        | T['heading'][4]
        | T['heading'][5]
        | T['heading'][6]
    children: Array<DeserializedNode<T>>
}

export type ListNode<T extends InputNodeTypes> = {
    type: T['ol_list'] | T['ul_list']
    children: Array<DeserializedNode<T>>
}

export type ListItemNode<T extends InputNodeTypes> = {
    type: T['listItem']
    children: Array<DeserializedNode<T>>
}

export type ParagraphNode<T extends InputNodeTypes> = {
    type: T['paragraph']
    break?: true
    children: Array<DeserializedNode<T>>
}

export type LinkNode<T extends InputNodeTypes> = {
    type: T['link']
    children: Array<DeserializedNode<T>>
    [urlKey: string]: string | undefined | Array<DeserializedNode<T>>
}

export type ImageNode<T extends InputNodeTypes> = {
    type: T['image']
    children: Array<DeserializedNode<T>>
    [sourceOrCaptionKey: string]: string | undefined | Array<DeserializedNode<T>>
}

export type BlockQuoteNode<T extends InputNodeTypes> = {
    type: T['block_quote']
    children: Array<DeserializedNode<T>>
}

export type InlineCodeMarkNode<T extends InputNodeTypes> = {
    type: T['inline_code_mark']
    children: Array<TextNode>
    language: string | undefined
}

export type ThematicBreakNode<T extends InputNodeTypes> = {
    type: T['thematic_break']
    children: Array<DeserializedNode<T>>
}

export type ItalicNode<T extends InputNodeTypes> = {
    [K in T['emphasis_mark']]: true
} & {
    children: TextNode
}

export type BoldNode = {
    bold: true
    children: TextNode
}

export type StrikeThoughNode = {
    strikeThrough: true
    children: TextNode
}

export type InlineCodeNode = {
    code: true
    text: string | undefined
}

export type DeserializedNode<T extends InputNodeTypes> =
    | CodeBlockNode<T>
    | HeadingNode<T>
    | ListNode<T>
    | ListItemNode<T>
    | ParagraphNode<T>
    | LinkNode<T>
    | ImageNode<T>
    | BlockQuoteNode<T>
    | InlineCodeMarkNode<T>
    | ThematicBreakNode<T>
    | ItalicNode<T>
    | BoldNode
    | StrikeThoughNode
    | InlineCodeNode
    | TextNode
    | TCodeBlockElement
    | TChannelMentionElement
    | TMentionElement
    | TMentionEmoji
