import {
    AT_CHANNEL_MENTION,
    AT_CHANNEL_MENTION_DISPLAY,
    Channel,
    RoomMember,
} from 'use-towns-client'
import { TDescendant } from '@udecode/plate-common'
import { TMentionElement } from '@udecode/plate-mention'

export type TMentionEmoji = { name: string; emoji: string }
export type TUserWithChannel = RoomMember & { isChannelMember: boolean } & { atChannel?: boolean }
export type TMentionComboboxTypes = Channel | TUserWithChannel | TMentionEmoji
export type TComboboxAllData = Channel & TUserWithChannel & TMentionEmoji
export type TEmojiMentionElement = TMentionElement & { emoji: TMentionEmoji }
export type TChannelMentionElement = TMentionElement & { channel: Channel }
export type TUserMentionElement = TDescendant &
    TMentionElement & {
        userId: string
        atChannel?: boolean
        children: TUserMentionElement
    }

export const MOCK_EMOJI = '__mock_emoji__'

export enum ComboboxTypes {
    userMention = 'userMention',
    channelMention = 'channelMention',
    emojiMention = 'emojiMention',
}

export function isComboboxType(value: string): value is ComboboxTypes {
    return Object.values(ComboboxTypes).includes(value as ComboboxTypes)
}

export type TUserMention = RoomMember & { atChannel?: boolean } // | { atRole?: number }
export type TUserNameId = { displayName: string; userId: string }

export const AtChannelUser: TUserMention = {
    userId: AT_CHANNEL_MENTION,
    username: AT_CHANNEL_MENTION_DISPLAY,
    avatarUrl: '',
    displayName: AT_CHANNEL_MENTION_DISPLAY,
    displayNameEncrypted: false,
    usernameConfirmed: false,
    usernameEncrypted: false,
    atChannel: true,
}
