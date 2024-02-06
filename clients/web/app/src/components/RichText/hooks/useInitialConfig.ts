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
import { $isCodeNode } from '@lexical/code'
import { $createAnnotationNode } from '../nodes/AnnotationNode'
import { theme } from '../RichTextEditor.theme'

function onError(error: Error) {
    console.error(error)
}

const initialConfig = {
    namespace: 'towns',
    theme,
    onError,
}

export type MessageStatusAnnotation = 'edited' | 'not-sent'

export const useInitialConfig = (
    initialValue: string | undefined,
    nodes: Klass<LexicalNode>[],
    transformers: Transformer[],
    editable?: boolean,
    statusAnnotation?: MessageStatusAnnotation,
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
            if (statusAnnotation) {
                appendStatusAnnotation(statusAnnotation)
            }
            $setSelection(null)
        },
    }
}

function appendStatusAnnotation(statusAnnotation: MessageStatusAnnotation) {
    const root = $getRoot()
    const lastChild = root.getLastChild()
    const lastElement =
        $isElementNode(lastChild) && !$isListNode(lastChild) ? lastChild : $createParagraphNode()
    if (!lastChild) {
        root.append(lastElement)
    }

    const text = statusAnnotation === 'edited' ? '(edited)' : ''

    if ($isCodeNode(lastElement)) {
        const paragraphNode = $createParagraphNode()
        const textNode = $createAnnotationNode(text)
        paragraphNode.append(textNode)
        root.append(paragraphNode)
    } else {
        const textNode = $createAnnotationNode(' '.concat(text))
        lastElement.append(textNode)
    }
}
