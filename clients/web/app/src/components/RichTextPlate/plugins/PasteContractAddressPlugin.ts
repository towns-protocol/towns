import { TPlateEditor, createPlatePlugin } from '@udecode/plate-common/react'
import { PublicKey } from '@solana/web3.js'
import {
    getBlockAbove,
    insertNodes,
    insertText,
    isEndPoint,
    moveSelection,
} from '@udecode/plate-common'
import { ELEMENT_CONTRACT_ADDRESS } from './createTickerMentionPlugin'
import { TContractAddressElement } from '../components/plate-ui/autocomplete/types'

export const PasteContractAddressPlugin = createPlatePlugin({
    key: 'ethAddressPlugin',
    extendEditor: ({ editor }: { editor: TPlateEditor }) => {
        const { insertData } = editor

        editor.insertData = (data) => {
            const text = data.getData('text/plain')?.trim()

            if (!text || !pseudoContract.test(text)) {
                insertData(data)
                return editor
            }

            const chain = getContractChain(text)

            if (!chain) {
                insertData(data)
                return editor
            }

            insertNodes<TContractAddressElement>(editor, [
                {
                    type: ELEMENT_CONTRACT_ADDRESS,
                    value: text,
                    address: text,
                    chain: chain,
                    children: [{ text: '' }],
                },
            ])

            // move the selection after the element
            moveSelection(editor, { unit: 'offset' })

            const pathAbove = getBlockAbove(editor)?.[1]

            const isBlockEnd =
                editor.selection &&
                pathAbove &&
                isEndPoint(editor, editor.selection.anchor, pathAbove)

            if (isBlockEnd) {
                insertText(editor, ' ')
            }

            return
        }

        return editor
    },
})

const pseudoContract = /^([a-f0-9]{40}|[a-z0-9]{32,44})$/i

export const getContractChain = (text: string) => {
    return isEthAddress(text) ? '8453' : isSolanaAddress(text) ? 'solana-mainnet' : null
}

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/

const isEthAddress = (text: string) => {
    return ETH_ADDRESS_REGEX.test(text.trim())
}

const isSolanaAddress = (text: string) => {
    return PublicKey.isOnCurve(text.trim())
}
