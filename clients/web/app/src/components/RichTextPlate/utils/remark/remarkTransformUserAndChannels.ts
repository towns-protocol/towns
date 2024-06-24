import { Transformer } from 'unified'
import isEmpty from 'lodash/isEmpty'
import pick from 'lodash/pick'
import each from 'lodash/each'
import { EElementOrText, Value } from '@udecode/plate-common'
import { findAndReplace } from 'mdast-util-find-and-replace'
import { Channel, useUserLookupContext } from 'use-towns-client'
import { ELEMENT_MENTION } from '@udecode/plate-mention'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { ELEMENT_MENTION_CHANNEL } from '../../plugins/createChannelPlugin'
import {
    AtChannelUser,
    TChannelMentionElement,
    TUserIDNameMap,
    TUserMentionElement,
} from '../ComboboxTypes'

const SPACE_NODE = {
    type: 'text',
    value: ' ',
}

const userNameWithoutAt = (name: string) => name.replace(/^@/, '')
export type PasteTransformer = (fragment: EElementOrText<Value>[]) => EElementOrText<Value>[]
/**
 * Find #channel and @user in Markdown AST and convert them to
 * `TChannelMentionElement` or `TUserMentionElement` respectively.
 *
 * @param channelList - List of channels in the current space
 * @param userIDNameMap - List of mentions attached to message event, which means how many users are actually mentioned in
 * the message and their details DURING the time of message creation
 * @param lookupUser - a method to lookup user by userId
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
function remarkTransformUserAndChannels(
    channelList: Channel[],
    userIDNameMap: TUserIDNameMap,
    lookupUser?: ReturnType<typeof useUserLookupContext>['lookupUser'],
): (onPaste?: boolean) => Transformer

function remarkTransformUserAndChannels(
    channelList: Channel[],
    userIDNameMap: TUserIDNameMap,
    lookupUser?: ReturnType<typeof useUserLookupContext>['lookupUser'],
): (onPaste?: boolean) => PasteTransformer

function remarkTransformUserAndChannels(
    channelList: Channel[],
    userIDNameMap: TUserIDNameMap = {},
    lookupUser?: ReturnType<typeof useUserLookupContext>['lookupUser'],
) {
    return function (onPaste?: boolean) {
        const CHANNEL_TRIGGER = '#'
        // We allow channel names to have emoji characters, hence we use \p{Extended_Pictographic} instead of \w
        const CHANNEL_NAME_REGEX = '[-\\da-z_<a?:.+?:\\d{18}>|\\p{Extended_Pictographic}]{0,50}'
        const CHANNEL_ELEMENT_REGEX = new RegExp(
            `(?:^|\\s)${CHANNEL_TRIGGER}(${CHANNEL_NAME_REGEX})`,
            'gui',
        )

        const userIdList = Object.values(userIDNameMap)
        const USER_TRIGGER = '@'
        const USER_NAME_REGEX = userIdList
            .concat(AtChannelUser.displayName)
            .map((userDisplayName) =>
                userNameWithoutAt(userDisplayName).replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&'),
            )
            .join('|')

        const userIdNameCurrent = {
            [AtChannelUser.displayName]: pick(AtChannelUser, 'userId', 'displayName'),
        }

        each(userIDNameMap, (displayName, userId) => {
            const mentionDisplayName = userNameWithoutAt(displayName)
            const member = lookupUser?.(userId)
            userIdNameCurrent[mentionDisplayName] = {
                userId,
                displayName: !isEmpty(member?.displayName)
                    ? getPrettyDisplayName(member)
                    : mentionDisplayName,
            }
        })

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
            const user = userIdNameCurrent[userName]

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
                    children: [{ text: USER_TRIGGER + user.displayName }],
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
                    children: [{ text: value }],
                } as TChannelMentionElement,
                { ...SPACE_NODE },
            ]
        }

        type SanitizeFragmentType = {
            (mentionFragment: ReturnType<typeof transformChannel>): EElementOrText<Value>
            (mentionFragment: ReturnType<typeof transformUser>): EElementOrText<Value>
        }
        const sanitizeFragment: SanitizeFragmentType = (mentionFragment) => {
            if (mentionFragment.length === 1) {
                return { text: mentionFragment[0].value }
            }

            return mentionFragment.filter(
                (f) => f.type === ELEMENT_MENTION || f.type === ELEMENT_MENTION_CHANNEL,
            )[0] as EElementOrText<Value>
        }

        const recursivelyTransformMentions = (fragment: EElementOrText<Value>) => {
            if (Array.isArray(fragment.children)) {
                fragment.children = fragment.children.map(recursivelyTransformMentions)
            }

            if (!isEmpty(fragment.text) && typeof fragment.text === 'string') {
                if (fragment.text.match(USER_ELEMENT_REGEX)) {
                    fragment = sanitizeFragment(transformUser(fragment.text, ''))
                }
            }

            return fragment
        }

        /**
         * Transformer to find and replace user and channel mentions in the markdown AST using UnifiedJS
         * This is used to convert mentions in Timeline preview and during initial load of the editor from local storage
         * Called from `deserializeMd` in `utils/deserializeMD.ts` and `MarkdownToJSX` in `components/MarkdownToJSX.tsx`
         */
        const transformer: Transformer = (tree, _file) => {
            // eslint-disable-next-line
            // @ts-ignore
            findAndReplace(tree, [
                [CHANNEL_ELEMENT_REGEX, transformChannel],
                [USER_ELEMENT_REGEX, transformUser],
            ])
        }

        /**
         * Transformer to find and replace user and channel mentions in the Plate JS paste fragment manually
         * This is used to convert mentions when copied from other sources and pasted in the editor
         * Called from `createPasteMentionsPlugin` in `plugins/createPasteMentionsPlugin.ts`
         */
        const pasteTransformer: PasteTransformer = (fragment) => {
            if (!Array.isArray(fragment)) {
                return fragment
            }
            return fragment.map(recursivelyTransformMentions)
        }

        return onPaste ? pasteTransformer : transformer
    }
}

export default remarkTransformUserAndChannels
