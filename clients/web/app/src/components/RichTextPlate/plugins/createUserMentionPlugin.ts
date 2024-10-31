import { toPlatePlugin } from '@udecode/plate-common/react'
import { BaseMentionPlugin } from '@udecode/plate-mention'

const BaseUserMentionPlugin = BaseMentionPlugin.extend({
    options: {
        insertSpaceAfterMention: true,
    },
})

export const UserMentionPlugin = toPlatePlugin(BaseUserMentionPlugin)
