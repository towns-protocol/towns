import React from 'react'
import { Box, type BoxProps } from 'ui/components/Box/Box'
import { vars } from 'ui/styles/vars.css'
import * as style from './Toggle.css'

type Props<D> = {
    toggled: boolean
    onToggle: (checked: boolean, data?: D) => void
    disabled?: boolean
    metaData?: D
    background?: BoxProps['background']
    'data-testid'?: string
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
                opacity={props.disabled ? '0.3' : 'opaque'}
                data-testid="toggle"
                as="label"
                flexDirection="row"
                display="inline-flex"
                alignItems="center"
                justifyContent="spaceBetween"
                background={isToggled ? 'positive' : props.background ?? 'level3'}
                style={{
                    transition: 'all 200ms ease-out',
                }}
                rounded="md"
            >
                <Box
                    cursor={props.disabled ? 'not-allowed' : 'pointer'}
                    pointerEvents={props.disabled ? 'none' : 'all'}
                    className={style.checkboxWrapper}
                    position="relative"
                    style={{
                        width: `calc(${vars.dims.square.square_sm} * 2)`,
                    }}
                >
                    <input
                        className={style.hiddenCheckbox}
                        disabled={props.disabled}
                        type="checkbox"
                        checked={isToggled}
                        data-testid={props['data-testid'] ?? 'toggle-input'}
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
