import React from 'react'
import { Box, Icon, IconButton, Pill, Text, TooltipRenderer } from '@ui'
import { shortAddress } from 'ui/utils/utils'

type Props = {
    address: string
    onClick?: (address: string) => void
}

export const AddressPill = ({ address, onClick }: Props) => {
    function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
        e.preventDefault()
        onClick?.(address)
    }

    return (
        <TooltipRenderer
            trigger="hover"
            render={
                <Box background="level4" padding="sm" rounded="sm">
                    <Text size="sm">{address}</Text>
                </Box>
            }
        >
            {(props) => (
                <Pill {...props.triggerProps}>
                    <Box flexDirection="row" alignItems="center" gap="sm">
                        <Box rounded="full" background="level4" padding="xs">
                            <Icon type="wallet" size="square_xs" />
                        </Box>
                        <Text size="sm">{shortAddress(address)}</Text>
                        <IconButton icon="close" size="square_xs" onClick={handleClick} />
                    </Box>
                </Pill>
            )}
        </TooltipRenderer>
    )
}
