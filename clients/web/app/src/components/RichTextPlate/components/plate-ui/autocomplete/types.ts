import React from 'react'
import {
    AT_CHANNEL_MENTION,
    AT_CHANNEL_MENTION_DISPLAY,
    Channel,
    RoomMember,
} from 'use-towns-client'
import { PlateRenderElementProps, TDescendant, Value } from '@udecode/plate-common'
import { TMentionElement, TMentionInputElement } from '@udecode/plate-mention'

export type ComboboxInputUserProps = Omit<ComboboxContainerProps, 'searchResults' | 'filter'> & {
    userMentions: TComboboxItemWithData<TUserWithChannel>[]
    channelMentions: TComboboxItemWithData<Channel>[]
}

export type ComboboxContainerProps = PlateRenderElementProps<Value, TMentionInputElement> & {
    query: string
    setQuery: (query: string) => void
    searchResults?: React.ReactNode
    resultsLength?: number
    filter?: FilterFn
}

export type ComboboxContextWrapperProps = ComboboxInputUserProps & {
    Component: (
        props: ComboboxInputUserProps & { ref?: React.ForwardedRef<HTMLDivElement> },
    ) => React.ReactNode
}

export type FilterFn = (item: { keywords?: string[]; value: string }, search: string) => boolean
export type TUserIDNameMap = { [key: RoomMember['displayName']]: RoomMember['userId'] }
export type TMentionEmoji = { name: string; emoji: string }
export type TUserWithChannel = RoomMember & { isChannelMember: boolean } & { atChannel?: boolean }
export type TMentionComboboxTypes = Channel | TUserWithChannel | TMentionEmoji
export type TComboboxAllData = Channel & TUserWithChannel & TMentionEmoji
export type TEmojiMentionElement = TMentionElement & { emoji: TMentionEmoji }
export type TChannelMentionElement = TMentionElement & { channel: Channel }
export type TComboboxItemWithData<T = TMentionComboboxTypes> = {
    key: string
    text: string
    data: T
}

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
