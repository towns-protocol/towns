import { TextMatchTransformer } from '@lexical/markdown'
import type {
    EditorConfig,
    ElementFormatType,
    LexicalNode,
    SerializedLexicalNode,
    Spread,
} from 'lexical'

import { DecoratorNode } from 'lexical'
import React from 'react'
import { Channel } from 'use-towns-client'
import { ChannelLink } from '@components/RichTextPlate/components/ChannelLink'

export type SerializedChannelMentionNode = Spread<
    {
        channel: Channel
        type: 'channelMention'
        version: 1
    },
    SerializedLexicalNode
>

/**
 * ChannelMentionNode is for rendering a channel mention while the user types
 */
export class ChannelMentionNode extends DecoratorNode<JSX.Element> {
    __channel: Channel

    static getType(): string {
        return 'channelMention'
    }

    static clone(node: ChannelMentionNode): ChannelMentionNode {
        return new ChannelMentionNode(node.__channel, node.__format)
    }

    static importJSON(serializedNode: SerializedChannelMentionNode): ChannelMentionNode {
        const node = $createChannelMentionNode(serializedNode.channel)
        return node
    }

    exportJSON(): SerializedChannelMentionNode {
        return {
            ...super.exportJSON(),
            channel: this.__channel,
            type: 'channelMention',
            version: 1,
        }
    }

    constructor(channel: Channel, format?: ElementFormatType) {
        super(format)
        this.__channel = channel
    }

    createDOM(config: EditorConfig): HTMLElement {
        const div = document.createElement('div')
        div.style.display = 'contents'
        return div
    }

    updateDOM(_prevNode: ChannelMentionNode, _dom: HTMLElement, _config: EditorConfig): boolean {
        return _prevNode.__channel !== this.__channel
    }

    getTextContent(
        _includeInert?: boolean | undefined,
        _includeDirectionless?: false | undefined,
    ): string {
        return `#${this.__channel.label}`
    }

    getChannel() {
        return this.__channe
    }

    decorate(): JSX.Element {
        return <ChannelLink channel={this.__channel} />
    }
}

export const createChannelLinkTransformer = (channels: Channel[]): TextMatchTransformer => {
    const concat = channels.map((c) => c.label).join('|')

    return {
        dependencies: [ChannelMentionNode],
        export: (node) => {
            if (!$isChannelMentionNode(node)) {
                return null
            }
            return node.getChannel()
        },
        importRegExp: new RegExp('(#(' + concat + '))', 'i'),
        regExp: /(#[a-z0-9_-]+)$/i,
        replace: (textNode, match) => {
            const labelWithoutHash = match[1].replace('#', '')
            const ch = channels.find((c) => c.label === labelWithoutHash)
            if (!ch) {
                return
            }
            const linkNode = $createChannelMentionNode(ch)
            textNode.replace(linkNode)
        },
        trigger: '#',
        type: 'text-match',
    }
}

export function $createChannelMentionNode(channel: Channel): ChannelMentionNode {
    const node = new ChannelMentionNode(channel)
    return node
}

export function $isChannelMentionNode(
    node: LexicalNode | null | undefined,
): node is ChannelMentionNode {
    return node instanceof ChannelMentionNode
}
