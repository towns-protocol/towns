import { TextMatchTransformer } from '@lexical/markdown'
import {
    DecoratorNode,
    EditorConfig,
    ElementFormatType,
    LexicalNode,
    SerializedLexicalNode,
    Spread,
} from 'lexical'

import React from 'react'
import { NavLink } from 'react-router-dom'
import { Channel, useSpaceData } from 'use-zion-client'
import { atoms } from 'ui/styles/atoms.css'
import { PATHS } from 'routes'

const ChannelLink = ({ channel }: { channel: Channel }) => {
    const spaceData = useSpaceData()
    const spaceSlug = spaceData?.id.streamId
    const channelSlug = channel.id.streamId
    return (
        <NavLink
            to={`/${PATHS.SPACES}/${spaceSlug}/${PATHS.CHANNELS}/${channelSlug}`}
            className={atoms({
                color: 'accent',
            })}
        >
            #{channel.label?.toLowerCase()}
        </NavLink>
    )
}

export type SerializedChannelLinkNode = Spread<
    {
        channel: Channel
        type: 'channelLink'
        version: 1
    },
    SerializedLexicalNode
>

/**
 * ChannelLinkNode is for rendering a #channel link within the timeline
 */
export class ChannelLinkNode extends DecoratorNode<JSX.Element> {
    __channel: Channel

    static getType(): string {
        return 'channelLink'
    }

    static clone(node: ChannelLinkNode): ChannelLinkNode {
        return new ChannelLinkNode({ channel: node.__channel }, node.__format)
    }

    static importJSON(serializedNode: SerializedChannelLinkNode): ChannelLinkNode {
        const node = $createChannelLinkNode(serializedNode.channel)
        return node
    }

    exportJSON(): SerializedChannelLinkNode {
        return {
            ...super.exportJSON(),
            channel: this.__channel,
            type: 'channelLink',
            version: 1,
        }
    }

    constructor({ channel }: { channel: Channel }, format?: ElementFormatType) {
        super(format)
        this.__channel = channel
    }

    createDOM(config: EditorConfig): HTMLElement {
        const div = document.createElement('div')
        div.style.display = 'contents'
        return div
    }

    updateDOM(_prevNode: ChannelLinkNode, _dom: HTMLElement, _config: EditorConfig): boolean {
        return _prevNode.__channel !== this.__channel
    }

    getTextContent(
        _includeInert?: boolean | undefined,
        _includeDirectionless?: false | undefined,
    ): string {
        return this.__channel.label
    }

    getChannel(): Channel {
        return this.__channel
    }

    decorate(): JSX.Element {
        return <ChannelLink channel={this.__channel} />
    }
}

export function $createChannelLinkNode(channel: Channel): ChannelLinkNode {
    return new ChannelLinkNode({ channel })
}

export function $isChannelLinkNode(node: LexicalNode | null | undefined): node is ChannelLinkNode {
    return node instanceof ChannelLinkNode
}

export const createChannelLinkTransformer = (channels: Channel[]): TextMatchTransformer => {
    const concat = channels.map((c) => c.label).join('|')

    return {
        dependencies: [ChannelLinkNode],
        export: (node) => {
            if (!$isChannelLinkNode(node)) {
                return null
            }
            return node.getChannel().label
        },
        importRegExp: new RegExp('(#(' + concat + '))', 'i'),
        regExp: /(#[a-z0-9_-]+)$/i,
        replace: (textNode, match) => {
            // TODO: there is probably better way to do this by
            // 1. Using $createChannelLinkNode within ChannelMentionPlugin instead of $createChannelMentionNode
            // 2. Saving the JSON or HTML with the entire channel data or data-attrs with channel slug
            // But using $createChannelLinkNode in ChannelMentionPlugin, can't get the content to render in timeline
            const labelWithoutHash = match[1].replace('#', '')
            const ch = channels.find((c) => c.label === labelWithoutHash)
            if (!ch) {
                return
            }
            const linkNode = $createChannelLinkNode(ch)
            textNode.replace(linkNode)
        },
        trigger: '#',
        type: 'text-match',
    }
}
