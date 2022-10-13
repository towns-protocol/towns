// import { TextMatchTransformer } from "@lexical/markdown";
import { TextMatchTransformer } from '@lexical/markdown'
import type { Spread } from 'lexical'

import {
    DOMConversionMap,
    DOMConversionOutput,
    DOMExportOutput,
    EditorConfig,
    LexicalNode,
    NodeKey,
    SerializedTextNode,
    TextNode,
} from 'lexical'
import { atoms } from 'ui/styles/atoms.css'

export type SerializedMentionNode = Spread<
    {
        mentionName: string
        type: 'mention'
        version: 1
    },
    SerializedTextNode
>

function convertMentionElement(domNode: HTMLElement): DOMConversionOutput | null {
    const textContent = domNode.textContent

    if (textContent !== null) {
        const node = $createMentionNode(textContent)
        return {
            node,
        }
    }

    return null
}

export class MentionNode extends TextNode {
    __mention: string

    static getType(): string {
        return 'mention'
    }

    static clone(node: MentionNode): MentionNode {
        return new MentionNode(node.__mention, node.__text, node.__key)
    }

    static importJSON(serializedNode: SerializedMentionNode): MentionNode {
        const node = $createMentionNode(serializedNode.mentionName)
        node.setTextContent(serializedNode.text)
        node.setFormat(serializedNode.format)
        node.setDetail(serializedNode.detail)
        node.setMode(serializedNode.mode)
        node.setStyle(serializedNode.style)
        return node
    }

    constructor(mentionName: string, text?: string, key?: NodeKey) {
        super(text ?? mentionName, key)
        this.__mention = mentionName
    }

    getMentionName() {
        return this.__mention
    }

    exportJSON(): SerializedMentionNode {
        return {
            ...super.exportJSON(),
            mentionName: this.__mention,
            type: 'mention',
            version: 1,
        }
    }

    createDOM(config: EditorConfig): HTMLElement {
        const dom = super.createDOM(config)
        dom.className = atoms({
            fontWeight: 'strong',
            background: 'level2',
            paddingX: 'xs',
            paddingY: 'xxs',
            rounded: 'xs',
        })
        return dom
    }

    exportDOM(): DOMExportOutput {
        const element = document.createElement('span')
        element.setAttribute('data-lexical-mention', 'true')
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
                    conversion: convertMentionElement,
                    priority: 1,
                }
            },
        }
    }

    isTextEntity(): true {
        return true
    }
}

export function $createMentionNode(mentionName: string): MentionNode {
    const mentionNode = new MentionNode(mentionName)
    mentionNode.setMode('segmented').toggleDirectionless()
    return mentionNode
}

export function $isMentionNode(node: LexicalNode | null | undefined): node is MentionNode {
    return node instanceof MentionNode
}

export const createMentionTransformer = (names: string[]): TextMatchTransformer => {
    const concat = names.join('|')
    return {
        dependencies: [MentionNode],
        export: (node, exportChildren, exportFormat) => {
            if (!$isMentionNode(node)) {
                return null
            }
            return `${node.getMentionName()}`
        },
        importRegExp: new RegExp('(@(' + concat + '))', 'i'),
        regExp: /(@[a-z0-9_-]+)$/i,
        replace: (textNode, match) => {
            const mentionNode = $createMentionNode(match[1])
            textNode.replace(mentionNode)
        },
        trigger: '@',
        type: 'text-match',
    }
}
