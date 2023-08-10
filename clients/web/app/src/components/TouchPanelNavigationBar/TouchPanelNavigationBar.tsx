import React from 'react'
import { TouchNavBar } from 'components/TouchNavBar/TouchNavBar'
import { IconButton } from '@ui'

type Props = {
    title: string | React.ReactNode
    rightBarButton?: React.ReactNode
    onBack?: () => void
}
export const TouchPanelNavigationBar = (props: Props) => {
    return (
        <TouchNavBar
            contentLeft={
                <IconButton icon="back" size="square_md" color="default" onClick={props.onBack} />
            }
            contentRight={props.rightBarButton}
        >
            {props.title}
        </TouchNavBar>
    )
}
