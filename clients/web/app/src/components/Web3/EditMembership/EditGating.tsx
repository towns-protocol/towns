import React, { useCallback, useMemo, useRef, useState } from 'react'
import { UseFormReturn, useFormContext } from 'react-hook-form'
import { useAuth } from 'hooks/useAuth'
import { useMultipleTokenMetadatasForChainIds } from 'api/lib/collectionMetadata'
import { TokenDataWithChainId } from '@components/Tokens/types'
import { mapTokenOptionsToTokenDataStruct } from '@components/SpaceSettingsPanel/utils'
import { ErrorMessage, RadioCard, Stack } from '@ui'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { TokenSelector } from '@components/Tokens/TokenSelector/TokenSelector'
import { MembershipSettingsSchemaType } from '../MembershipNFT/CreateSpaceFormV2/CreateSpaceFormV2.schema'

export function EditGating() {
    const { loggedInWalletAddress: wallet } = useAuth()
    const formProps = useFormContext<MembershipSettingsSchemaType>()
    const setValue = formProps.setValue
    const getValues = formProps.getValues
    const isValid = !Object.values(formProps.formState.errors).length
    const fieldRefOverride = useRef<HTMLInputElement>(null)
    const [tokenFieldKey, setTokenFieldKey] = useState(0)

    const onEveryoneClick = useCallback(
        (formProps: UseFormReturn<MembershipSettingsSchemaType>) => {
            formProps.setValue('membershipType', 'everyone', {
                shouldValidate: true,
            })
            formProps.setValue('tokensGatingMembership', [], {
                shouldValidate: true,
            })
            // reset token component so pills clear
            setTokenFieldKey((prev) => prev + 1)
        },
        [],
    )

    const onTokensCardClick = useCallback(
        (formProps: UseFormReturn<MembershipSettingsSchemaType>) => {
            formProps.setValue('membershipType', 'tokenHolders', {
                shouldValidate: true,
            })
            fieldRefOverride.current?.focus()
        },
        [],
    )

    const initialTokenValues = useMemo(() => {
        // if the everyone card was clicked while the panel was open, the token field is reset and shouldn't be prepopulated
        if (tokenFieldKey > 0) {
            return []
        }
        const tokens = getValues('tokensGatingMembership')
        if (tokens.length) {
            return tokens
        }
        return []
    }, [getValues, tokenFieldKey])

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

    return (
        <Stack gap="sm">
            <Stack>
                <RadioCard
                    name="membershipType"
                    value="everyone"
                    title="Everyone"
                    description="Anyone with the town link may join your town."
                    onClick={() => onEveryoneClick(formProps)}
                    {...formProps}
                />
            </Stack>

            {wallet && (
                <RadioCard
                    name="membershipType"
                    value="tokenHolders"
                    title="Gate access by digital assets"
                    description="People must hold the following tokens to claim membership."
                    onClick={() => onTokensCardClick(formProps)}
                    {...formProps}
                >
                    {() => {
                        return isLoadingInitialTokens ? (
                            <Stack centerContent padding>
                                <ButtonSpinner />
                            </Stack>
                        ) : (
                            <>
                                <Stack key={'tokens' + tokenFieldKey}>
                                    <TokenSelector
                                        key={'tokens' + tokenFieldKey}
                                        isValidationError={
                                            formProps.formState.errors.tokensGatingMembership !==
                                            undefined
                                        }
                                        initialSelection={initialTokensData}
                                        onSelectionChange={onSelectedTokensChange}
                                    />
                                </Stack>
                            </>
                        )
                    }}
                </RadioCard>
            )}
            <Stack>
                {isValid ? (
                    <>&nbsp;</>
                ) : (
                    <>
                        <ErrorMessage
                            errors={formProps.formState.errors}
                            fieldName="membershipType"
                        />

                        <ErrorMessage
                            errors={formProps.formState.errors}
                            fieldName="tokensGatingMembership"
                        />
                    </>
                )}
            </Stack>
        </Stack>
    )
}
