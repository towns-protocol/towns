// import { TextMatchTransformer } from "@lexical/markdown";
import { TextMatchTransformer } from '@lexical/markdown'
import {
    $applyNodeReplacement,
    DOMConversionMap,
    DOMConversionOutput,
    DOMExportOutput,
    EditorConfig,
    LexicalNode,
    NodeKey,
    SerializedTextNode,
    Spread,
    TextNode,
} from 'lexical'

import { atoms } from 'ui/styles/atoms.css'

export type SerializedHighlightNode = Spread<
    {
        term: string
        type: 'highlight'
        version: 1
    },
    SerializedTextNode
>

function convertHighlightElement(domNode: HTMLElement): DOMConversionOutput | null {
    const textContent = domNode.textContent
    const term = domNode.getAttribute('data-term') ?? ''
    if (textContent !== null) {
        const node = $createHighlightNode(textContent, term)
        return {
            node,
        }
    }

    return null
}

export class HightlightNode extends TextNode {
    __term: string

    static getType(): string {
        return 'highlight'
    }

    static clone(node: HightlightNode): HightlightNode {
        return new HightlightNode(node.__text, node.__term, node.__key)
    }

    static importJSON(serializedNode: SerializedHighlightNode): HightlightNode {
        const node = $createHighlightNode(serializedNode.text, serializedNode.term)
        node.setTextContent(serializedNode.text)
        node.setFormat(serializedNode.format)
        node.setDetail(serializedNode.detail)
        node.setMode(serializedNode.mode)
        node.setStyle(serializedNode.style)
        return node
    }

    constructor(text: string, term: string, key?: NodeKey) {
        super(text, key)
        this.__term = term
    }

    getTerm() {
        return this.__term
    }

    exportJSON(): SerializedHighlightNode {
        return {
            ...super.exportJSON(),
            term: this.__term,
            type: 'highlight',
            version: 1,
        }
    }

    createDOM(config: EditorConfig): HTMLElement {
        const dom = super.createDOM(config)
        dom.className = atoms({
            fontWeight: 'medium',
            color: 'accent',
            cursor: 'pointer',
        })
        dom.setAttribute('data-term', this.__term)

        return dom
    }

    exportDOM(): DOMExportOutput {
        const element = document.createElement('span')
        element.setAttribute('data-lexical-mention', 'true')
        if (this.__term) {
            element.setAttribute('data-user-id', this.__term)
        }
        element.textContent = this.__text
        return { element }
    }

    static importDOM(): DOMConversionMap | null {
        return {
            span: (domNode: HTMLElement) => {
                if (!domNode.hasAttribute('data-lexical-mention')) {
                    return null
                }
                return {
                    conversion: convertHighlightElement,
                    priority: 1,
                }
            },
        }
    }

    isTextEntity(): true {
        return true
    }
}

export function $createHighlightNode(text: string, term: string): HightlightNode {
    const highlightNode = new HightlightNode(text, term)
    highlightNode.setMode('segmented').toggleDirectionless()
    return $applyNodeReplacement(highlightNode)
}

export function $isHighlightNode(node: LexicalNode | null | undefined): node is HightlightNode {
    return node instanceof HightlightNode
}

export const createHighlightTransformer = (terms: string[]): TextMatchTransformer => {
    const concat = terms
        .map((t) => t.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&'))
        .filter((t) => t.length > 1)
        .join('|')
    return {
        dependencies: [HightlightNode],
        export: (node) => {
            if (!$isHighlightNode(node)) {
                return null
            }
            return `${node.getTerm()}`
        },
        importRegExp: new RegExp(`(${concat})`, 'i'),
        regExp: new RegExp(`${concat}`, 'i'),
        replace: (textNode, match) => {
            const term = match[0]
            const highlightNode = $createHighlightNode(match[0], term)
            textNode.replace(highlightNode)
        },
        trigger: '===never===',
        type: 'text-match',
    }
}
