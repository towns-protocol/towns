import { Handler } from 'mdast-util-to-hast'
import { ELEMENT_LIC } from '@udecode/plate-list'
import { ELEMENT_MENTION } from '@udecode/plate-mention'
import { MdastNode } from './remark'
import { ELEMENT_MENTION_CHANNEL } from '../plugins/createChannelPlugin'

export const userMentionHandler: Handler = (_, node) => ({
    type: 'element',
    tagName: ELEMENT_MENTION,
    value: String(node.value).trim(),
    children: node.children,
    properties: {},
})

export const channelMentionHandler: Handler = (_, node) => ({
    type: 'element',
    tagName: ELEMENT_MENTION_CHANNEL,
    value: String(node.value).trim(),
    children: node.children,
    channel: node.channel,
    properties: {},
})

export const listContentHandler: Handler = (_, node) => ({
    type: 'element',
    tagName: ELEMENT_LIC,
    value: node.value,
    children: node.children.map((child: MdastNode) => {
        if (child.type === ELEMENT_MENTION) {
            return userMentionHandler(_, child, node)
        } else if (child.type === ELEMENT_MENTION_CHANNEL) {
            return channelMentionHandler(_, child, node)
        }
        return child
    }),
    properties: {},
})
