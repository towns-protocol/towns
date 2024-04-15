import { TDescendant } from '@udecode/plate-common'
import { ELEMENT_MENTION, TMentionElement } from '@udecode/plate-mention'
import { Mention } from 'use-towns-client'

export type MyMentionElement = TDescendant &
    TMentionElement & { userId: string; atChannel?: boolean; children: MyMentionElement }

/**
 * @desc Recursively go through the nodes to extract all the `Mention` nodes
 */
export const getMentions = (children: MyMentionElement[]): Mention[] => {
    const mentions: Mention[] = []
    children.map((node) => recursivelyGetNameAndId(node, mentions))
    return mentions
}

const recursivelyGetNameAndId = (node: MyMentionElement, mentions: Mention[]) => {
    if (Array.isArray(node.children) && node.children.length > 0) {
        node.children.map((n) => recursivelyGetNameAndId(n as MyMentionElement, mentions))
    }

    if (node.type === ELEMENT_MENTION) {
        mentions.push({
            displayName: (node as MyMentionElement).value,
            userId: (node as MyMentionElement).userId,
            atChannel: (node as MyMentionElement).atChannel,
        })
    }
}
