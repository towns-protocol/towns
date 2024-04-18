import { ELEMENT_MENTION } from '@udecode/plate-mention'
import { Mention } from 'use-towns-client'
import { TUserMentionElement } from './ComboboxTypes'

/**
 * @desc Recursively go through the nodes to extract all the `Mention` nodes
 */
export const getMentions = (children: TUserMentionElement[]): Mention[] => {
    const mentions: Mention[] = []
    children.map((node) => recursivelyGetNameAndId(node, mentions))
    return mentions
}

const recursivelyGetNameAndId = (node: TUserMentionElement, mentions: Mention[]) => {
    if (Array.isArray(node.children) && node.children.length > 0) {
        node.children.map((n) => recursivelyGetNameAndId(n as TUserMentionElement, mentions))
    }

    if (node.type === ELEMENT_MENTION) {
        mentions.push({
            displayName: (node as TUserMentionElement).value,
            userId: (node as TUserMentionElement).userId,
            atChannel: (node as TUserMentionElement).atChannel,
        })
    }
}
