import React, { useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { matchPath, useNavigate } from 'react-router'
import { LoginStatus, useMyProfile } from 'use-zion-client'
import { useGetEmbeddedSigner } from '@towns/privy'
import { Button, ErrorMessage, Icon, MotionBox, Paragraph, Stack, TextField } from '@ui'
import { useAuth } from 'hooks/useAuth'
import { PATHS } from 'routes'
import { useUploadImage } from 'api/lib/uploadImage'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { env } from 'utils'
import { SmallUploadImageTemplate } from '@components/UploadImage/SmallUploadImageTemplate'

type RegisterFormFieldValues = {
    walletAddress: string
    displayName: string
    profilePic: FileList | undefined
}

export const RegisterForm = () => {
    const {
        loggedInWalletAddress,
        isConnected,
        register: registerWallet,
        riverLoginStatus: loginStatus,
    } = useAuth()
    // const { setDisplayName } = useZionClient()
    const navigate = useNavigate()
    const myProfile = useMyProfile()

    const defaultValues = useMemo(
        () => ({
            walletAddress: loggedInWalletAddress,
            displayName: '',
            // this property is used for the upload component and to leverage react-hook-form's error/state tracking, but we don't actually have to track it's defaultValue when the form loads
            // 1. when registering, if this field is empty at submission time, we will upload a random image
            // 2. when editing, they will already have an image and we don't want to overwrite it in submission
            profilePic: undefined,
        }),
        [loggedInWalletAddress],
    )

    const { mutateAsync: upload, isPending: imageUploading } = useUploadImage(
        loggedInWalletAddress ?? '',
    )

    const { register, handleSubmit, formState, setError, clearErrors, watch } =
        useForm<RegisterFormFieldValues>({
            defaultValues,
            mode: 'onChange',
        })

    watch(['profilePic', 'displayName'])

    const { errors, isValid } = formState

    console.log('loaded onboarding', {
        isConnected,
        loginStatus,
        myProfile,
    })
    const getSigner = useGetEmbeddedSigner()

    const onSubmit = useCallback(
        (data: { displayName: string; profilePic: FileList | undefined }) => {
            ;(async () => {
                const signer = await getSigner()
                try {
                    if (!isConnected) {
                        console.error("Wallet not connected, shouldn't be on this page")
                        navigate('/')
                        return
                    }
                    // only upload an image when first registering and if the user has not uploaded one
                    // this needs to be done before the registerWallet call
                    if (!data.profilePic?.[0] && loggedInWalletAddress) {
                        if (
                            !env.DEV ||
                            // only upload an image locally when actually want to using ?registrationUpload
                            (env.DEV && window.location.search.includes('registrationUpload'))
                        ) {
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
                    }

                    if (loginStatus === LoginStatus.LoggedOut) {
                        await registerWallet(signer)
                    }

                    // TODO: displayNames can only be set on a towns-level at the moment

                    // if (data.displayName !== myProfile?.displayName) {
                    //     await setDisplayName(data.displayName)
                    // }
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
            loggedInWalletAddress,
            loginStatus,
            // myProfile?.displayName,
            navigate,
            registerWallet,
            // setDisplayName,
            upload,
            getSigner,
        ],
    )

    return (
        <Stack
            gap="x4"
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
                    message={<ErrorMessage preventSpace errors={errors} fieldName="displayName" />}
                    {...register('displayName', {
                        pattern: {
                            value: /^[a-z0-9 '._-]+$/i,
                            message:
                                "Mostly, names can't contain punctuation. Spaces, hyphens, underscores, apostrophes and periods are fine.",
                        },
                        required: 'Please enter a display name.',
                    })}
                />
            </Stack>
            <MotionBox gap="x4" layout="position">
                <Stack gap>
                    <Paragraph strong>Profile picture</Paragraph>
                    <Paragraph color="gray1">Upload a profile picture.</Paragraph>
                    {myProfile?.userId && loggedInWalletAddress && (
                        <SmallUploadImageTemplate
                            canEdit
                            type="avatar"
                            formFieldName="profilePic"
                            resourceId={loggedInWalletAddress}
                            setError={setError}
                            register={register}
                            formState={formState}
                            clearErrors={clearErrors}
                            imageRestrictions={{
                                minDimension: {
                                    message: `Image is too small. Please upload an image with a minimum height & width of 300px.`,
                                    min: 300,
                                },
                            }}
                        />
                    )}
                </Stack>

                <Button
                    type="submit"
                    tone="cta1"
                    disabled={!isValid || imageUploading}
                    animate={false}
                >
                    {imageUploading && <ButtonSpinner />}
                    Next
                </Button>
            </MotionBox>
        </Stack>
    )
}
