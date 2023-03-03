import { motion } from 'framer-motion'
import React, { useCallback, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import useEvent from 'react-use-event-hook'
import { LoginStatus, useMatrixStore, useMyProfile, useZionClient } from 'use-zion-client'
import { vars } from 'ui/styles/vars.css'
import { Avatar, Box, Button, ErrorMessage, Icon, RadioSelect, Stack, TextField } from '@ui'
import { useAuth } from 'hooks/useAuth'
import { PATHS } from 'routes'
import { swapValueInTests } from 'utils'

const placeholders = {
    names: [
        'ben.eth',
        'benrbn.eth',
        'selashtalk.eth',
        'lupi.eth',
        'genius.eth',
        'hello.eth',
        '1345.eth',
        'jimmicricket.eth',
        'looper.eth',
    ],
    nfts: Array(3)
        .fill(0)
        .map((_, index) => `/placeholders/nft_alpha_${index + 1}.png`),
}

export const RegisterForm = ({ isEdit }: { isEdit: boolean }) => {
    const { loggedInWalletAddress, isConnected, register: registerWallet } = useAuth()
    const { setDisplayName, setAvatarUrl } = useZionClient()
    const navigate = useNavigate()
    const { loginStatus } = useMatrixStore()
    const myProfile = useMyProfile()

    const defaultValues = useMemo(
        () => ({
            walletAddress: loggedInWalletAddress,
            ens: undefined,
            displayName: myProfile?.displayName ?? '',
            nft: myProfile?.avatarUrl ?? '',
        }),
        [loggedInWalletAddress, myProfile],
    )

    const { setValue, resetField, register, handleSubmit, watch, formState, reset } = useForm({
        defaultValues,
        mode: 'onChange',
    })

    useEffect(() => {
        if (!isEdit) {
            return
        }
        reset(defaultValues)
    }, [reset, defaultValues, isEdit])

    const { errors, isValid } = formState

    console.log('loaded onboarding', {
        isConnected,
        loginStatus,
        myProfile,
    })

    const onSubmit = useCallback(
        (data: { displayName: string; nft: string }) => {
            ;(async () => {
                try {
                    if (!isConnected) {
                        console.error("Wallet not connected, shouldn't be on this page")
                        navigate('/')
                        return
                    }
                    if (loginStatus === LoginStatus.LoggedOut) {
                        await registerWallet()
                    }
                    if (data.displayName !== myProfile?.displayName) {
                        await setDisplayName(data.displayName)
                    }
                    if (data.nft !== myProfile?.avatarUrl && data.nft !== '') {
                        await setAvatarUrl(data.nft)
                    }
                } catch (e: unknown) {
                    console.warn(e)
                }

                // if we came from a space invite link, redirect back to the space
                if (window.location.pathname.includes(PATHS.SPACES)) {
                    navigate(window.location.pathname, { replace: true })
                } else {
                    navigate('/', { replace: true })
                }
            })()
        },
        [
            isConnected,
            loginStatus,
            myProfile?.avatarUrl,
            myProfile?.displayName,
            navigate,
            registerWallet,
            setAvatarUrl,
            setDisplayName,
        ],
    )
    const [fieldENS, fieldDisplayName, fieldNFT] = watch(['ens', 'displayName', 'nft'])

    const isENS = placeholders.names.includes(fieldDisplayName)

    const resetENSField = useEvent(() => {
        resetField('ens', undefined)
    })

    useEffect(() => {
        if (!isENS) {
            resetENSField()
        }
    }, [isENS, resetENSField])

    useEffect(() => {
        if (fieldENS) {
            setValue('displayName', fieldENS, { shouldValidate: true })
        }
    }, [fieldENS, setValue])

    return (
        <Stack
            gap="lg"
            minWidth="600"
            as="form"
            autoCorrect="off"
            data-testid="register-form"
            onSubmit={handleSubmit(onSubmit)}
        >
            <TextField
                autoFocus
                readOnly
                background="level2"
                label="Connected Wallet"
                secondaryLabel="(required)"
                description="Your wallet is your identity. It will be associated with your Towns account."
                placeholder="0x00"
                after={<Icon type="wallet" />}
                {...register('walletAddress')}
            />

            <Stack gap="sm">
                <TextField
                    autoFocus
                    autoCorrect="off"
                    background="level2"
                    tone={errors?.displayName ? 'negative' : undefined}
                    inputColor={isENS ? 'accent' : undefined}
                    label="Display Name"
                    secondaryLabel="(required)"
                    description="This is how others will see you."
                    placeholder="Enter a display name"
                    autoComplete="off"
                    after={isENS && <Icon type="verified" />}
                    message={<ErrorMessage errors={errors} fieldName="displayName" />}
                    {...register('displayName', {
                        pattern: {
                            value: /^[a-z0-9 '._-]+$/i,
                            message:
                                'Mostly, names can&apos;t contain punctuation. Spaces, hyphens, underscores, apostrophes and periods are fine.',
                        },
                        required: 'Please enter a display name.',
                    })}
                />

                {/* {!!placeholders.names?.length && (
                    <Box padding border rounded="sm">
                        <RadioSelect
                            label="(Optional) Set an ENS as your username:"
                            renderLabel={(label) => (
                                <Text size="lg" color="gray2">
                                    {label}
                                </Text>
                            )}
                            columns={2}
                            options={placeholders.names.map((value) => ({
                                value,
                                label: value,
                            }))}
                            applyChildProps={() => register('ens', { required: false })}
                        />
                    </Box>
                )} */}
            </Stack>

            {!!placeholders.nfts.length && (
                <RadioSelect
                    columns="60px"
                    description="This is your default profile picture."
                    label="Profile picture"
                    render={(value, selected) => (
                        <MotionBox
                            data-testid="avatar-radio"
                            rounded="full"
                            border="strong"
                            animate={{
                                opacity: !!fieldNFT && !selected ? 0.5 : 1,
                                borderColor: !selected
                                    ? `rgba(255,255,255,0)`
                                    : swapValueInTests(
                                          vars.color.foreground.default,
                                          'rgba(255, 255, 255, 0)',
                                      ),
                            }}
                        >
                            <Avatar src={value} size="avatar_lg" />
                        </MotionBox>
                    )}
                    options={placeholders.nfts.map((value) => ({ value, label: value }))}
                    applyChildProps={() => register('nft', { required: true })}
                />
            )}
            <Button type="submit" tone="cta1" disabled={!isValid}>
                Next
            </Button>
        </Stack>
    )
}

const MotionBox = motion(Box)
