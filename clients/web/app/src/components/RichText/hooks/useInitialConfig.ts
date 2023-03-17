import { $isListNode } from '@lexical/list'
import { $convertFromMarkdownString, Transformer } from '@lexical/markdown'
import {
    $createParagraphNode,
    $getRoot,
    $isElementNode,
    $setSelection,
    Klass,
    LexicalNode,
} from 'lexical'
import { $createAnnotationNode } from '../nodes/AnnotationNode'
import { theme } from '../RichTextEditor.theme'

function onError(error: Error) {
    console.error(error)
}

const initialConfig = {
    namespace: 'zion',
    theme,
    onError,
}

export const useInitialConfig = (
    initialValue: string | undefined,
    nodes: Klass<LexicalNode>[],
    transformers: Transformer[],
    editable?: boolean,
    edited?: boolean,
) => {
    return {
        ...initialConfig,
        nodes,
        editable,
        editorState: () => {
            if (initialValue) {
                try {
                    $convertFromMarkdownString(initialValue, transformers)
                } catch (error) {
                    onError(error as Error)
                }
            } else {
                const root = $getRoot()
                if (editable && root.getFirstChild() === null) {
                    const defaultParagraph = $createParagraphNode()
                    root.append(defaultParagraph)
                }
            }
            if (edited) {
                appendEditedNotation()
            }
            $setSelection(null)
        },
    }
}

function appendEditedNotation() {
    const root = $getRoot()
    const lastChild = root.getLastChild()
    const lastElement =
        $isElementNode(lastChild) && !$isListNode(lastChild) ? lastChild : $createParagraphNode()
    if (!lastChild) {
        root.append(lastElement)
    }
    const textNode = $createAnnotationNode(' (edited)')
    lastElement.append(textNode)
}
