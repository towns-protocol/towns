import { Transformer } from 'unified'
import isEmpty from 'lodash/isEmpty'
import pick from 'lodash/pick'
import { findAndReplace } from 'mdast-util-find-and-replace'
import { Channel, OTWMention, RoomMember } from 'use-towns-client'
import { ELEMENT_MENTION } from '@udecode/plate-mention'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { ELEMENT_MENTION_CHANNEL } from '../../plugins/createChannelPlugin'
import { AtChannelUser, TChannelMentionElement, TUserMentionElement } from '../ComboboxTypes'

const SPACE_NODE = {
    type: 'text',
    value: ' ',
}

const userNameWithoutAt = (name: string) => name.replace(/^@/, '')

/**
 * Find #channel and @user in Markdown AST and convert them to
 * `TChannelMentionElement` or `TUserMentionElement` respectively.
 *
 * @param channelList - List of channels in the current space
 * @param mentions - List of mentions attached to message event, which means how many users are actually mentioned in
 * the message and their details DURING the time of message creation
 * @param users - List of users in the current space
 *
 * @description 1. add special mention for `@channel` because the data type returned from backend has no
 * displayName/userId for it
 *
 * 2. create regex pattern for all user mentions by their display names.
 *
 * 3. We also create a map of user display names to their userIds and override the old displayName with the new one if it exists in the users list.
 *
 * 4. Loop through the tree and replace the user and channel mentions with the corresponding elements.
 *
 * @see TChannelMentionElement
 * @see TUserMention
 */
const remarkTransformUserAndChannels =
    (channelList: Channel[], mentions: OTWMention[] = [], users: RoomMember[] = []) =>
    () => {
        const mentionsWithChannel = [
            pick(AtChannelUser, 'userId', 'displayName') as OTWMention,
        ].concat(mentions)

        const CHANNEL_TRIGGER = '#'
        const CHANNEL_NAME_REGEX = '[\\da-z][-\\da-z_]{0,50}'
        const CHANNEL_ELEMENT_REGEX = new RegExp(
            `(?:^|\\s)${CHANNEL_TRIGGER}(${CHANNEL_NAME_REGEX})`,
            'gi',
        )

        const USER_TRIGGER = '@'
        const USER_NAME_REGEX = mentionsWithChannel
            .map((user) =>
                userNameWithoutAt(user.displayName).replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&'),
            )
            .join('|')
        const USER_NAME_ID_MAP = mentionsWithChannel.reduce((acc, user) => {
            if (user.userId) {
                const mentionDisplayName = userNameWithoutAt(user.displayName)
                const member = users.find((m) => m.userId === user.userId)
                acc[mentionDisplayName] = {
                    ...user,
                    displayName: !isEmpty(member?.displayName)
                        ? getPrettyDisplayName(member)
                        : mentionDisplayName,
                }
            }
            return acc
        }, {} as Record<string, OTWMention>)

        const USER_ELEMENT_REGEX = new RegExp(
            `(${USER_TRIGGER}(${USER_NAME_REGEX})(?=\\s|[^a-z0-9_-]|$))`,
            'ig',
        )

        const transformUser = (value: string, selection: string) => {
            const whitespace = []
            if (value.indexOf(USER_TRIGGER) > 0) {
                whitespace.push({
                    type: 'text',
                    value: value.substring(0, value.indexOf(USER_TRIGGER)),
                })
            }
            const userName = value.split(USER_TRIGGER)[1]
            const user = USER_NAME_ID_MAP[userName]

            if (!user) {
                return [
                    {
                        type: 'text',
                        value,
                    },
                ]
            }

            return [
                ...whitespace,
                {
                    userId: user.userId,
                    value: USER_TRIGGER + user.displayName,
                    type: ELEMENT_MENTION,
                    children: [{ text: '' }],
                } as TUserMentionElement,
                { ...SPACE_NODE },
            ]
        }

        const transformChannel = (value: string, selection: string) => {
            const whitespace = []
            if (value.indexOf(CHANNEL_TRIGGER) > 0) {
                whitespace.push({
                    type: 'text',
                    value: value.substring(0, value.indexOf(CHANNEL_TRIGGER)),
                })
            }
            const channelName = value.split(CHANNEL_TRIGGER)[1]
            const channel = channelList.find((c) => c.label === channelName)
            if (!channel) {
                return [
                    {
                        type: 'text',
                        value,
                    },
                ]
            }

            return [
                ...whitespace,
                {
                    type: ELEMENT_MENTION_CHANNEL,
                    channel,
                    value,
                    children: [{ text: '' }],
                } as TChannelMentionElement,
                { ...SPACE_NODE },
            ]
        }

        const transformer: Transformer = (tree, _file) => {
            // eslint-disable-next-line
            // @ts-ignore
            findAndReplace(tree, [
                [CHANNEL_ELEMENT_REGEX, transformChannel],
                [USER_ELEMENT_REGEX, transformUser],
            ])
        }

        return transformer
    }

export default remarkTransformUserAndChannels
