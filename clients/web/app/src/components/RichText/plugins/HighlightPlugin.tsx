import type { TextNode } from 'lexical'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useLexicalTextEntity } from '@lexical/react/useLexicalTextEntity'
import { useCallback, useEffect } from 'react'
import { $createHighlightNode, HightlightNode } from '../nodes/HightlightNode'

export function HightlightPlugin(props: { terms: string[] }): JSX.Element | null {
    const [editor] = useLexicalComposerContext()

    useEffect(() => {
        if (!editor.hasNodes([HightlightNode])) {
            throw new Error('HightlightNodePlugin: HightlightNode not registered on editor')
        }
    }, [editor])

    const createHashtagNode = useCallback((textNode: TextNode): HightlightNode => {
        return $createHighlightNode(textNode.getTextContent(), textNode.getTextContent())
    }, [])

    const getHighlightMatch = useCallback(
        (text: string) => {
            if (!text.length) {
                return null
            }

            const matchArr = new RegExp(`${props.terms.join('|')}`, 'i').exec(text)

            if (matchArr === null) {
                return null
            }

            const hashtagLength = matchArr[0].length + 1
            const startOffset = matchArr.index + matchArr[0].length
            const endOffset = startOffset + hashtagLength
            return {
                end: endOffset,
                start: startOffset,
            }
        },
        [props.terms],
    )

    useLexicalTextEntity<HightlightNode>(getHighlightMatch, HightlightNode, createHashtagNode)

    return null
}
