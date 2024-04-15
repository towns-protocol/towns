import React, { PropsWithChildren, useMemo } from 'react'
import { AT_CHANNEL_MENTION } from 'use-towns-client'
import { Avatar } from '@components/Avatar/Avatar'
import { ComboboxTypes, TComboboxAllData, TMentionComboboxTypes } from '../../utils/ComboboxTypes'

const ComboboxUserIcon = ({ userId }: TComboboxAllData) => {
    return useMemo(() => {
        if (userId === AT_CHANNEL_MENTION) {
            return <Avatar size="avatar_sm" icon="at" iconSize="square_xs" />
        }
        return <Avatar size="avatar_sm" userId={userId} />
    }, [userId])
}

const ComboboxEmojiIcon = ({ emoji }: TComboboxAllData) => <span>{emoji}</span>

const ComboboxChannelIcon = (_: TComboboxAllData) => (
    <Avatar icon="tag" size="avatar_sm" iconSize="square_xs" />
)

const ComboboxIconRenderer = {
    [ComboboxTypes.userMention]: ComboboxUserIcon,
    [ComboboxTypes.emojiMention]: ComboboxEmojiIcon,
    [ComboboxTypes.channelMention]: ComboboxChannelIcon,
}

export const ComboboxIcon = <T extends TMentionComboboxTypes>({
    item,
    comboboxType,
}: PropsWithChildren<{ item: T; comboboxType: ComboboxTypes }>) => {
    const Icon = ComboboxIconRenderer[comboboxType]

    return <Icon {...(item as TComboboxAllData)} />
}
