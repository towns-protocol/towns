import React from 'react'
import { useLinkToolbarButton, useLinkToolbarButtonState } from '@udecode/plate-link'
import { IconButton } from '@ui'

type Props = {
    onClick?: () => void
}
export const LinkToolbarButton = ({ onClick }: Props) => {
    const state = useLinkToolbarButtonState()
    const { props } = useLinkToolbarButton(state)

    return (
        <IconButton
            opaque
            active={props.pressed}
            icon="link"
            tooltip="Link"
            tooltipOptions={{ placement: 'vertical', immediate: true }}
            onClick={onClick}
        />
    )
}
