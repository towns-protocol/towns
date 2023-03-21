import React, { useCallback, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { matchPath, useNavigate } from 'react-router'
import { LoginStatus, useMatrixStore, useMyProfile, useZionClient } from 'use-zion-client'

import { Button, ErrorMessage, Icon, Stack, TextField } from '@ui'
import { useAuth } from 'hooks/useAuth'
import { UploadAvatar } from '@components/UploadImage/UploadAvatar/UploadAvatar'
import { PATHS } from 'routes'
import { useUploadImage } from 'api/lib/uploadImage'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'

export const RegisterForm = ({ isEdit }: { isEdit: boolean }) => {
    const { loggedInWalletAddress, isConnected, register: registerWallet } = useAuth()
    const { setDisplayName } = useZionClient()
    const navigate = useNavigate()
    const { loginStatus } = useMatrixStore()
    const myProfile = useMyProfile()

    const defaultValues = useMemo(
        () => ({
            walletAddress: loggedInWalletAddress,
            displayName: myProfile?.displayName ?? '',
            // this property is used for the upload component and to leverage react-hook-form's error/state tracking, but we don't actually have to track it's defaultValue when the form loads
            // 1. when registering, if this field is empty at submission time, we will upload a random image
            // 2. when editing, they will already have an image and we don't want to overwrite it in submission
            profilePic: undefined,
        }),
        [loggedInWalletAddress, myProfile],
    )

    const { mutateAsync: upload, isLoading: imageUploading } = useUploadImage(
        loggedInWalletAddress ?? '',
    )

    const { setValue, register, handleSubmit, formState, reset, setError, clearErrors, watch } =
        useForm<{
            walletAddress: string
            displayName: string
            profilePic: FileList | undefined
        }>({
            defaultValues,
            mode: 'onChange',
        })

    watch(['profilePic', 'displayName'])

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
        (data: { displayName: string; profilePic: FileList | undefined }) => {
            ;(async () => {
                try {
                    if (!isConnected) {
                        console.error("Wallet not connected, shouldn't be on this page")
                        navigate('/')
                        return
                    }
                    // only upload an image when first registering and if the user has not uploaded one
                    // this needs to be done before the registerWallet call
                    if (!isEdit && !data.profilePic?.[0] && loggedInWalletAddress) {
                        try {
                            // upload to CF a random image
                            const random = Math.floor(Math.random() * 25) + 1
                            const url = `/placeholders/pp${random}.png`
                            const blob = await fetch(url).then((r) => r.blob())
                            const file = new File([blob], 'avatar.png')

                            await upload({
                                id: loggedInWalletAddress,
                                file,
                                type: 'avatar',
                                imageUrl: url,
                            })
                        } catch (error) {
                            console.error('Error uploading random image', error)
                        }
                    }

                    if (loginStatus === LoginStatus.LoggedOut) {
                        await registerWallet()
                    }
                    if (data.displayName !== myProfile?.displayName) {
                        await setDisplayName(data.displayName)
                    }
                } catch (e: unknown) {
                    console.warn(e)
                }

                const spacePath = matchPath(`${PATHS.SPACES}/:spaceSlug`, window.location.pathname)

                // if we came from a space invite link, redirect back to the space
                if (spacePath && window.location.search.includes('invite')) {
                    navigate({ pathname: spacePath.pathname, search: '?invite' }, { replace: true })
                } else {
                    navigate('/', { replace: true })
                }
            })()
        },
        [
            isConnected,
            isEdit,
            loggedInWalletAddress,
            loginStatus,
            myProfile?.displayName,
            navigate,
            registerWallet,
            setDisplayName,
            upload,
        ],
    )

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
                    label="Display Name"
                    secondaryLabel="(required)"
                    description="This is how others will see you."
                    placeholder="Enter a display name"
                    autoComplete="off"
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
            </Stack>

            {myProfile?.userId && (
                <UploadAvatar
                    userId={myProfile.userId}
                    setError={setError}
                    register={register}
                    formState={formState}
                    clearErrors={clearErrors}
                    setValue={setValue}
                />
            )}

            <Button type="submit" tone="cta1" disabled={!isValid || imageUploading}>
                {imageUploading && <ButtonSpinner />}
                Next
            </Button>
        </Stack>
    )
}
