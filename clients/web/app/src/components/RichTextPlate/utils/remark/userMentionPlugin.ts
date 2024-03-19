import { ELEMENT_MENTION } from '@udecode/plate-mention'
import { findAndReplace } from 'mdast-util-find-and-replace'
import { ELEMENT_MENTION_CHANNEL } from '../../plugins/createChannelPlugin'

const userGroup = '[\\da-z][-\\da-z_]{0,38}'
const mentionRegex = new RegExp('(?:^|\\s)(@|#)(' + userGroup + ')', 'gi')

export default function remarkUserMention(
    opts = { usernameLink: (username: string) => `${username}` },
) {
    // eslint-disable-next-line
    // @ts-ignore
    return (tree, _file) => {
        // eslint-disable-next-line
        // @ts-ignore
        findAndReplace(tree, [[mentionRegex, replaceMention]])
    }

    function replaceMention(value: string, selection: string) {
        const whitespace = []
        const isChannel = value.includes('#')
        // Separate leading white space
        if (value.indexOf(isChannel ? '#' : '@') > 0) {
            whitespace.push({
                type: 'text',
                value: value.substring(0, value.indexOf(isChannel ? '#' : '@')),
            })
        }

        return [
            ...whitespace,
            {
                type: isChannel ? ELEMENT_MENTION_CHANNEL : ELEMENT_MENTION,
                userId: isChannel ? undefined : opts.usernameLink(selection),
                channel: isChannel ? { label: value.split('#')[1] } : undefined,
                value,
                children: [{ text: '' }],
            },
        ]
    }
}
