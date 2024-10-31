import { HtmlPlugin } from '@udecode/plate-common'
import { createPlatePlugin } from '@udecode/plate-common/react'
import { Channel, useUserLookupContext } from 'use-towns-client'
import { isCodeBlockElement } from '../utils/helpers'
import remarkTransformUserAndChannels, {
    PasteTransformer,
} from '../utils/remark/remarkTransformUserAndChannels'
import { TUserIDNameMap } from '../components/plate-ui/autocomplete/types'

export const KEY_PASTE_MENTIONS_PLUGIN = 'KEY_PASTE_MENTIONS_PLUGIN'

/**
 * Invoked after user pastes text in editor. Enables pasting @mentions copied from Towns.
 */
export const PasteMentionsPlugin = (
    channelList: Channel[],
    userHashMap: TUserIDNameMap,
    lookupUser?: ReturnType<typeof useUserLookupContext>['lookupUser'],
) =>
    createPlatePlugin({
        key: KEY_PASTE_MENTIONS_PLUGIN,
        inject: {
            plugins: {
                // For handling pasting of text/html data
                [HtmlPlugin.key]: {
                    parser: {
                        // If we're pasting in a code block, ignore this plugin
                        query: ({ editor }) => {
                            return !isCodeBlockElement(editor)
                        },
                        transformFragment: ({ fragment }) => {
                            const transformMentions = remarkTransformUserAndChannels(
                                channelList,
                                userHashMap,
                                lookupUser,
                            )(true) as unknown as PasteTransformer
                            return transformMentions(fragment)
                        },
                    },
                },
            },
        },
    })
