import type { EditorConfig, LexicalNode, NodeKey, SerializedTextNode, Spread } from 'lexical'

import { TextNode } from 'lexical'
import { atoms } from 'ui/styles/atoms.css'

export type SerializedChannelMentionNode = Spread<
    {
        channelLabel: string
        type: 'channelMention'
        version: 1
    },
    SerializedTextNode
>

/**
 * ChannelMentionNode is for rendering a channel mention while the user types
 */
export class ChannelMentionNode extends TextNode {
    __channelLabel: string

    static getType(): string {
        return 'channelMention'
    }

    static clone(node: ChannelMentionNode): ChannelMentionNode {
        return new ChannelMentionNode(node.__channelLabel, node.__text, node.__key)
    }

    constructor(label: string, text?: string, key?: NodeKey) {
        super(text ?? label, key)
        this.__channelLabel = label
    }

    getChannel() {
        return this.__channelLabel
    }

    createDOM(config: EditorConfig): HTMLElement {
        const element = super.createDOM(config)
        element.className = atoms({
            color: 'cta2',
        })
        return element
    }

    static importJSON(serializedNode: SerializedChannelMentionNode): ChannelMentionNode {
        const node = $createChannelMentionNode(serializedNode.channelLabel)
        node.setFormat(serializedNode.format)
        node.setDetail(serializedNode.detail)
        node.setMode(serializedNode.mode)
        node.setStyle(serializedNode.style)
        return node
    }

    exportJSON(): SerializedChannelMentionNode {
        return {
            ...super.exportJSON(),
            channelLabel: this.__channelLabel,
            type: 'channelMention',
            version: 1,
        }
    }

    canInsertTextBefore(): boolean {
        return false
    }

    isTextEntity(): true {
        return true
    }
}

export function $createChannelMentionNode(label: string): ChannelMentionNode {
    return new ChannelMentionNode(label)
}

export function $isChannelMentionNode(
    node: LexicalNode | null | undefined,
): node is ChannelMentionNode {
    return node instanceof ChannelMentionNode
}
