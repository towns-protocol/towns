import React, { startTransition, useDeferredValue, useEffect, useRef, useState } from 'react'
import { useEvent } from 'react-use-event-hook'
import { IconButton, IconLabelButton, Stack, TextField } from '@ui'

type Props = {
    label: string
    data: string[]
    placeholder?: string
    onClick?: () => void
    onUpdate: (data: string[]) => void
    itemRenderer: (props: { item: string; onRemoveItem: (id: string) => void }) => React.ReactNode
}

// When updating the members list UI, can remove the input from this component
export const TokenSelector = (props: Props) => {
    const buttonRef = useRef<HTMLInputElement>(null)
    const { data, itemRenderer } = props
    const [isInputShowing, setInputShowing] = useState(false)

    const onClick = () => {
        props.onClick?.() ?? setInputShowing(true)
    }

    const onCancelInput = useEvent(() => {
        setInputShowing(false)
    })

    const onConfirmInput = useEvent((token: string) => {
        if (token) {
            props.onUpdate([...data, token])
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
            <Stack horizontal gap flexWrap="wrap" alignItems="start">
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
                    <TokenInput
                        placeholder={props.placeholder}
                        onConfirm={onConfirmInput}
                        onCancel={onCancelInput}
                    />
                )}
            </Stack>
        </>
    )
}

type TokenInputProps = {
    onCancel: () => void
    onConfirm: (token: string) => void
    placeholder?: string
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
    const onBlur = (e: React.FocusEvent) => {
        const container = fieldRef.current?.parentElement
        // https://muffinman.io/blog/catching-the-blur-event-on-an-element-and-its-children/
        requestAnimationFrame(() => {
            if (container && !container.contains(document.activeElement)) {
                onCancel()
            }
        })
    }

    return (
        <TextField
            autoFocus
            ref={fieldRef}
            height="input_lg"
            width="500"
            after={
                isValid ? (
                    <IconButton icon="check" color="positive" onClick={onSave} />
                ) : (
                    <IconButton icon="close" color="gray2" padding="xs" onClick={onCancel} />
                )
            }
            placeholder={props.placeholder}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            onKeyUp={onChange}
            onChange={onChange}
        />
    )
}
