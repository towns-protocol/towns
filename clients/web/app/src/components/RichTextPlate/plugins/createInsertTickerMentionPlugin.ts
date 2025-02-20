import { TPlateEditor, createPlatePlugin } from '@udecode/plate-common/react'
import { TElement } from '@udecode/plate-common'
import { TMentionTicker } from '../components/plate-ui/autocomplete/types'

export const InsertTickerMentionPlugin = ({
    onInsertTickerMention,
}: {
    onInsertTickerMention: ((ticker: TMentionTicker) => void) | undefined
}) =>
    createPlatePlugin({
        key: 'insertTickerMentionPlugin',
        extendEditor: ({ editor }: { editor: TPlateEditor }) => {
            const { apply: plateApply } = editor
            editor.apply = (operation) => {
                if (operation.type === 'insert_node') {
                    const node = operation.node as TElement
                    if (node.type === 'mention_ticker') {
                        const ticker = node.ticker as TMentionTicker
                        onInsertTickerMention?.(ticker)
                    }
                }

                plateApply(operation)
            }

            return editor
        },
    })
