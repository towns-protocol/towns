import { withProps } from '@udecode/cn'
import { Channel, useUserLookupContext } from 'use-towns-client'
import { AutoformatPlugin } from '@udecode/plate-autoformat/react'
import {
    BoldPlugin,
    CodePlugin,
    ItalicPlugin,
    StrikethroughPlugin,
    UnderlinePlugin,
} from '@udecode/plate-basic-marks/react'
import { BlockquotePlugin } from '@udecode/plate-block-quote/react'
import { ExitBreakPlugin, SoftBreakPlugin } from '@udecode/plate-break/react'
import { CodeBlockPlugin, CodeLinePlugin, CodeSyntaxPlugin } from '@udecode/plate-code-block/react'
import { Value } from '@udecode/plate-common'
import { ParagraphPlugin, PlateLeaf, createPlateEditor } from '@udecode/plate-common/react'
import { DocxPlugin } from '@udecode/plate-docx'
import { LinkPlugin } from '@udecode/plate-link/react'
import {
    BulletedListPlugin,
    ListItemContentPlugin,
    ListItemPlugin,
    ListPlugin,
    NumberedListPlugin,
} from '@udecode/plate-list/react'
import { MarkdownPlugin } from '@udecode/plate-markdown'
import { MentionInputPlugin, MentionPlugin } from '@udecode/plate-mention/react'
import { ResetNodePlugin } from '@udecode/plate-reset-node/react'
import { DeletePlugin } from '@udecode/plate-select'
import { TrailingBlockPlugin } from '@udecode/plate-trailing-block'

import { BlockquoteElement } from '../components/plate-ui/BlockquoteElement'
import { CodeBlockElement } from '../components/plate-ui/CodeBlockElement'
import { CodeLeaf } from '../components/plate-ui/CodeLeaf'
import { CodeLineElement } from '../components/plate-ui/CodeLineElement'
import { CodeSyntaxLeaf } from '../components/plate-ui/CodeSyntaxLeaf'
import { LinkElement } from '../components/plate-ui/LinkElement'
import { ListElement } from '../components/plate-ui/ListElement'
import { ChannelMentionElement } from '../components/plate-ui/ChannelMentionElement'
import { MentionElement } from '../components/plate-ui/MentionElement'
import { EmojiMentionElement } from '../components/plate-ui/EmojiMentionElement'
import { ComboboxContextWrapper } from '../components/plate-ui/autocomplete/ComboboxContextWrapper'
import { ComboboxInput } from '../components/plate-ui/autocomplete/ComboboxInputUser'
import { ParagraphElement } from '../components/plate-ui/ParagraphElement'
import { ChannelMentionPlugin, ELEMENT_MENTION_CHANNEL } from './createChannelPlugin'
import { UserMentionPlugin } from './createUserMentionPlugin'
import { autoformatRules } from './autoformat'
import { nodeResetRules } from './nodeReset'
import { EditorOverridesPlugin } from './createEditorOverridesPlugin'
import { FormatTextLinkPlugin, IOSPasteLinkPlugin } from './createFormatTextLinkPlugin'
import { PasteMentionsPlugin } from './createPasteMentionsPlugin'
import { ELEMENT_MENTION_EMOJI, EmojiMentionPlugin } from './createEmojiPlugin'
import { ErrorHandlingPlugin } from './createErrorHandlingPlugin'
import {
    TComboboxItemWithData,
    TMentionTicker,
    TUserIDNameMap,
    TUserWithChannel,
} from '../components/plate-ui/autocomplete/types'
import { getUrlHref, isBlockquoteWithEmptyLines, isExactlyUrl } from '../utils/helpers'
import { ELEMENT_MENTION_TICKER, TickerMentionPlugin } from './createTickerMentionPlugin'
import { TickerMentionElement } from '../components/plate-ui/TickerMentionElement'
import { InsertTickerMentionPlugin } from './createInsertTickerMentionPlugin'
import { PasteContractAddressPlugin } from './PasteContractAddressPlugin'
import { InsertAddressPlugin } from './createInsertAddressPlugin'
import { ContractAddressElement } from '../components/plate-ui/ContractAddressElement'
import { ContractAddressPlugin, ELEMENT_CONTRACT_ADDRESS } from './createContractAddressPlugin'

const createTownsEditor = (
    uniqueId: string,
    channelList: Channel[],
    userHashMap: TUserIDNameMap,
    getUserMentions: () => TComboboxItemWithData<TUserWithChannel>[],
    getChannelMentions: () => TComboboxItemWithData<Channel>[],
    initialValue: Value,
    lookupUser?: ReturnType<typeof useUserLookupContext>['lookupUser'],
    onSelectTicker?: (ticker: TMentionTicker) => void,
    onInsertAddress?: (address: string, chain: string) => void,
) =>
    createPlateEditor({
        plugins: [
            BlockquotePlugin,
            CodeBlockPlugin.configure({
                options: { syntax: false },
            }),
            LinkPlugin.configure({
                options: {
                    isUrl: isExactlyUrl,
                    getUrlHref,
                },
            }),
            PasteContractAddressPlugin,
            ParagraphPlugin,
            ListPlugin,
            BoldPlugin,
            ItalicPlugin,
            UnderlinePlugin,
            StrikethroughPlugin,
            CodePlugin.configure({
                options: { hotkey: '' },
            }),
            AutoformatPlugin.configure({
                options: {
                    rules: autoformatRules,
                    enableUndoOnDelete: true,
                },
            }),
            ExitBreakPlugin.configure({
                options: {
                    rules: [
                        {
                            hotkey: 'shift+enter',
                            query: {
                                allow: [CodeBlockPlugin.key],
                            },
                        },
                        {
                            hotkey: 'shift+enter',
                            query: {
                                allow: [BlockquotePlugin.key],
                                filter: isBlockquoteWithEmptyLines,
                            },
                        },
                    ],
                },
            }),
            SoftBreakPlugin.configure({
                options: {
                    rules: [
                        {
                            hotkey: 'shift+enter',
                            query: {
                                allow: [BlockquotePlugin.key],
                            },
                        },
                    ],
                },
            }),
            ChannelMentionPlugin,
            UserMentionPlugin,
            EmojiMentionPlugin,
            TickerMentionPlugin,
            ContractAddressPlugin,
            ResetNodePlugin.configure({
                options: {
                    rules: nodeResetRules,
                },
            }),
            DeletePlugin,
            TrailingBlockPlugin.configure({
                options: { type: 'p', allow: [BlockquotePlugin.key] },
            }),
            DocxPlugin,
            MarkdownPlugin,
            EditorOverridesPlugin,
            InsertTickerMentionPlugin({
                onInsertTickerMention: onSelectTicker,
            }),
            InsertAddressPlugin({
                onInsertAddress: onInsertAddress,
            }),
            ErrorHandlingPlugin,
            FormatTextLinkPlugin,
            IOSPasteLinkPlugin,
            PasteMentionsPlugin(channelList, userHashMap, lookupUser),
        ],
        override: {
            components: {
                [BlockquotePlugin.key]: BlockquoteElement,
                [CodeBlockPlugin.key]: CodeBlockElement,
                [CodeLinePlugin.key]: CodeLineElement,
                [CodeSyntaxPlugin.key]: CodeSyntaxLeaf,
                [LinkPlugin.key]: LinkElement,
                [BulletedListPlugin.key]: withProps(ListElement, { variant: 'ul' }),
                [NumberedListPlugin.key]: withProps(ListElement, { variant: 'ol' }),
                [ListItemPlugin.key]: withProps(ListElement, { variant: 'li' }),
                [ListItemContentPlugin.key]: withProps(ListElement, { variant: 'span' }),
                [MentionPlugin.key]: MentionElement,
                [ELEMENT_MENTION_CHANNEL]: ChannelMentionElement,
                [ELEMENT_MENTION_EMOJI]: EmojiMentionElement,
                [ELEMENT_MENTION_TICKER]: TickerMentionElement,
                [ELEMENT_CONTRACT_ADDRESS]: ContractAddressElement,
                [MentionInputPlugin.key]: withProps(ComboboxContextWrapper, {
                    Component: ComboboxInput,
                    getUserMentions,
                    getChannelMentions,
                }),
                [ParagraphPlugin.key]: ParagraphElement,
                [BoldPlugin.key]: withProps(PlateLeaf, { as: 'strong' }),
                [CodePlugin.key]: CodeLeaf,
                [ItalicPlugin.key]: withProps(PlateLeaf, {
                    as: 'em',
                    style: { fontStyle: 'italic' },
                }),

                [StrikethroughPlugin.key]: withProps(PlateLeaf, { as: 's' }),
                [UnderlinePlugin.key]: withProps(PlateLeaf, { as: 'u' }),
            },
        },
        id: uniqueId,
        value: initialValue,
        shouldNormalizeEditor: true,
    })

export default createTownsEditor
