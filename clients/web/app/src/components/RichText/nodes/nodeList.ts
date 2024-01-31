import { CodeHighlightNode, CodeNode } from '@lexical/code'
import { AutoLinkNode, LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { AnnotationNode } from './AnnotationNode'
import { ChannelLinkNode } from './ChannelLinkNode'
import { ChannelMentionNode } from './ChannelMentionNode'
import { EmojiNode } from './EmojiNode'
import { MentionNode } from './MentionNode'
import { HightlightNode } from './HightlightNode'

export const nodeTypeList = [
    CodeNode,
    CodeHighlightNode,
    HeadingNode,
    AnnotationNode,
    EmojiNode,
    AutoLinkNode,
    LinkNode,
    ListItemNode,
    ListNode,
    MentionNode,
    HightlightNode,
    ChannelMentionNode,
    ChannelLinkNode,
    QuoteNode,
]
