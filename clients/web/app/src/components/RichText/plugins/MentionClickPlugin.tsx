import { NodeEventPlugin } from '@lexical/react/LexicalNodeEventPlugin'
import React from 'react'
import { MentionNode } from '../nodes/MentionNode'

export const MentionClickPlugin = (props: { onMentionClick: (mentionName: string) => void }) => {
    return (
        <NodeEventPlugin
            nodeType={MentionNode}
            eventType="click"
            eventListener={(e: Event) => {
                if (e.target instanceof HTMLElement) {
                    const mentionName = e.target.getAttribute('data-mention-name')
                    if (mentionName && mentionName.startsWith('@')) {
                        props.onMentionClick(mentionName.slice(1).trim())
                    }
                }
                e.stopImmediatePropagation()
            }}
        />
    )
}
