import { useMemo } from 'react'
import uniq from 'lodash/uniq'
import { Channel, useChannelMembers, useUserLookupArray } from 'use-towns-client'
import { isDMChannelStreamId, isGDMChannelStreamId } from '@river-build/sdk'
import { notUndefined } from 'ui/utils/utils'
import { convertUserToCombobox, getUserHashMap } from '../components/plate-ui/autocomplete/helpers'
import {
    AtChannelUser,
    TComboboxItemWithData,
    TUserIDNameMap,
    TUserWithChannel,
} from '../components/plate-ui/autocomplete/types'

export const useEditorMemberData = (spaceMemberIds: string[], channelId: string) => {
    const { memberIds: channelMemberIds } = useChannelMembers()
    const isDMorGDM = useMemo(
        () => isDMChannelStreamId(channelId) || isGDMChannelStreamId(channelId),
        [channelId],
    )
    const availableMemberIds = useMemo(
        () => uniq([...channelMemberIds, ...spaceMemberIds]),
        [channelMemberIds, spaceMemberIds],
    )
    const availableMembers = useUserLookupArray(availableMemberIds)

    // Array of users which is used to show the autocomplete popup on @
    const userMentions: TComboboxItemWithData<TUserWithChannel>[] = useMemo(() => {
        return (isDMorGDM ? [] : [AtChannelUser])
            .concat(availableMembers)
            .map((user) => convertUserToCombobox(user, channelMemberIds))
            .filter(notUndefined)
    }, [isDMorGDM, availableMembers, channelMemberIds])

    // Hash map of user's displayName and userId. This is used to easily lookup and
    // convert @name mention to userId while pasting and editing in O(1) time
    const userHashMap: TUserIDNameMap = useMemo(() => {
        return getUserHashMap(availableMembers)
    }, [availableMembers])

    return { userMentions, userHashMap }
}

export const useEditorChannelData = (channels: Channel[]) => {
    const channelMentions: TComboboxItemWithData<Channel>[] = useMemo(() => {
        return channels
            .map((channel) => ({
                text: channel.label,
                key: channel.id,
                data: channel,
            }))
            .filter(notUndefined)
    }, [channels])

    return { channelMentions }
}
