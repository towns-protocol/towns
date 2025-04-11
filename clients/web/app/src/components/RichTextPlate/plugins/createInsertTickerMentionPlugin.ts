import { TPlateEditor, createPlatePlugin } from '@udecode/plate-common/react'
import { TElement } from '@udecode/plate-common'
import { TMentionTicker } from '../components/plate-ui/autocomplete/types'
import { ELEMENT_CONTRACT_ADDRESS, ELEMENT_MENTION_TICKER } from './createTickerMentionPlugin'

export const InsertTickerMentionPlugin = ({
    onInsertTickerMention,
    onInsertContractAddress,
}: {
    onInsertTickerMention: ((ticker: TMentionTicker) => void) | undefined
    onInsertContractAddress: ((address: string, chain: string) => void) | undefined
}) =>
    createPlatePlugin({
        key: 'insertTickerMentionPlugin',
        extendEditor: ({ editor }: { editor: TPlateEditor }) => {
            const { apply: plateApply } = editor
            editor.apply = (operation) => {
                if (operation.type === 'insert_node') {
                    const node = operation.node as TElement
                    if (node.type === ELEMENT_MENTION_TICKER) {
                        const ticker = node.ticker as TMentionTicker
                        onInsertTickerMention?.(ticker)
                    }
                    if (node.type === ELEMENT_CONTRACT_ADDRESS) {
                        const address = node.address as string
                        const chain = node.chain as string
                        onInsertContractAddress?.(address, chain)
                    }
                }

                plateApply(operation)
            }
            return editor
        },
    })
