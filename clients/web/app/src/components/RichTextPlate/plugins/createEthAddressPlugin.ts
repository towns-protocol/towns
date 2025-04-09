import { createPlatePlugin } from '@udecode/plate-common/react'
import { TDescendant, TElement, TNodeEntry } from '@udecode/plate-common'
import { BaseEditor, Editor, Range, Transforms } from 'slate'
const ethAddressRegex = /0x[a-fA-F0-9]{40}/

// Define a custom element type for ETH addresses
export const ELEMENT_ETH_ADDRESS = 'eth_address'

export const createEthAddressPlugin = ({
    onDetect,
    checkTokenValidity = async (address: string) => true, // Default implementation always returns true
}: {
    onDetect?: (address: string) => void
    checkTokenValidity?: (address: string) => Promise<boolean>
}) =>
    createPlatePlugin({
        key: 'eth-address-detector',
        extendEditor: ({ editor }) => {
            const { insertData: originalInsertData } = editor

            editor.insertData = (data) => {
                debugger
                const text = data.getData('text/plain')

                if (text && ethAddressRegex.test(text)) {
                    const match = text.match(ethAddressRegex)
                    if (match) {
                        const ethAddress = match[0]

                        // First insert the text as is
                        editor.insertText(text)

                        debugger

                        // Then check token validity asynchronously
                        checkTokenValidity(ethAddress)
                            .then((isValid) => {
                                if (isValid) {
                                    // Call onDetect callback
                                    onDetect?.(ethAddress)

                                    // Find the text node with the ETH address and replace it
                                    const textNodes = Array.from(
                                        editor.nodes({
                                            at: [],
                                            match: (n) =>
                                                'text' in n && n.text.includes(ethAddress),
                                        }),
                                    ) as TNodeEntry<{ text: string }>[]

                                    debugger

                                    if (textNodes.length > 0) {
                                        const [node, path] = textNodes[0]
                                        const textNode = node as { text: string }
                                        const startIndex = textNode.text.indexOf(ethAddress)
                                        const endIndex = startIndex + ethAddress.length

                                        const savedSelection =
                                            editor.selection &&
                                            Range.includes(editor.selection, path)
                                                ? { ...editor.selection }
                                                : null

                                        // Create a transaction to batch operations
                                        editor.selection = {
                                            anchor: { path, offset: startIndex },
                                            focus: { path, offset: endIndex },
                                        }

                                        const newNode = {
                                            type: ELEMENT_ETH_ADDRESS,
                                            address: ethAddress,
                                            children: [{ text: `🔗 ETH OKOK: ${ethAddress}` }],
                                        } as TElement

                                        const e = editor as BaseEditor

                                        Editor.withoutNormalizing(e as BaseEditor, () => {
                                            Transforms.removeNodes(e, { at: path })
                                            Transforms.insertNodes(e, newNode, { at: path })

                                            // Restore selection if applicable
                                            if (savedSelection) {
                                                Transforms.select(e, savedSelection)
                                            }
                                        })
                                    }
                                }
                            })
                            .catch((error) => {
                                console.error('Error checking token validity:', error)
                            })

                        return
                    }
                }

                // Fall back to original behavior for non-ETH address content
                originalInsertData(data)
            }

            return editor
        },
        parser: {
            format: 'text/plain',
            query: ({ data }) => {
                return data.length > 0 && ethAddressRegex.test(data)
            },
            deserialize: ({ data }): TDescendant[] => {
                try {
                    const match = data.match(ethAddressRegex)
                    if (match) {
                        const ethAddress = match[0]

                        // For deserialize, we'll handle it synchronously with a placeholder
                        // The async check will happen when the content is actually inserted
                        return [
                            {
                                text: data.replace(ethAddress, `🔗 [ETH: ${ethAddress}]`),
                            },
                        ]
                    }
                    return [{ text: data }]
                } catch (error) {
                    console.error('Error in eth-address-detector:', error)
                    return [{ text: data }]
                }
            },
        },
    })

// Example: 0xAbC1234567890DefABC1234567890defABC12345
