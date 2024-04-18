import { Handler } from 'mdast-util-to-hast'
import { ELEMENT_LIC } from '@udecode/plate-list'
import { ELEMENT_MENTION } from '@udecode/plate-mention'
import { ELEMENT_MENTION_CHANNEL } from '../plugins/createChannelPlugin'

export const userMentionHandler: Handler = (state, node) => ({
    type: 'element',
    tagName: ELEMENT_MENTION,
    value: String(node.value).trim(),
    userId: node.userId,
    children: state.all(node),
    properties: {},
})

export const channelMentionHandler: Handler = (state, node) => ({
    type: 'element',
    tagName: ELEMENT_MENTION_CHANNEL,
    value: String(node.value).trim(),
    children: state.all(node),
    channel: node.channel,
    properties: {},
})

export const listContentHandler: Handler = (state, node) => {
    node.type = 'element'
    node.tagName = ELEMENT_LIC
    node.children = state.all(node)
    return node
}
