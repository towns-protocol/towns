import { clsx } from 'clsx'
import React, { ChangeEvent, PropsWithChildren, useCallback, useRef, useState } from 'react'
import { RefCallBack } from 'react-hook-form'
import { Text } from 'ui/components/Text/Text'
import { Grid } from 'ui/components/Grid/Grid'
import { Stack } from 'ui/components/Stack/Stack'
import { Field, FieldBaseProps } from 'ui/components/_internal/Field/Field'
import * as fieldStyles from 'ui/components/_internal/Field/Field.css'
import { FieldOutline } from 'ui/components/_internal/Field/FieldOutline/FieldOutline'
import { Box } from 'ui/components/Box/Box'
import { FieldTone } from 'ui/components/_internal/Field/types'
import * as styles from './RadioSelect.css'

type Props<T extends string> = {
    defaultValue?: string
    render?: (value: T, selected: boolean, focused: boolean) => JSX.Element
    options: readonly ({ label: string; value: T } | T)[]
    columns?: number | string
    onChange?: (e: ChangeEvent<HTMLSelectElement>) => void
    applyChildProps?: () => {
        ref: RefCallBack
    } & Omit<React.HTMLAttributes<HTMLInputElement>, 'color'>
} & FieldBaseProps

export const RadioSelect = <T extends string>(props: Props<T>) => {
    const { options: _options, render, columns, applyChildProps, ...fieldProps } = props

    const options = _options.map((o) => (typeof o === 'string' ? { label: o, value: o } : o))

    return (
        <Field {...fieldProps} height="auto" paddingX="none">
            {(overlays, { className, ...inputProps }) => (
                <>
                    <Stack grow role="radiogroup">
                        <Grid
                            columns={typeof columns === 'number' ? columns : undefined}
                            columnMinSize={typeof columns === 'string' ? columns : undefined}
                            className={clsx(className, styles.radioSelect)}
                            {...inputProps}
                            flexWrap="wrap"
                        >
                            {options.map((o) => {
                                return (
                                    <Checkbox
                                        key={o.value}
                                        id={inputProps?.id}
                                        label={o.label}
                                        value={o.value}
                                        render={render}
                                        tone={props.tone ?? 'neutral'}
                                        applyChildProps={applyChildProps}
                                    />
                                )
                            })}
                        </Grid>
                    </Stack>
                    {overlays}
                </>
            )}
        </Field>
    )
}

const Checkbox = <T extends string>(props: {
    id?: string
    label: string
    value: T
    tone: FieldTone
    render?: (value: T, selected: boolean, focused: boolean) => JSX.Element
    applyChildProps: Props<T>['applyChildProps']
}) => {
    const { label, value, id, render, applyChildProps } = props
    const labelId = `label-${value.replace(/[^a-z0-9]/i, '_')}`

    const fieldRef = useRef<HTMLInputElement | null>()
    const { ref, onFocus, onBlur, ...childProps } = applyChildProps?.() ?? {}

    const isCustomRender = !!render

    const [focused, setIsFocused] = useState(false)

    const _onFocus = useCallback(
        (e: React.FocusEvent<HTMLInputElement>) => {
            setIsFocused(true)
            onFocus?.(e)
        },
        [onFocus],
    )
    const _onBlur = useCallback(
        (e: React.FocusEvent<HTMLInputElement>) => {
            setIsFocused(false)
            onBlur?.(e)
        },
        [onBlur],
    )

    return (
        <Stack
            horizontal
            cursor="pointer"
            as="label"
            gap={!isCustomRender ? 'sm' : 'none'}
            color="gray1"
            alignItems="center"
            pointerEvents="all"
            key={labelId}
        >
            <OutlineContainer {...props}>
                <Box
                    as="input"
                    type="radio"
                    color="negative"
                    name={id}
                    id={labelId}
                    key={value}
                    value={value}
                    className={clsx([
                        fieldStyles.field,
                        render ? styles.hiddenRadio : styles.radio,
                    ])}
                    ref={(e) => {
                        ref?.(e)
                        fieldRef.current = e as HTMLInputElement
                    }}
                    {...childProps}
                    onBlur={_onBlur}
                    onFocus={_onFocus}
                />
            </OutlineContainer>

            {render ? (
                <Box grow position="relative">
                    {render(value, !!fieldRef?.current?.checked, focused)}
                    <FieldOutline tone={props.tone ?? 'neutral'} disabled={false} />
                </Box>
            ) : (
                <Text className={styles.radioLabel}>{String(label)}</Text>
            )}
        </Stack>
    )
}

const OutlineContainer = <T extends string>(
    props: PropsWithChildren & Pick<Props<T>, 'tone' | 'render'>,
) => {
    return props.render ? (
        props.children
    ) : (
        <Stack horizontal position="relative">
            {props.children}
            <FieldOutline tone={props.tone ?? 'neutral'} disabled={false} rounded="full" />
        </Stack>
    )
}
