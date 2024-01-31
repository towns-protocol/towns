import { useMemo } from 'react'
import { Channel, RoomMember } from 'use-zion-client'
import isEqual from 'lodash/isEqual'
import { CHECK_LIST, HEADING, LINK, TRANSFORMERS } from '@lexical/markdown'
import { createMentionTransformer } from '@components/RichText/nodes/MentionNode'
import { createChannelLinkTransformer } from '@components/RichText/nodes/ChannelLinkNode'
import { createHighlightTransformer } from '@components/RichText/nodes/HightlightNode'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { notUndefined } from 'ui/utils/utils'
import { BLANK_LINK } from '../transformers/LinkTransformer'

interface IUseTransformers {
    members: RoomMember[]
    channels: Channel[]
    highlightTerms?: string[]
}

// either we filter out, or selectively import if this filter list gets too large
const filteredDefaultTransforms = TRANSFORMERS.filter((t) => !isEqual(t, HEADING))
    // map all links to custom, with target="_blank"
    .map((t) => (isEqual(t, LINK) ? BLANK_LINK : t))

export const useTransformers = ({ members, channels, highlightTerms }: IUseTransformers) => {
    const filteredChannels = channels.filter((c) => notUndefined(c) && c.label.length > 1)
    const transformers = useMemo(() => {
        const names = members
            .filter((m) => notUndefined(m.displayName))
            .map((m) => ({ displayName: getPrettyDisplayName(m), userId: m.userId }))

        return [
            createMentionTransformer(names),
            filteredChannels.length ? createChannelLinkTransformer(filteredChannels) : undefined,
            CHECK_LIST,
            ...filteredDefaultTransforms,
            ...(highlightTerms?.length ? [createHighlightTransformer(highlightTerms)] : []),
        ].filter(notUndefined)
    }, [filteredChannels, highlightTerms, members])
    return { transformers }
}
