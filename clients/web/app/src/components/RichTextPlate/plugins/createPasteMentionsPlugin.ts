import { KEY_DESERIALIZE_HTML, createPluginFactory } from '@udecode/plate-common'
import { Channel, useUserLookupContext } from 'use-towns-client'
import remarkTransformUserAndChannels, {
    PasteTransformer,
} from '../utils/remark/remarkTransformUserAndChannels'
import { TUserIDNameMap } from '../components/plate-ui/autocomplete/types'
import { deserializeMd } from '../utils/deserializeMD'

export const KEY_PASTE_MENTIONS_PLUGIN = 'KEY_PASTE_MENTIONS_PLUGIN'

/**
 * Invoked after user pastes text in editor. Enables pasting @mentions copied from Towns.
 */
export const createPasteMentionsPlugin = (
    channelList: Channel[],
    userHashMap: TUserIDNameMap,
    lookupUser?: ReturnType<typeof useUserLookupContext>['lookupUser'],
) =>
    createPluginFactory({
        key: KEY_PASTE_MENTIONS_PLUGIN,
        editor: {
            insertData: {
                // For handling pasting of text/plain data (mobile, etc.)
                format: 'text/plain',
                getFragment: ({ data }) => {
                    return deserializeMd(data, channelList, userHashMap, lookupUser)
                },
            },
        },
        then: (_editor) => ({
            inject: {
                pluginsByKey: {
                    // For handling pasting of text/html data
                    [KEY_DESERIALIZE_HTML]: {
                        editor: {
                            insertData: {
                                transformFragment: (fragment, { data }) => {
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
            },
        }),
    })
