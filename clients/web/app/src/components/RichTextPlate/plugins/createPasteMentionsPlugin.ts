import { KEY_DESERIALIZE_HTML, createPluginFactory } from '@udecode/plate-common'
import { Channel, useUserLookupContext } from 'use-towns-client'
import remarkTransformUserAndChannels, {
    PasteTransformer,
} from '../utils/remark/remarkTransformUserAndChannels'
import { TUserIDNameMap } from '../utils/ComboboxTypes'

export const KEY_PASTE_MENTIONS_PLUGIN = 'KEY_PASTE_MENTIONS_PLUGIN'

/**
 * Invoked after user pastes text in editor. Enables pasting @mentions copied from Towns.
 */
export const createPasteMentionsPlugin = (
    channelList: Channel[],
    mentions: TUserIDNameMap,
    lookupUser?: ReturnType<typeof useUserLookupContext>['lookupUser'],
) =>
    createPluginFactory({
        key: KEY_PASTE_MENTIONS_PLUGIN,
        then: (_editor) => ({
            inject: {
                pluginsByKey: {
                    [KEY_DESERIALIZE_HTML]: {
                        editor: {
                            insertData: {
                                transformFragment: (fragment, { data }) => {
                                    const transformMentions = remarkTransformUserAndChannels(
                                        channelList,
                                        mentions,
                                        lookupUser,
                                    )(true) as unknown as PasteTransformer
                                    return transformMentions(fragment)
                                },
                            },
                        },
                    },
                },
            },
        }),
    })
