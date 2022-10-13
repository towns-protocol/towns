import type { LexicalEditor } from 'lexical'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { TextNode } from 'lexical'
import { useEffect } from 'react'
import { $createEmojiNode, EmojiNode } from '../nodes/EmojiNode'
import { emojis } from '../data/emojis'

export const EmojiReplacePlugin = () => {
    const [editor] = useLexicalComposerContext()
    useEmojis(editor)
    return null
}

const findAndTransformEmoji = (node: TextNode) => {
    const text = node.getTextContent()

    for (let i = 0; i < text.length; i++) {
        const emojiData = emojis.get(text[i]) || emojis.get(text.slice(i, i + 2))

        if (emojiData !== undefined) {
            const [emojiStyle, emojiText] = emojiData
            let targetNode

            if (i === 0) {
                ;[targetNode] = node.splitText(i + 2)
            } else {
                ;[, targetNode] = node.splitText(i, i + 2)
            }
            const emojiNode = $createEmojiNode(emojiStyle, emojiText)
            targetNode.replace(emojiNode)
            return emojiNode
        }
    }

    return null
}

const textNodeTransform = (node: TextNode) => {
    let targetNode: TextNode | null = node
    while (targetNode !== null) {
        if (!targetNode.isSimpleText()) {
            return
        }
        targetNode = findAndTransformEmoji(targetNode)
    }
}

const useEmojis = (editor: LexicalEditor) => {
    useEffect(() => {
        if (!editor.hasNodes([EmojiNode])) {
            throw new Error('EmojisPlugin: EmojiNode not registered on editor')
        }
        return editor.registerNodeTransform(TextNode, textNodeTransform)
    }, [editor])
}
