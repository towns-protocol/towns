import { Handler } from 'mdast-util-to-hast'
import { ListItemContentPlugin } from '@udecode/plate-list/react'
import { MentionPlugin } from '@udecode/plate-mention/react'
import { ELEMENT_MENTION_CHANNEL } from '../plugins/createChannelPlugin'
import { ELEMENT_MENTION_TICKER } from '../plugins/createTickerMentionPlugin'
import { ELEMENT_EDITED } from './remark/remarkEditedAnnotation'
import { ELEMENT_CONTRACT_ADDRESS } from '../plugins/createContractAddressPlugin'

export const userMentionHandler: Handler = (state, node) => ({
    type: 'element',
    tagName: MentionPlugin.key,
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

export const tickerMentionHandler: Handler = (state, node) => ({
    type: 'element',
    tagName: ELEMENT_MENTION_TICKER,
    value: String(node.value).trim(),
    children: state.all(node),
    ticker: node.ticker,
    properties: {},
})

export const contractAddressHandler: Handler = (state, node) => ({
    type: 'element',
    tagName: ELEMENT_CONTRACT_ADDRESS,
    address: String(node.address).trim(),
    value: String(node.value).trim(),
    children: state.all(node),
    properties: {},
})

export const listContentHandler: Handler = (state, node) => {
    node.type = 'element'
    node.tagName = ListItemContentPlugin.key
    node.children = state.all(node)
    return node
}

export const editedHandler: Handler = (state, node) => {
    node.type = 'element'
    node.tagName = ELEMENT_EDITED
    node.children = state.all(node)
    return node
}
