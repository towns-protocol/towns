import { ELEMENT_MENTION } from '@udecode/plate-mention'
import { findAndReplace } from 'mdast-util-find-and-replace'
import { Channel } from 'use-towns-client'
import { ELEMENT_MENTION_CHANNEL } from '../../plugins/createChannelPlugin'

const userGroup = '[\\da-z][-\\da-z_]{0,50}'
const mentionRegex = new RegExp('(?:^|\\s)(@|#)(' + userGroup + ')', 'gi')

const remarkUserMention =
    (channels: Channel[]) =>
    (opts = { usernameLink: (username: string) => `${username}` }) => {
        const replaceMention = (value: string, selection: string) => {
            const whitespace = []
            const isChannel = value.includes('#')
            // Separate leading white space
            if (value.indexOf(isChannel ? '#' : '@') > 0) {
                whitespace.push({
                    type: 'text',
                    value: value.substring(0, value.indexOf(isChannel ? '#' : '@')),
                })
            }

            if (isChannel) {
                const channelName = value.split('#')[1]
                const channel = channels.find((c) => c.label === channelName)
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
                    },
                ]
            }

            return [
                ...whitespace,
                {
                    value,
                    type: ELEMENT_MENTION,
                    userId: opts.usernameLink(selection),
                    children: [{ text: '' }],
                },
            ]
        }

        // eslint-disable-next-line
        // @ts-ignore
        return (tree, _file) => {
            // eslint-disable-next-line
            // @ts-ignore
            findAndReplace(tree, [[mentionRegex, replaceMention]])
        }
    }

export default remarkUserMention
