import { Channel, Mention } from 'use-towns-client'
import { PlateEditor, Value } from '@udecode/plate-common'
import {
    ELEMENT_MENTION,
    MentionOnSelectItem,
    getMentionOnSelectItem,
} from '@udecode/plate-mention'
import { UserWithDisplayName, getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import {
    ComboboxTypes,
    TComboboxItemWithData,
    TUserIDNameMap,
    TUserMentionElement,
    TUserWithChannel,
} from './types'
import { ELEMENT_MENTION_CHANNEL } from '../../../plugins/createChannelPlugin'

export const MAX_AUTOCOMPLETE_SUGGESTIONS = 15

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

export const userMentionFilter =
    (query: string) =>
    (item: TComboboxItemWithData<TUserWithChannel>): boolean =>
        [item.data.username, item.data.displayName, item.data.ensName]
            .join(' ')
            .toLowerCase()
            .includes(query.toLowerCase())

export const channelMentionFilter =
    (query: string) =>
    (item: TComboboxItemWithData<Channel>): boolean =>
        item.data.label.toLowerCase().includes(query.toLowerCase())

export const getUsernameForMention = <T extends TUserWithChannel>(
    comboboxType: ComboboxTypes,
    item: TComboboxItemWithData<T>,
): string | undefined => {
    if (comboboxType !== ComboboxTypes.userMention || item.data.atChannel) {
        return undefined
    }

    return item.data.username ? `@${item.data.username}` : undefined
}

export const getUserIdNameMap = (
    users: (Omit<UserWithDisplayName, 'userId'> & { userId?: string })[],
): TUserIDNameMap => {
    if (!Array.isArray(users)) {
        return {}
    }
    const map: TUserIDNameMap = {}
    users.forEach((user) => {
        if (user.userId) {
            map[user.userId] = getPrettyDisplayName(user as UserWithDisplayName, true)
        }
    })
    return map
}

const onSelectItemUser: MentionOnSelectItem<TComboboxItemWithData> = getMentionOnSelectItem({
    key: ELEMENT_MENTION,
})
const onSelectItemChannel: MentionOnSelectItem<TComboboxItemWithData> = getMentionOnSelectItem({
    key: ELEMENT_MENTION_CHANNEL,
})
/**
 * On select emoji, insert the emoji as text into the editor, instead of creating a complex element as required for @user #channel mention.
 */
const onSelectItemEmoji: MentionOnSelectItem<TComboboxItemWithData> = (
    editor: PlateEditor<Value>,
    item,
    _search?,
) => {
    editor.insertText(`${item.key} `)
}

export const onMentionSelectTriggerMap = (trigger: string) => {
    return {
        '@': onSelectItemUser,
        '#': onSelectItemChannel,
        ':': onSelectItemEmoji,
    }[trigger]
}
