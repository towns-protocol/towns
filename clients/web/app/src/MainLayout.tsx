import React from 'react'
import { ZLayerProvider } from '@ui'

export const MainLayout = (props: { children: React.ReactNode }) => {
    return <ZLayerProvider>{props.children}</ZLayerProvider>
}
