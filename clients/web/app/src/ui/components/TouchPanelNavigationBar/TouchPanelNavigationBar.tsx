import React from 'react'
import { Stack } from '../Stack/Stack'
import { Text } from '../Text/Text'
import { IconButton } from '../IconButton/IconButton'

type Props = {
    title: string | React.ReactNode
    onBack?: () => void
}
export const TouchPanelNavigationBar = (props: Props) => {
    return (
        <Stack
            horizontal
            borderBottom
            gap="sm"
            padding="sm"
            alignItems="center"
            color="gray1"
            position="sticky"
            background="level1"
            insetTop="safeArea"
        >
            <IconButton icon="back" color="gray2" size="square_sm" onClick={props.onBack} />
            <Text fontWeight="strong" color="default">
                {props.title}
            </Text>
        </Stack>
    )
}
