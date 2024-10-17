import React, { useCallback, useRef, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { Address, useConnectivity } from 'use-towns-client'
import { Token } from '@components/Tokens/TokenSelector/tokenSchemas'
import { ErrorMessage, Paragraph, RadioCard, Stack, Toggle } from '@ui'
import { TokenSelector } from '@components/Tokens/TokenSelector/TokenSelector'
import { WalletMemberSelector } from '@components/SpaceSettingsPanel/WalletMemberSelector'
import { MembershipSettingsSchemaType } from '../MembershipNFT/CreateSpaceFormV2/CreateSpaceFormV2.schema'

interface EditGatingProps {
    isRole?: boolean
}

// superrefine is not triggering w/ react-hook-form onChange mode
// so we need to manually trigger the validation
// https://github.com/react-hook-form/resolvers/issues/661
function triggerTokensAndUsersValidation(
    trigger: ReturnType<typeof useFormContext<MembershipSettingsSchemaType>>['trigger'],
    everHadValue: boolean,
) {
    if (everHadValue) {
        trigger(['tokensGatedBy', 'usersGatedBy', 'ethBalanceGatedBy'])
    }
}

export function EditGating({ isRole }: EditGatingProps) {
    const { loggedInWalletAddress: wallet } = useConnectivity()
    const formProps = useFormContext<MembershipSettingsSchemaType>()
    const { setValue, getValues, watch, formState, reset } = formProps
    const isValid = !Object.values(formState.errors).length
    const inputRef = useRef<HTMLInputElement>(null)

    const [digitalAssetsEnabled, setDigitalAssetsEnabled] = useState(
        getValues('tokensGatedBy').length > 0 ||
            getValues('usersGatedBy').length > 0 ||
            !!getValues('ethBalanceGatedBy'),
    )

    const hadTokenValueRef = useRef(false)
    const hadUsersValueRef = useRef(false)
    const hadEthBalanceValueRef = useRef(false)
    const [walletAddressesEnabled, setWalletAddressesEnabled] = useState(
        getValues('usersGatedBy').length > 0,
    )

    const onEveryoneClick = useCallback(() => {
        reset(
            {
                ...getValues(),
                gatingType: 'everyone',
            },
            { keepDefaultValues: true },
        )
    }, [reset, getValues])

    const onGatedCardClick = useCallback(() => {
        const currentMembershipType = getValues('gatingType')
        setValue('gatingType', 'gated')
        if (currentMembershipType !== 'gated') {
            setTimeout(() => inputRef.current?.focus(), 0)
        }
    }, [getValues, setValue])

    const onSelectedTokensChange = useCallback(
        (tokens: Token[]) => {
            if (tokens.length === 0) {
                setValue('tokensGatedBy', [], {
                    shouldValidate: true,
                })
            } else {
                hadTokenValueRef.current = true
                setValue(
                    'tokensGatedBy',
                    tokens.map((token) => ({
                        chainId: token.chainId,
                        data: {
                            type: token.data.type,
                            address: token.data.address,
                            symbol: token.data.symbol,
                            quantity: token.data.quantity,
                            label: token.data.label,
                            imgSrc: token.data.imgSrc,
                            openSeaCollectionUrl: token.data.openSeaCollectionUrl || undefined,
                            decimals: token.data.decimals,
                            tokenId: token.data.tokenId,
                        },
                    })),
                    {
                        shouldValidate: true,
                    },
                )
            }
            triggerTokensAndUsersValidation(formProps.trigger, hadTokenValueRef.current)
        },
        [setValue, formProps],
    )

    const onEthBalanceChange = useCallback(
        (balance: string) => {
            hadEthBalanceValueRef.current = true
            setValue('ethBalanceGatedBy', balance, {
                shouldValidate: true,
            })
            triggerTokensAndUsersValidation(formProps.trigger, hadEthBalanceValueRef.current)
        },
        [setValue, formProps],
    )

    const onDigitalAssetsToggle = useCallback(() => {
        const nextValue = !digitalAssetsEnabled
        setDigitalAssetsEnabled(nextValue)
        if (!nextValue) {
            onSelectedTokensChange([])
            onEthBalanceChange('')
        }
    }, [digitalAssetsEnabled, onSelectedTokensChange, onEthBalanceChange])

    const onUsersGatedByChange = useCallback(
        (addresses: Address[]) => {
            setValue('usersGatedBy', addresses, {
                shouldValidate: true,
            })
            if (addresses.length > 0) {
                hadUsersValueRef.current = true
            }
            triggerTokensAndUsersValidation(formProps.trigger, hadUsersValueRef.current)
            setWalletAddressesEnabled(true)
        },
        [setValue, formProps],
    )

    const onWalletAddressesToggle = useCallback(() => {
        const nextValue = !walletAddressesEnabled
        setWalletAddressesEnabled(nextValue)
        if (!nextValue) {
            onUsersGatedByChange([])
            setWalletAddressesEnabled(false)
        }
    }, [walletAddressesEnabled, onUsersGatedByChange])

    if (!wallet) {
        return null
    }

    const gatingType = watch('gatingType')
    const isTokenFieldTouched = formState.touchedFields.tokensGatedBy
    const isEthBalanceFieldTouched = formState.touchedFields.ethBalanceGatedBy

    return (
        <Stack gap="sm" data-testid="gating-section">
            <Stack>
                <RadioCard
                    name="gatingType"
                    value="everyone"
                    title={isRole ? 'All members' : 'Anyone'}
                    description={
                        isRole
                            ? 'All members get access to this role'
                            : 'Anyone with the town link may join your town'
                    }
                    dataTestId="membership-type-everyone"
                    onClick={onEveryoneClick}
                    {...formProps}
                />
            </Stack>

            {wallet && (
                <RadioCard
                    name="gatingType"
                    value="gated"
                    title="Gated"
                    description={
                        isRole
                            ? 'Access to this role is gated by the following criteria'
                            : 'Membership is gated by the following criteria'
                    }
                    dataTestId="membership-type-gated"
                    onClick={onGatedCardClick}
                    {...formProps}
                >
                    {gatingType === 'gated' && (
                        <Stack gap="md" background="level2">
                            <Stack gap="md">
                                <Stack background="level3" padding="md" rounded="md" gap="md">
                                    <Stack horizontal grow gap as="label" cursor="pointer">
                                        <Stack grow padding="xs">
                                            <Paragraph strong>Digital Assets</Paragraph>
                                            <Paragraph color="gray2">
                                                Gate access based on token ownership
                                            </Paragraph>
                                        </Stack>
                                        <Stack centerContent>
                                            <Toggle
                                                toggled={digitalAssetsEnabled}
                                                background="level2"
                                                data-testid="digital-assets-toggle"
                                                onToggle={onDigitalAssetsToggle}
                                            />
                                        </Stack>
                                    </Stack>

                                    {digitalAssetsEnabled && (
                                        <TokenSelector
                                            isValidationError={
                                                formState.errors.tokensGatedBy !== undefined &&
                                                !!isTokenFieldTouched &&
                                                !!isEthBalanceFieldTouched
                                            }
                                            inputRef={inputRef}
                                            ethBalance={getValues('ethBalanceGatedBy')}
                                            tokens={getValues('tokensGatedBy')}
                                            onChange={onSelectedTokensChange}
                                            onEthBalanceChange={onEthBalanceChange}
                                        />
                                    )}
                                </Stack>

                                <Stack background="level3" padding="md" rounded="md" gap="md">
                                    <Stack horizontal grow gap as="label" cursor="pointer">
                                        <Stack grow padding="xs">
                                            <Paragraph strong>
                                                {isRole
                                                    ? 'Members / Wallet Addresses'
                                                    : 'Wallet Addresses'}
                                            </Paragraph>
                                            <Paragraph color="gray2">
                                                Gate access based on specific wallet addresses{' '}
                                                {isRole ? 'or members' : ''}
                                            </Paragraph>
                                        </Stack>
                                        <Stack centerContent>
                                            <Toggle
                                                toggled={walletAddressesEnabled}
                                                background="level2"
                                                data-testid="wallet-addresses-toggle"
                                                onToggle={onWalletAddressesToggle}
                                            />
                                        </Stack>
                                    </Stack>

                                    {walletAddressesEnabled && (
                                        <WalletMemberSelector
                                            isRole={isRole}
                                            walletMembers={getValues('usersGatedBy') as Address[]}
                                            isValidationError={
                                                formState.errors.usersGatedBy !== undefined &&
                                                !!formState.touchedFields.usersGatedBy
                                            }
                                            onChange={onUsersGatedByChange}
                                        />
                                    )}
                                </Stack>
                            </Stack>
                        </Stack>
                    )}
                </RadioCard>
            )}

            {isValid ? null : (
                <>
                    {isTokenFieldTouched && gatingType === 'gated' && (
                        <Stack>
                            <ErrorMessage errors={formState.errors} fieldName="tokensGatedBy" />
                        </Stack>
                    )}
                </>
            )}
        </Stack>
    )
}
