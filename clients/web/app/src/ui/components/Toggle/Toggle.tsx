import React from 'react'
import { Box } from 'ui/components/Box/Box'
import { vars } from 'ui/styles/vars.css'
import * as style from './Toggle.css'

type Props<D> = {
    toggled: boolean
    onToggle: (checked: boolean, data?: D) => void
    metaData?: D
}
/**
 * Controlled component not to be used in the context of a form
 */
export const Toggle = <D,>(props: Props<D>) => {
    const { toggled: isToggled, metaData } = props
    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        props.onToggle(!!e.target.checked, metaData)
    }

    return (
        <Box display="block">
            <Box
                data-testid="toggle"
                as="label"
                flexDirection="row"
                display="inline-flex"
                alignItems="center"
                justifyContent="spaceBetween"
                background={isToggled ? 'positive' : 'level3'}
                style={{
                    transition: 'all 200ms ease-out',
                }}
                rounded="md"
            >
                <Box
                    cursor="pointer"
                    pointerEvents="all"
                    className={style.checkboxWrapper}
                    position="relative"
                    style={{
                        width: `calc(${vars.dims.square.square_sm} * 2)`,
                    }}
                >
                    <input
                        className={style.hiddenCheckbox}
                        type="checkbox"
                        checked={isToggled}
                        onChange={onChange}
                    />
                    <Box
                        pointerEvents="none"
                        position="absolute"
                        rounded="full"
                        style={{
                            width: isToggled ? `calc(100% - 2px)` : `calc(50% - 1px)`,
                            height: `calc(${vars.dims.square.square_sm} - 4px)`,
                            transition: `all 200ms ease-out`,
                        }}
                    >
                        <Box
                            position="absolute"
                            background="inverted"
                            rounded="full"
                            style={{
                                right: 0,
                                width: `calc(${vars.dims.square.square_sm} - 4px)`,
                                height: `calc(${vars.dims.square.square_sm} - 4px)`,
                            }}
                        />
                    </Box>
                </Box>
            </Box>
        </Box>
    )
}
