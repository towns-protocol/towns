// import { TextMatchTransformer } from "@lexical/markdown";
import { TextMatchTransformer } from '@lexical/markdown'
import type { Spread } from 'lexical'
import { Mention } from 'use-zion-client'

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
        const node = $createMentionNode(textContent, undefined)
        return {
            node,
        }
    }

    return null
}

export class MentionNode extends TextNode {
    __mention: string
    __userId: string | undefined

    static getType(): string {
        return 'mention'
    }

    static clone(node: MentionNode): MentionNode {
        return new MentionNode(node.__mention, node.__text, node.__key)
    }

    static importJSON(serializedNode: SerializedMentionNode): MentionNode {
        const node = $createMentionNode(serializedNode.mentionName, undefined)
        node.setTextContent(serializedNode.text)
        node.setFormat(serializedNode.format)
        node.setDetail(serializedNode.detail)
        node.setMode(serializedNode.mode)
        node.setStyle(serializedNode.style)
        return node
    }

    constructor(mentionName: string, userId: string | undefined, text?: string, key?: NodeKey) {
        super(text ?? mentionName, key)
        this.__mention = mentionName
        this.__userId = userId
    }

    getMentionName() {
        return this.__mention
    }

    getMention(): Mention {
        return {
            displayName: this.__mention,
            userId: this.__userId,
        }
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

export function $createMentionNode(mentionName: string, userId: string | undefined): MentionNode {
    const mentionNode = new MentionNode(mentionName, userId)
    mentionNode.setMode('segmented').toggleDirectionless()
    return mentionNode
}

export function $isMentionNode(node: LexicalNode | null | undefined): node is MentionNode {
    return node instanceof MentionNode
}

export const createMentionTransformer = (
    names: { displayName: string; userId: string }[],
): TextMatchTransformer => {
    const concat = names.map((n) => n.displayName).join('|')
    const userIds = names.reduce((acc, n) => {
        acc[n.displayName] = n.userId
        return acc
    }, {} as Record<string, string>)
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
            const name = match[1]
            const userId = userIds[name]
            const mentionNode = $createMentionNode(match[1], userId)
            textNode.replace(mentionNode)
        },
        trigger: '@',
        type: 'text-match',
    }
}
