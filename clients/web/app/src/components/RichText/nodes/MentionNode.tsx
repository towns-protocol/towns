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

export type SerializedMentionNode = Spread<
    {
        mentionName: string
        userId: string
        type: 'mention'
        version: 1
    },
    SerializedTextNode
>

function convertMentionElement(domNode: HTMLElement): DOMConversionOutput | null {
    const textContent = domNode.textContent
    const userId = domNode.getAttribute('data-user-id') ?? ''

    if (textContent !== null) {
        const node = $createMentionNode(textContent, userId)
        return {
            node,
        }
    }

    return null
}

export class MentionNode extends TextNode {
    __mentionName: string
    __userId: string

    static getType(): string {
        return 'mention'
    }

    static clone(node: MentionNode): MentionNode {
        return new MentionNode(node.__mentionName, node.__userId, node.__key)
    }

    static importJSON(serializedNode: SerializedMentionNode): MentionNode {
        const node = $createMentionNode(serializedNode.mentionName, serializedNode.userId)
        node.setTextContent(serializedNode.text)
        node.setFormat(serializedNode.format)
        node.setDetail(serializedNode.detail)
        node.setMode(serializedNode.mode)
        node.setStyle(serializedNode.style)
        return node
    }

    constructor(mentionName: string, userId: string, key?: NodeKey) {
        super(mentionName, key)
        this.__mentionName = mentionName
        this.__userId = userId
    }

    getMentionName() {
        return this.__mentionName
    }

    getMention(): { displayName: string; userId: string } {
        return {
            displayName: this.__mentionName,
            userId: this.__userId,
        }
    }

    exportJSON(): SerializedMentionNode {
        return {
            ...super.exportJSON(),
            mentionName: this.__mentionName,
            userId: this.__userId,
            type: 'mention',
            version: 1,
        }
    }

    createDOM(config: EditorConfig): HTMLElement {
        const dom = super.createDOM(config)
        dom.className = atoms({
            fontWeight: 'strong',
            background: 'level3',
            paddingX: 'xs',
            paddingY: 'xxs',
            rounded: 'xs',
            cursor: 'pointer',
            color: 'default',
        })
        dom.setAttribute('data-lexical-mention', 'true')
        dom.setAttribute('data-mention-name', this.__mentionName)
        dom.setAttribute('data-testid', 'mention-node')
        if (this.__userId) {
            dom.setAttribute('data-user-id', this.__userId)
        }
        return dom
    }

    exportDOM(): DOMExportOutput {
        const element = document.createElement('span')
        element.setAttribute('data-lexical-mention', 'true')
        if (this.__userId) {
            element.setAttribute('data-user-id', this.__userId)
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

export function $createMentionNode(mentionName: string, userId: string): MentionNode {
    const mentionNode = new MentionNode(mentionName, userId)
    mentionNode.setMode('segmented').toggleDirectionless()
    return $applyNodeReplacement(mentionNode)
}

export function $isMentionNode(node: LexicalNode | null | undefined): node is MentionNode {
    return node instanceof MentionNode
}

export const createMentionTransformer = (
    names: { displayName: string; userId: string }[],
): TextMatchTransformer => {
    const concat = names
        .map((n) => n.displayName.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&'))
        .join('|')
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
        importRegExp: new RegExp('(@(' + concat + ')(\\s|$))', 'i'),
        regExp: /(@[a-z0-9_-]+)$/i,
        replace: (textNode, match) => {
            const name = match[1]
            const userId = userIds[name.replace('@', '')] ?? ''
            const mentionNode = $createMentionNode(match[1], userId)
            textNode.replace(mentionNode)
        },
        trigger: '@',
        type: 'text-match',
    }
}
