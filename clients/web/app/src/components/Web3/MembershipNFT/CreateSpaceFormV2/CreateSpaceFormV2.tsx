import React, { ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { FormProvider, UseFormReturn, useFormContext } from 'react-hook-form'
import { useMyProfile } from 'use-towns-client'
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
} from '@ui'
import { BlurredBackground } from '@components/TouchLayoutHeader/BlurredBackground'
import { LargeUploadImageTemplate } from '@components/UploadImage/LargeUploadImageTemplate'
import { useImageStore } from '@components/UploadImage/useImageStore'
import { UploadImageRequestConfig } from 'api/lib/uploadImage'
import { InteractiveTownsToken } from '@components/TownsToken/InteractiveTownsToken'
import { useAuth } from 'hooks/useAuth'
import { AvatarTextHorizontal } from '@components/Avatar/AvatarTextHorizontal'
import { shortAddress } from 'ui/utils/utils'
import { FadeInBox } from '@components/Transitions'
import { TEMPORARY_SPACE_ICON_URL } from '@components/Web3/constants'
import { AutoGrowTextArea } from 'ui/components/TextArea/AutoGrowTextArea'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { useTokenMetadataForChainId } from 'api/lib/collectionMetadata'
import { TokenImage } from '@components/Tokens/TokenSelector/TokenImage'
import { CreateSpaceFormV2SchemaType, schema } from './CreateSpaceFormV2.schema'
import { AvatarPlaceholder } from '../AvatarPlaceholder'
import { PanelType, TransactionDetails } from './types'
import { PanelContent } from './PanelContents'
import { CreateTownSubmit } from './CreateTownSubmit'
import { CreateSpaceMintAnimation } from './CreateSpaceMintAnimation'

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

    const { data: abstractAccountAddress } = useAbstractAccountAddress({
        rootKeyAddress: loggedInWalletAddress,
    })

    const [panelType, setPanelType] = useState<PanelType | undefined>()

    const defaultValues: Omit<CreateSpaceFormV2SchemaType, 'spaceName'> & { spaceName: undefined } =
        {
            membershipType: 'everyone',
            membershipLimit: 1000,
            membershipCost: '0',
            spaceName: undefined,
            tokensGatingMembership: [],
            spaceIconUrl: null,
            spaceIconFile: null,
            spaceBio: null,
            // TODO: currency defaults to ETH when addressZero
            membershipCurrency: ethers.constants.AddressZero,
        }

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
                defaultValues={defaultValues}
                mode="all"
            >
                {(hookForm) => {
                    const _form = hookForm as unknown as UseFormReturn<CreateSpaceFormV2SchemaType>

                    const [
                        spaceNameValue,
                        price,
                        limit,
                        tokensGatingMembership,
                        membershipType,
                        spaceBioValue,
                    ] = _form.watch([
                        'spaceName',
                        'membershipCost',
                        'membershipLimit',
                        'tokensGatingMembership',
                        'membershipType',
                        'spaceBio',
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
                            <Stack grow overflow="auto">
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
                                        <Stack grow position="relative" zIndex="above">
                                            <Stack>
                                                <Stack paddingY="x4" gap="sm">
                                                    <SpaceNameField
                                                        form={_form}
                                                        spaceNameValue={spaceNameValue}
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
                                                                    userId={loggedInWalletAddress}
                                                                    abstractAccountaddress={
                                                                        abstractAccountAddress
                                                                    }
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
                                                                        <SelectedToken
                                                                            key={
                                                                                token.address +
                                                                                token.chainId
                                                                            }
                                                                            contractAddress={
                                                                                token.address
                                                                            }
                                                                            chainId={token.chainId}
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
                                                                {isNaN(+price) ? '--' : price}
                                                            </Text>
                                                        </>
                                                    </FormFieldEdit>
                                                </Box>
                                                <AutoGrowTextArea
                                                    text={spaceBioValue ?? undefined}
                                                    maxWidth="420"
                                                    fontSize="lg"
                                                    paddingX="none"
                                                    paddingY="md"
                                                    placeholder="Add town bio"
                                                    tone="none"
                                                    maxLength={400}
                                                    counterOffset={{
                                                        bottom: 'none',
                                                    }}
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
                                zIndex="above"
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
            {transactionDetails.isTransacting ? <CreateSpaceMintAnimation /> : <></>}
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
    const spaceName = watch('spaceName')
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
                    spaceName={spaceName}
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

function SpaceNameField({
    form,
    spaceNameValue,
}: {
    spaceNameValue: string
    form: UseFormReturn<CreateSpaceFormV2SchemaType>
}) {
    const { setFocus } = useFormContext<CreateSpaceFormV2SchemaType>()
    useEffect(() => {
        setFocus('spaceName')
    }, [setFocus])
    return (
        <>
            <AutoGrowTextArea
                text={spaceNameValue}
                style={{
                    fontFamily: 'TitleFont',
                    textTransform: 'uppercase',
                }}
                fontSize="h1"
                maxWidth="500"
                paddingY="none"
                paddingX="none"
                placeholder="town name"
                tone="none"
                autoComplete="one-time-code"
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault()
                    }
                }}
                {...form.register('spaceName')}
            />
        </>
    )
}

function SelectedToken({ contractAddress, chainId }: { contractAddress: string; chainId: number }) {
    const { data: tokenDataWithChainId } = useTokenMetadataForChainId(contractAddress, chainId)

    return <TokenImage imgSrc={tokenDataWithChainId?.data.imgSrc} width="x4" />
}
