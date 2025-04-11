import React from 'react'
import {
    AT_CHANNEL_MENTION,
    AT_CHANNEL_MENTION_DISPLAY,
    Channel,
    TownsStreamMember,
} from 'use-towns-client'
import { PluginConfig, TDescendant, TElement } from '@udecode/plate-common'
import { PlateElementProps } from '@udecode/plate-common/react'
import { TMentionElement } from '@udecode/plate-mention'
import { type TriggerComboboxPluginOptions } from '@udecode/plate-combobox'

export type ComboboxInputUserProps = Omit<ComboboxContainerProps, 'searchResults' | 'filter'> & {
    getUserMentions: () => TComboboxItemWithData<TUserWithChannel>[]
    getChannelMentions: () => TComboboxItemWithData<Channel>[]
    getTickerMentions: () => TComboboxItemWithData<TMentionTicker>[]
}

export type ComboboxContainerProps = PlateElementProps<TElement> & {
    query: string
    setQuery: (query: string) => void
    searchResults?: React.ReactNode
    resultsLength?: number
    filter?: FilterFn
}

export type ComboboxContextWrapperProps = ComboboxInputUserProps & {
    Component: (
        props: ComboboxInputUserProps & { ref?: React.ForwardedRef<never> },
    ) => React.ReactNode
}

export type FilterFn = (item: { keywords?: string[]; value: string }, search: string) => boolean
export type TUserIDNameMap = {
    [key: TownsStreamMember['displayName']]: TownsStreamMember['userId']
}
export type TMentionEmoji = { name: string; emoji: string }
export type TUserWithChannel = TownsStreamMember & { isChannelMember: boolean } & {
    atChannel?: boolean
}
export type TMentionTicker = {
    name: string
    symbol: string
    address: string
    chain: string
    marketCap: string
    priceUSD: string
    imageUrl: string
}
export type TMentionComboboxTypes = Channel | TUserWithChannel | TMentionEmoji | TMentionTicker
export type TComboboxAllData = Channel & TUserWithChannel & TMentionEmoji & TMentionTicker
export type TEmojiMentionElement = TMentionElement & { emoji: TMentionEmoji }
export type TChannelMentionElement = TMentionElement & { channel: Channel }
export type TTickerMentionElement = TMentionElement & { ticker: TMentionTicker }
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
    tickerMention = 'tickerMention',
}

export function isComboboxType(value: string): value is ComboboxTypes {
    return Object.values(ComboboxTypes).includes(value as ComboboxTypes)
}

export type TUserMention = TownsStreamMember & { atChannel?: boolean } // | { atRole?: number }
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

/**
 * Extended type definition from official PlateJS plugin
 * @see https://github.com/udecode/plate/blob/main/packages/mention/src/lib/BaseMentionPlugin.ts#L13
 */
export type TownsMentionConfig = PluginConfig<
    'mention',
    {
        insertSpaceAfterMention?: boolean
    } & TriggerComboboxPluginOptions,
    NonNullable<unknown>,
    {
        insert: {
            mention: (options: {
                item?: TComboboxItemWithData
                search: string
                value: string
            }) => void
        }
    }
>
