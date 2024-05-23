import { ELEMENT_MENTION } from '@udecode/plate-mention'
import { TComboboxItem } from '@udecode/plate-combobox'
import { Mention } from 'use-towns-client'
import { ComboboxTypes, TUserMentionElement, TUserWithChannel } from './ComboboxTypes'

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

export const userMentionFilter = (query: string) => (item: TComboboxItem<TUserWithChannel>) =>
    [item.data.username, item.data.displayName]
        .join(' ')
        .toLowerCase()
        .includes(query.toLowerCase())

export const getUsernameForMention = <T extends TUserWithChannel>(
    comboboxType: ComboboxTypes,
    item: TComboboxItem<T>,
): string | undefined => {
    if (comboboxType !== ComboboxTypes.userMention || item.data.atChannel) {
        return undefined
    }

    return item.data.username ? `@${item.data.username}` : undefined
}
