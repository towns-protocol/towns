import React, { ReactNode, useCallback, useRef, useState } from 'react'
import { FormProvider, UseFormReturn, useFormContext } from 'react-hook-form'
import { useMyProfile } from 'use-zion-client'
import { ethers } from 'ethers'
import { useNavigate } from 'react-router'
import {
    Box,
    Button,
    ErrorMessage,
    FormRender,
    Grid,
    Icon,
    IconButton,
    MotionBox,
    MotionStack,
    Stack,
    Text,
    TextField,
} from '@ui'
import { BlurredBackground } from '@components/TouchLayoutHeader/BlurredBackground'
import { LargeUploadImageTemplate } from '@components/UploadImage/LargeUploadImageTemplate'
import { useImageStore } from '@components/UploadImage/useImageStore'
import { UploadImageRequestConfig } from 'api/lib/uploadImage'
import { InteractiveTownsToken } from '@components/TownsToken/InteractiveTownsToken'
import { TextArea } from 'ui/components/TextArea/TextArea'
import { useAuth } from 'hooks/useAuth'
import { AvatarTextHorizontal } from 'ui/components/Avatar/AvatarTextHorizontal'
import { shortAddress } from 'ui/utils/utils'
import { FadeInBox } from '@components/Transitions'
import { TEMPORARY_SPACE_ICON_URL } from '@components/Web3/CreateSpaceForm/constants'
import { FetchedTokenAvatar } from '@components/Tokens/FetchedTokenAvatar'
import { CreateSpaceFormV2SchemaType, schema } from './CreateSpaceFormV2.schema'
import { AvatarPlaceholder } from '../AvatarPlaceholder'
import { PanelType, TransactionDetails } from './types'
import { PanelContent } from './PanelContents'
import { CreateTownSubmit } from './CreateTownSubmit'

type Member = { address: ReturnType<typeof useAuth>['loggedInWalletAddress']; displayName?: string }

export function CreateSpaceFormV2() {
    const { loggedInWalletAddress } = useAuth()
    const displayName = shortAddress(useMyProfile()?.displayName ?? '')
    const hasReached2Chars = useRef(false)
    const navigate = useNavigate()
    const [transactionDetails, setTransactionDetails] = useState<TransactionDetails>({
        isTransacting: false,
        townAddress: undefined,
    })

    const [panelType, setPanelType] = useState<PanelType | undefined>()

    return (
        <Stack horizontal absoluteFill>
            <Stack position="absolute" top="xs" left="xs" zIndex="above">
                <Button
                    tone="none"
                    color="default"
                    disabled={transactionDetails.isTransacting}
                    onClick={() => navigate('/')}
                >
                    <Icon type="back" /> Back
                </Button>
            </Stack>
            <FormRender
                absoluteFill
                horizontal
                id="CreateSpaceFormV2"
                schema={schema}
                // make sure all values from schema are set so the form validates properly
                defaultValues={{
                    membershipType: 'everyone',
                    membershipLimit: 1000,
                    membershipCost: 0,
                    spaceName: undefined,
                    tokensGatingMembership: [],
                    spaceIconUrl: null,
                    spaceIconFile: null,
                    spaceBio: null,
                    // TODO: currency defaults to ETH when addressZero
                    membershipCurrency: ethers.constants.AddressZero,
                }}
                mode="all"
            >
                {(hookForm) => {
                    const _form = hookForm as unknown as UseFormReturn<CreateSpaceFormV2SchemaType>

                    const [spaceNameValue, price, limit, tokensGatingMembership, membershipType] =
                        _form.watch([
                            'spaceName',
                            'membershipCost',
                            'membershipLimit',
                            'tokensGatingMembership',
                            'membershipType',
                        ])

                    if (spaceNameValue && !hasReached2Chars.current && spaceNameValue.length > 1) {
                        hasReached2Chars.current = true
                    }

                    const showSpaceNameError = () => {
                        if (_form.formState.isSubmitted) {
                            return true
                        }
                        const spaceNameError = _form.formState.errors['spaceName']
                        if (spaceNameError?.type !== 'too_small') {
                            return true
                        }
                        // only show the too_small error if the user has typed more than 2 characters
                        return hasReached2Chars.current
                    }

                    return (
                        <FormProvider {..._form}>
                            <Stack grow>
                                {/* columns */}
                                <Stack grow alignItems="center" paddingX="lg" width="100%">
                                    <Stack
                                        horizontal
                                        grow
                                        position="relative"
                                        width="100%"
                                        maxWidth="1200"
                                        paddingTop="x16"
                                    >
                                        {/* left col */}
                                        <Stack grow>
                                            <Stack>
                                                <Stack paddingY="x4" gap="sm">
                                                    <TextField
                                                        paddingY="none"
                                                        paddingX="none"
                                                        style={{
                                                            fontFamily: 'TitleFont',
                                                            textTransform: 'uppercase',
                                                        }}
                                                        fontSize="h1"
                                                        placeholder="town name"
                                                        maxWidth="500"
                                                        tone="none"
                                                        autoComplete="one-time-code"
                                                        {..._form.register('spaceName')}
                                                    />
                                                    {_form.formState.errors['spaceName'] &&
                                                        showSpaceNameError() && (
                                                            <FadeInBox key="spaceNameError">
                                                                <ErrorMessage
                                                                    errors={_form.formState.errors}
                                                                    fieldName="spaceName"
                                                                />
                                                            </FadeInBox>
                                                        )}
                                                </Stack>

                                                <Box alignItems="start" gap="md">
                                                    <FormFieldEdit label="By">
                                                        <>
                                                            {loggedInWalletAddress && (
                                                                <AvatarTextHorizontal
                                                                    address={loggedInWalletAddress}
                                                                    name={displayName ?? ''}
                                                                />
                                                            )}
                                                        </>
                                                    </FormFieldEdit>

                                                    <FormFieldEdit
                                                        label="For"
                                                        hasError={Boolean(
                                                            _form.formState.errors[
                                                                'tokensGatingMembership'
                                                            ],
                                                        )}
                                                        onClick={() => {
                                                            if (transactionDetails.isTransacting) {
                                                                return
                                                            }
                                                            setPanelType(PanelType.gating)
                                                        }}
                                                    >
                                                        {membershipType === 'tokenHolders' ? (
                                                            tokensGatingMembership.length === 0 ? (
                                                                <Text strong size="lg">
                                                                    Select a token...
                                                                </Text>
                                                            ) : (
                                                                tokensGatingMembership.map(
                                                                    (token) => (
                                                                        <FetchedTokenAvatar
                                                                            noLabel
                                                                            key={
                                                                                token.contractAddress as string
                                                                            }
                                                                            address={
                                                                                token.contractAddress as string
                                                                            }
                                                                            tokenIds={
                                                                                token.tokenIds as number[]
                                                                            }
                                                                            size="avatar_x4"
                                                                            labelProps={{
                                                                                size: 'md',
                                                                            }}
                                                                            layoutProps={{
                                                                                horizontal: true,
                                                                                maxWidth: 'auto',
                                                                            }}
                                                                        />
                                                                    ),
                                                                )
                                                            )
                                                        ) : (
                                                            <Text strong size="lg">
                                                                Anyone
                                                            </Text>
                                                        )}
                                                    </FormFieldEdit>

                                                    <FormFieldEdit
                                                        label="Membership"
                                                        hasError={Boolean(
                                                            _form.formState.errors[
                                                                'membershipCost'
                                                            ],
                                                        )}
                                                        onClick={() => {
                                                            if (transactionDetails.isTransacting) {
                                                                return
                                                            }
                                                            setPanelType(PanelType.pricing)
                                                        }}
                                                    >
                                                        <>
                                                            <Text strong size="lg">
                                                                {isNaN(limit) ? '--' : limit} *{' '}
                                                                {isNaN(price) ? '--' : price}
                                                            </Text>
                                                        </>
                                                    </FormFieldEdit>
                                                </Box>
                                                <TextArea
                                                    maxWidth="420"
                                                    paddingX="none"
                                                    paddingY="md"
                                                    placeholder="Add town bio"
                                                    tone="none"
                                                    fontSize="lg"
                                                    {..._form.register('spaceBio')}
                                                />
                                            </Stack>
                                        </Stack>

                                        {/* right col */}

                                        <MotionStack
                                            paddingTop="x4"
                                            animate={{
                                                opacity: panelType === undefined ? 1 : 0,
                                            }}
                                        >
                                            <Stack display="block">
                                                <TownPageBackgroundImageUpdater
                                                    transactionDetails={transactionDetails}
                                                />
                                            </Stack>
                                        </MotionStack>
                                    </Stack>
                                </Stack>
                                <CreateTownSubmit
                                    panelType={panelType}
                                    setPanelType={setPanelType}
                                    form={_form}
                                    setTransactionDetails={setTransactionDetails}
                                />
                            </Stack>

                            {/* Panel */}
                            <MotionStack
                                width="600"
                                position="absolute"
                                background="level1"
                                height="100vh"
                                right="none"
                                initial={{
                                    x: '100%',
                                }}
                                animate={{
                                    x: panelType ? '0' : '100%',
                                }}
                                transition={{
                                    type: 'easeInOut',
                                    duration: 0.2,
                                }}
                                borderLeft="level3"
                            >
                                <PanelContent
                                    panelType={panelType}
                                    onClick={() => setPanelType(undefined)}
                                />
                            </MotionStack>
                        </FormProvider>
                    )
                }}
            </FormRender>
        </Stack>
    )
}

export const TownPageMemberList = ({ members }: { members?: Member[] }) => (
    <Stack width="500" maxWidth="500">
        <Grid columnMinSize="80px">
            {members?.map((member, idx) => (
                <Stack paddingBottom="lg" key={`member_${member.address ? member.address : idx}`}>
                    <AvatarPlaceholder member={member} />
                </Stack>
            ))}
        </Grid>
    </Stack>
)

export const TownPageBackgroundImageUpdater = ({
    transactionDetails,
}: {
    transactionDetails: TransactionDetails
}) => {
    const { register, formState, setError, clearErrors, setValue, watch } =
        useFormContext<CreateSpaceFormV2SchemaType>()

    const rawImageSrc = watch('spaceIconUrl')
    // b/c it's a FileList before upload
    const imageSrc = typeof rawImageSrc === 'string' ? rawImageSrc : undefined

    const onUpload = useCallback(
        ({ imageUrl, file, id }: Omit<UploadImageRequestConfig, 'type'>) => {
            // set resource on image store so the image updates in the upload component
            const { setLoadedResource } = useImageStore.getState()

            setLoadedResource(id, {
                imageUrl,
            })
            setValue('spaceIconUrl', imageUrl)
            setValue('spaceIconFile', file)
        },
        [setValue],
    )

    return (
        <Box display="inline-block">
            {imageSrc && (
                <MotionBox
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    position="fixed"
                    top="none"
                    left="none"
                    bottom="none"
                    right="none"
                    pointerEvents="none"
                >
                    <BlurredBackground imageSrc={imageSrc} blur={40} />
                </MotionBox>
            )}
            <LargeUploadImageTemplate<CreateSpaceFormV2SchemaType>
                canEdit={!transactionDetails.isTransacting}
                type="spaceIcon"
                formFieldName="spaceIconUrl"
                resourceId={TEMPORARY_SPACE_ICON_URL}
                setError={setError}
                register={register}
                formState={formState}
                clearErrors={clearErrors}
                overrideUploadCb={onUpload}
                uploadIconSize="square_md"
                uploadIconPosition={imageSrc ? 'topRight' : 'absoluteCenter'}
            >
                <InteractiveTownsToken
                    mintMode
                    size="xl"
                    address={transactionDetails.townAddress}
                    imageSrc={imageSrc ?? undefined}
                />
            </LargeUploadImageTemplate>
        </Box>
    )
}

function FormFieldEdit({
    label,
    children,
    onClick,
    hasError,
}: {
    label: string
    children: ReactNode
    onClick?: () => void
    hasError?: boolean
}) {
    const [hovered, setHovered] = useState(false)
    return (
        <Box
            horizontal
            centerContent
            gap="sm"
            cursor="pointer"
            display="inline-flex"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={onClick}
        >
            <Text color="gray2" size="lg">
                {label}
            </Text>
            {children}
            {hasError && <Icon size="square_xs" type="alert" color="error" />}
            {onClick && (
                <MotionBox
                    color="default"
                    animate={{
                        opacity: hovered ? 1 : 0,
                    }}
                >
                    <IconButton icon="edit" color="default" />
                </MotionBox>
            )}
        </Box>
    )
}
