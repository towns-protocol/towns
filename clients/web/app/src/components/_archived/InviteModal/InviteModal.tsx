import React, { useCallback, useRef } from 'react'
import { z } from 'zod'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { Button, FormRender, Stack, Text } from '@ui'
import { TextFieldWithPill } from '@components/TextFieldWithPill'
import { AddressPill } from '@components/AddressPill'

const schema = z.object({
    addresses: z.array(z.string()),
    address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
})

const addresses = [
    '0x17BA011308A820332f17BA011308A820332fsd1',
    '0x17BA011308A820332f17BA011308A820332fsd2',
    '0x17BA011308A820332f17BA011308A820332fsd3',
]

// ----------------------------------------------------------------
// Had a meeting and decided we are not moving forward with this modal
// Keeping for reference and just in case
// ----------------------------------------------------------------

export const InviteModal = (props: { onHide: () => void; onSaveLink: (link: string) => void }) => {
    const fieldRef = useRef<HTMLInputElement>(null)

    const onSave = useCallback(() => {
        const value = fieldRef.current?.value
        if (value) {
            props.onSaveLink(value)
            props.onHide()
        }
    }, [props])

    const handleClick = (e: string) => {
        console.log(e)
    }
    return (
        <ModalContainer onHide={props.onHide}>
            <Stack gap="lg">
                <Text strong size="lg">
                    Invite via Wallet Address
                </Text>
                <FormRender<{
                    addresses: string[]
                }>
                    schema={schema}
                    mode="onChange"
                    onSubmit={(data) => {
                        console.log(data)
                    }}
                >
                    {({ register, formState }) => (
                        <>
                            <TextFieldWithPill
                                placeholder="Enter wallet address"
                                pills={addresses}
                                register={register}
                                name="address"
                                renderPill={(pill) => (
                                    <AddressPill address={pill} onClick={handleClick} />
                                )}
                            />
                            <Stack horizontal gap justifyContent="end">
                                <Button onClick={props.onHide}>Cancel</Button>
                                <Button tone="cta1" onClick={onSave}>
                                    Add
                                </Button>
                            </Stack>
                        </>
                    )}
                </FormRender>
            </Stack>
        </ModalContainer>
    )
}
