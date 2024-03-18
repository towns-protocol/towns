import React, { AllHTMLAttributes, ReactNode } from 'react'
import { BoxProps } from 'ui/components/Box/Box'
import { Icon, IconName } from 'ui/components/Icon'
import { Stack } from 'ui/components/Stack/Stack'
import * as styles from './Field.css'
import { FieldLabel } from './FieldLabel'
import { FieldOutline } from './FieldOutline/FieldOutline'
import { FieldTone } from './types'

type FormElementProps = AllHTMLAttributes<HTMLFormElement>

export type FieldBaseProps = {
    /** color tone to be applied to the border typically for warnings */
    tone?: FieldTone
    /** color of the input content */
    inputColor?: BoxProps['color']
    /** field background */
    background?: BoxProps['background']
    /** label, or title of to display above the field */
    label?: string
    /** custom label renderer, overrides the default one */
    renderLabel?: (label: string) => JSX.Element
    /** content to display besides the label, e.g. `(required)`*/
    secondaryLabel?: string
    /** a longer description displaying between the label and the field */
    description?: string
    /** a message to show under the field when interacting (notes or warnings) */
    message?: React.ReactNode
    /** id to be used internally  */
    id?: NonNullable<FormElementProps['id']>
    /** name of the field to be used internally  */
    name?: FormElementProps['name']
    /** if the input is disabled  */
    disabled?: FormElementProps['disabled']
    /** if autoComplete is enabled  */
    autoComplete?: FormElementProps['autoComplete']
    /** if autoFocus is enabled  */
    autoFocus?: boolean
    /** string to be prepended at the beginning of the input */
    prefix?: string
    /** name of the optional icon to display on the left of the input */
    icon?: IconName
    /** JSX node to be appended at the end of the field */
    after?: React.ReactNode
    /** JSX node to be appended at the start of the field */
    before?: React.ReactNode
    /** height of the input */
    height?: BoxProps['height']
    /** width of the input */
    width?: BoxProps['width']
    /** horizontal padding of the input */
    paddingX?: BoxProps['paddingX']
    /** vertical padding of the input */
    paddingY?: BoxProps['paddingY']
    /** max length of the input */
    maxLength?: FormElementProps['maxLength']
    border?: BoxProps['border']
    maxWidth?: BoxProps['maxWidth']
    rounded?: BoxProps['rounded']
    minHeight?: BoxProps['minHeight']
}

type PassthroughProps = 'id' | 'name' | 'disabled' | 'autoComplete' | 'autoFocus' | 'maxLength'

interface FieldRenderProps extends Pick<FieldBaseProps, PassthroughProps> {
    background: BoxProps['background']
    // rounded: BoxProps["rounded"];
    height: BoxProps['height']
    // padding: BoxProps["padding"];
    grow: true
    className: string
}

type Props = FieldBaseProps & {
    children(
        overlays: ReactNode,
        props: FieldRenderProps,
        icon: ReactNode,
        prefix: ReactNode,
    ): ReactNode
}

export const Field = (props: Props) => {
    const {
        inputColor,
        label,
        prefix,
        renderLabel,
        secondaryLabel,
        description,
        message,
        tone = 'neutral',
        height = 'input_lg',
        icon,
        children,
        background,
        after,
        before,
        width,
        paddingY,
        paddingX = 'md',
        border,
        ...inputProps
    } = props

    const className = styles.field

    const id = props.id || props.name || label?.replace(/[^a-z]/gi, '_').toLowerCase() || ''

    return (
        <Stack grow gap="md" width={width} borderRadius="sm" border={border}>
            {label && renderLabel ? (
                renderLabel(label)
            ) : (
                <FieldLabel
                    label={label}
                    secondaryLabel={secondaryLabel}
                    description={description}
                    for={id}
                />
            )}
            <Stack
                grow
                horizontal
                background={background}
                position="relative"
                alignItems="center"
                paddingX={paddingX}
                paddingY={paddingY}
                gap="sm"
                borderRadius="sm"
                color={inputColor}
                id="container"
            >
                {props.icon && <Icon type={props.icon} size="square_xs" color="gray2" />}
                {before}
                {children(
                    <FieldOutline tone={tone} disabled={props.disabled} />,
                    {
                        id,
                        height,
                        background,
                        className,
                        grow: true,
                        ...inputProps,
                    },
                    icon,
                    prefix,
                )}
                {after}
            </Stack>
            {message}
        </Stack>
    )
}
