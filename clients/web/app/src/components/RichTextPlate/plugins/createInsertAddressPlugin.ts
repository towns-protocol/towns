import { TPlateEditor, createPlatePlugin } from '@udecode/plate-common/react'
import { TElement } from '@udecode/plate-common'
import { ELEMENT_CONTRACT_ADDRESS } from './createTickerMentionPlugin'

export const InsertAddressPlugin = ({
    onInsertAddress,
}: {
    onInsertAddress: ((address: string, chain: string) => void) | undefined
}) =>
    createPlatePlugin({
        key: 'insertAddressPlugin',
        extendEditor: ({ editor }: { editor: TPlateEditor }) => {
            const { apply: plateApply } = editor
            editor.apply = (operation) => {
                if (operation.type === 'insert_node') {
                    const node = operation.node as TElement
                    if (node.type === ELEMENT_CONTRACT_ADDRESS) {
                        const address = node.address as string
                        const chain = node.chain as string
                        onInsertAddress?.(address, chain)
                    }
                }

                plateApply(operation)
            }
            return editor
        },
    })
