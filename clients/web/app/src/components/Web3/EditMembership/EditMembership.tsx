import { useFormContext } from 'react-hook-form'
import React, { ChangeEvent, useCallback } from 'react'
import { ErrorMessage, Stack, Text, TextField } from '@ui'
import { FadeInBox } from '@components/Transitions'
import { MembershipSettingsSchemaType } from '../MembershipNFT/CreateSpaceFormV2/CreateSpaceFormV2.schema'

export function EditMembership() {
    const { formState, register, setValue, setError, trigger } =
        useFormContext<MembershipSettingsSchemaType>()

    const onLimitChange = useCallback(
        (e: ChangeEvent<HTMLInputElement>) => {
            const { value } = e.target

            if (isNaN(Number(value))) {
                setError('membershipLimit', {
                    message: 'Please enter a valid number',
                })
                return
            }

            setValue('membershipLimit', Number(value), {
                shouldValidate: true,
            })
            trigger(['membershipLimit', 'membershipCost']) // trigger the superRefine
        },
        [setValue, trigger, setError],
    )

    return (
        <>
            <Stack gap background="level2" rounded="md" padding="md">
                <Stack horizontal alignItems="center" justifyContent="spaceBetween" gap="sm">
                    <Stack gap="paragraph">
                        <Text>Max Memberships</Text>
                        <Text color="gray2" size="sm">
                            Limit how many people can join.
                        </Text>
                    </Stack>
                    <Stack maxWidth="x15">
                        <TextField
                            background="level3"
                            border={formState.errors['membershipLimit'] ? 'negative' : 'none'}
                            {...register('membershipLimit', {
                                // setValueAs: (value) => Number(value),
                            })}
                            textAlign="right"
                            onChange={onLimitChange}
                        />
                    </Stack>
                </Stack>
            </Stack>
            {formState.errors['membershipLimit'] && (
                <FadeInBox key="error">
                    <ErrorMessage errors={formState.errors} fieldName="membershipLimit" />
                </FadeInBox>
            )}
        </>
    )
}
