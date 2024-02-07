import React from 'react'
import { RenderPlaceholderProps } from 'slate-react'
import { Text } from '@ui'

export const Placeholder = ({ children, attributes }: RenderPlaceholderProps) => {
    return (
        <Text {...attributes} style={{}} display="inline-block" color="gray2">
            {children}
        </Text>
    )
}
