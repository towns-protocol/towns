import React, { startTransition, useDeferredValue, useEffect, useRef, useState } from 'react'
import useEvent from 'react-use-event-hook'
import { IconButton, IconLabelButton, Stack, TextField } from '@ui'

type Props<T> = {
    label: string
    data: T[]
    onUpdate: (data: T[]) => void
    itemRenderer: (props: { item: T; onRemoveItem: (id: string) => void }) => React.ReactNode
    itemFromString: (id: string) => T
}

export const TokenSelector = <T extends string>(props: Props<T>) => {
    const buttonRef = useRef<HTMLInputElement>(null)
    const { data, itemRenderer } = props
    const [isInputShowing, setInputShowing] = useState(false)

    const onClick = () => {
        setInputShowing(true)
    }

    const onCancelInput = useEvent(() => {
        setInputShowing(false)
    })

    const onConfirmInput = useEvent((token: string) => {
        const item: T = props.itemFromString(token)
        if (item) {
            props.onUpdate([...data, item])
            setInputShowing(false)

            setTimeout(() => {
                buttonRef.current?.focus()
            })
        }
    })

    const onRemoveItem = useEvent((id: string) => {
        props.onUpdate(data.filter((item) => item !== id))
    })

    return (
        <>
            <Stack horizontal gap alignItems="start">
                {Object.values(data).map((item) => (
                    <React.Fragment key={item}>
                        {itemRenderer({ item, onRemoveItem })}
                    </React.Fragment>
                ))}
            </Stack>
            <Stack alignItems="start">
                {!isInputShowing ? (
                    <IconLabelButton
                        label={props.label}
                        type="plus"
                        ref={buttonRef}
                        onClick={onClick}
                    />
                ) : (
                    <TokenInput onConfirm={onConfirmInput} onCancel={onCancelInput} />
                )}
            </Stack>
        </>
    )
}

type TokenInputProps = {
    onCancel: () => void
    onConfirm: (token: string) => void
}

const TokenInput = (props: TokenInputProps) => {
    const fieldRef = useRef<HTMLInputElement>(null)
    const [value, setValue] = useState('')
    const deferredValue = useDeferredValue(value)
    const [isValid, setValid] = React.useState(false)

    useEffect(() => {
        setValid(!!deferredValue.match(/^0x[a-f0-9]{40}$/i))
    }, [deferredValue])

    const onSave = useEvent(() => {
        props.onConfirm(deferredValue)
    })

    const onChange = useEvent(() => {
        startTransition(() => {
            const value = fieldRef.current?.value
            setValue(value ?? '')
        })
    })

    const onKeyDown = useEvent((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && isValid) {
            onSave()
        }
    })

    const onCancel = () => {
        props.onCancel()
    }

    return (
        <TextField
            autoFocus
            ref={fieldRef}
            height="input_lg"
            after={
                isValid ? (
                    <IconButton icon="check" color="positive" onClick={onSave} />
                ) : (
                    <IconButton icon="close" color="gray2" padding="xs" onClick={onCancel} />
                )
            }
            onBlur={onCancel}
            onKeyDown={onKeyDown}
            onKeyUp={onChange}
            onChange={onChange}
        />
    )
}
