import React from 'react'

export const PanelContext = React.createContext<{ onClosePanel: () => void } | undefined>(undefined)
