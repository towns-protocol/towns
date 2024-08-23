import React, { useCallback, useMemo, useRef } from 'react'
import { useFormContext } from 'react-hook-form'
import { useConnectivity } from 'use-towns-client'
import { useMultipleTokenMetadatasForChainIds } from 'api/lib/collectionMetadata'
import { TokenDataWithChainId } from '@components/Tokens/types'
import { mapTokenOptionsToTokenDataStruct } from '@components/SpaceSettingsPanel/utils'
import { ErrorMessage, RadioCard, Stack } from '@ui'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { TokenSelector } from '@components/Tokens/TokenSelector/TokenSelector'
import { MembershipSettingsSchemaType } from '../MembershipNFT/CreateSpaceFormV2/CreateSpaceFormV2.schema'

export function EditGating() {
    const { loggedInWalletAddress: wallet } = useConnectivity()
    const formProps = useFormContext<MembershipSettingsSchemaType>()
    const { setValue, getValues, watch, formState, reset } = formProps
    const isValid = !Object.values(formState.errors).length
    const inputRef = useRef<HTMLInputElement>(null)

    const onEveryoneClick = useCallback(() => {
        reset(
            {
                ...getValues(),
                membershipType: 'everyone',
                tokensGatingMembership: [],
            },
            { keepDefaultValues: true },
        )
    }, [reset, getValues])

    const onTokensCardClick = useCallback(() => {
        const currentMembershipType = getValues('membershipType')
        setValue('membershipType', 'tokenHolders')
        if (currentMembershipType !== 'tokenHolders') {
            setTimeout(() => inputRef.current?.focus(), 0)
        }
    }, [setValue, getValues, inputRef])

    const initialTokenValues = useMemo(() => {
        const tokens = getValues('tokensGatingMembership')
        return tokens?.length > 0 ? tokens : []
    }, [getValues])

    const { data: initialTokensData, isLoading: isLoadingInitialTokens } =
        useMultipleTokenMetadatasForChainIds(initialTokenValues)

    const onSelectedTokensChange = useCallback(
        (args: { tokens: TokenDataWithChainId[] }) => {
            const tokenDataArray = mapTokenOptionsToTokenDataStruct(args.tokens)
            setValue?.('tokensGatingMembership', tokenDataArray, {
                shouldValidate: true,
            })
        },
        [setValue],
    )

    if (!wallet) {
        return null
    }

    const membershipType = watch('membershipType')
    const isTokenFieldTouched = formState.touchedFields.tokensGatingMembership

    return (
        <Stack gap="sm">
            <Stack>
                <RadioCard
                    name="membershipType"
                    value="everyone"
                    title="Everyone"
                    description="Anyone with the town link may join your town"
                    onClick={onEveryoneClick}
                    {...formProps}
                />
            </Stack>

            {wallet && (
                <RadioCard
                    name="membershipType"
                    value="tokenHolders"
                    title="Gate access by digital assets"
                    description="Any of the following tokens must be held to claim membership"
                    onClick={onTokensCardClick}
                    {...formProps}
                >
                    {membershipType === 'tokenHolders' &&
                        (isLoadingInitialTokens ? (
                            <Stack centerContent padding>
                                <ButtonSpinner />
                            </Stack>
                        ) : (
                            <Stack>
                                <TokenSelector
                                    isValidationError={
                                        formState.errors.tokensGatingMembership !== undefined &&
                                        !!isTokenFieldTouched
                                    }
                                    initialSelection={initialTokensData}
                                    inputRef={inputRef}
                                    onSelectionChange={onSelectedTokensChange}
                                />
                            </Stack>
                        ))}
                </RadioCard>
            )}
            <Stack>
                {isValid ? (
                    <>&nbsp;</>
                ) : (
                    <>
                        <ErrorMessage errors={formState.errors} fieldName="membershipType" />

                        {isTokenFieldTouched && membershipType === 'tokenHolders' && (
                            <ErrorMessage
                                errors={formState.errors}
                                fieldName="tokensGatingMembership"
                            />
                        )}
                    </>
                )}
            </Stack>
        </Stack>
    )
}
