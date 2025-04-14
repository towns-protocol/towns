import { TPlateEditor, createPlatePlugin } from '@udecode/plate-common/react'
import { PublicKey } from '@solana/web3.js'
import {
    getBlockAbove,
    insertNodes,
    insertText,
    isEndPoint,
    moveSelection,
} from '@udecode/plate-common'
import { isAddress } from '@components/Web3/Wallet/useGetWalletParam'
import { ELEMENT_CONTRACT_ADDRESS } from './createTickerMentionPlugin'
import { TContractAddressElement } from '../components/plate-ui/autocomplete/types'

export const PasteContractAddressPlugin = createPlatePlugin({
    key: 'ethAddressPlugin',
    extendEditor: ({ editor }: { editor: TPlateEditor }) => {
        const { insertData } = editor

        editor.insertData = (data) => {
            const text = data.getData('text/plain')?.trim()

            if (!text || !pseudoContractAddress.test(text)) {
                insertData(data)
                return editor
            }

            const chain = getChainFromAddress(text)

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

// loose peemptive validation for contract address
const pseudoContractAddress = /^([a-f0-9]{40}|[a-z0-9]{32,45})$/i

// validates base / solana address and returns the chain id
export const getChainFromAddress = (text: string) => {
    return isAddress(text) ? '8453' : isSolanaAddress(text) ? 'solana-mainnet' : null
}

const isSolanaAddress = (text: string) => {
    return PublicKey.isOnCurve(text)
}
