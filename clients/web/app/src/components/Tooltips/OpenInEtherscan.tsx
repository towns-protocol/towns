import React from 'react'
import { Icon, Paragraph, Tooltip } from '@ui'

export const OpenInEtherscan = () => {
    return (
        <Tooltip horizontal gap="sm" alignItems="center">
            <Paragraph size="sm">Open in Etherscan</Paragraph>
            <Icon type="linkOut" size="square_xs" />
        </Tooltip>
    )
}
