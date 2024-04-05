import React from 'react'

export enum PanelStack {
    MAIN = 'main',
    DIRECT_MESSAGES = 'direct-messages',
    SEARCH = 'search',
    PROFILE = 'profile',
}

export const PanelContext = React.createContext<{
    isPanelContext?: boolean
    stackId: PanelStack
    parentRoute?: string
    isRootPanel?: boolean
}>({
    stackId: PanelStack.MAIN,
    isPanelContext: false,
})
