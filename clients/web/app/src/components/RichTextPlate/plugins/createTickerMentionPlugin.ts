import { toPlatePlugin } from '@udecode/plate-common/react'
import { createTSlatePlugin } from '@udecode/plate-common'
import { BaseMentionInputPlugin } from '@udecode/plate-mention'
import { withTriggerCombobox } from '@udecode/plate-combobox'

export const ELEMENT_MENTION_TICKER = 'mention_ticker'

const BaseTickerMentionPlugin = createTSlatePlugin({
    key: ELEMENT_MENTION_TICKER,
    extendEditor: withTriggerCombobox,
    node: { isElement: true, isInline: true, isMarkableVoid: true, isVoid: true },
    options: {
        createComboboxInput: (trigger: string) => ({
            children: [{ text: '' }],
            trigger,
            type: BaseMentionInputPlugin.key,
        }),
        trigger: '$',
        insertSpaceAfterMention: true,
        triggerPreviousCharPattern: /^\s?$/,
    },
    plugins: [BaseMentionInputPlugin],
})

export const TickerMentionPlugin = toPlatePlugin(BaseTickerMentionPlugin)

export const ELEMENT_CONTRACT_ADDRESS = 'contract_address'

const BaseContractAddressPlugin = createTSlatePlugin({
    key: ELEMENT_CONTRACT_ADDRESS,
    node: {
        isElement: true,
        isInline: true,
        isMarkableVoid: true,
        isVoid: true,
    },
})

export const ContractAddressPlugin = toPlatePlugin(BaseContractAddressPlugin)
