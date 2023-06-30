import { NodeEventPlugin } from '@lexical/react/LexicalNodeEventPlugin'
import React from 'react'
import { MentionNode } from '../nodes/MentionNode'

export const MentionHoverPlugin = (props: {
    onMentionHover: (element?: HTMLElement, userId?: string) => void
}) => {
    return (
        <>
            <NodeEventPlugin
                nodeType={MentionNode}
                eventType="mouseenter"
                eventListener={(e: Event) => {
                    if (e.target instanceof HTMLElement) {
                        const userId = e.target.getAttribute('data-user-id') ?? undefined
                        props.onMentionHover(e.target, userId)
                    }
                }}
            />
            <NodeEventPlugin
                nodeType={MentionNode}
                eventType="mouseleave"
                eventListener={(e: Event) => {
                    if (e.target instanceof HTMLElement) {
                        props.onMentionHover(undefined, undefined)
                    }
                }}
            />
        </>
    )
}
