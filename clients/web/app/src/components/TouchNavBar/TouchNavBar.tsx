import React from 'react'
import { Box, Text } from '@ui'

type Props = {
    title: string
}

export const TouchNavBar = (props: Props) => {
    const { title } = props
    return (
        <Box width="100%" zIndex="uiAbove" background="level1" paddingTop="safeAreaInsetTop">
            <Box centerContent padding borderBottom>
                <Text fontWeight="strong">{title}</Text>
            </Box>
        </Box>
    )
}
