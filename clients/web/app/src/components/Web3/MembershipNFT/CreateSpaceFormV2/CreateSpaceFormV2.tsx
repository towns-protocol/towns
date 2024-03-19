import React, { useCallback, useEffect, useRef, useState } from 'react'
import { FormProvider, UseFormReturn, useFormContext } from 'react-hook-form'
import { ethers } from 'ethers'
import { useNavigate } from 'react-router'
import {
    Box,
    Button,
    ErrorMessage,
    FormRender,
    Grid,
    Icon,
    MotionBox,
    MotionStack,
    Paragraph,
    Stack,
} from '@ui'
import { BlurredBackground } from '@components/TouchLayoutHeader/BlurredBackground'
import { LargeUploadImageTemplate } from '@components/UploadImage/LargeUploadImageTemplate'
import { useImageStore } from '@components/UploadImage/useImageStore'
import { UploadImageRequestConfig } from 'api/lib/uploadImage'
import { InteractiveTownsToken } from '@components/TownsToken/InteractiveTownsToken'
import { useAuth } from 'hooks/useAuth'
import { shortAddress } from 'ui/utils/utils'
import { FadeInBox } from '@components/Transitions'
import { TEMPORARY_SPACE_ICON_URL } from '@components/Web3/constants'
import { AutoGrowTextArea } from 'ui/components/TextArea/AutoGrowTextArea'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { useTokenMetadataForChainId } from 'api/lib/collectionMetadata'
import { TokenImage } from '@components/Tokens/TokenSelector/TokenImage'
import { InformationBox } from '@components/TownPageLayout/TownPageLayout'
import { Avatar } from '@components/Avatar/Avatar'
import { CreateSpaceFormV2SchemaType, schema } from './CreateSpaceFormV2.schema'
import { AvatarPlaceholder } from '../AvatarPlaceholder'
import { PanelType, TransactionDetails } from './types'
import { PanelContent } from './PanelContents'
import { CreateTownSubmit } from './CreateTownSubmit'

const LazyCreateSpaceMintAnimation = React.lazy(() => import('./CreateSpaceMintAnimation'))

type Member = { address: ReturnType<typeof useAuth>['loggedInWalletAddress']; displayName?: string }

export function CreateSpaceFormV2() {
    const { loggedInWalletAddress } = useAuth()
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
            membershipPricingType: 'dynamic',
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
                        membershipPricingType,
                    ] = _form.watch([
                        'spaceName',
                        'membershipCost',
                        'membershipLimit',
                        'tokensGatingMembership',
                        'membershipType',
                        'spaceBio',
                        'membershipPricingType',
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

                    const onInfoBoxClick = () => {
                        if (transactionDetails.isTransacting) {
                            return
                        }
                        setPanelType(PanelType.all)
                    }

                    const costInfoBoxText = () => {
                        {
                            _form.formState.errors['membershipCost']
                                ? '--'
                                : +price === 0
                                ? 'Free'
                                : price + ' Ξ'
                        }
                        if (_form.formState.errors['membershipCost']) {
                            return '--'
                        }
                        if (membershipPricingType === 'dynamic') {
                            return 'Free'
                        }

                        if (price === '') {
                            return '--'
                        }
                        return price + ' Ξ'
                    }

                    return (
                        <FormProvider {..._form}>
                            <Stack grow overflow="auto">
                                {/* columns */}
                                <Stack grow alignItems="center" paddingX="lg">
                                    <Stack
                                        horizontal
                                        grow
                                        paddingTop="x16"
                                        gap="x20"
                                        position="relative"
                                        // width="100%"
                                        // maxWidth="1200"
                                        // paddingTop="x16"
                                    >
                                        {/* left col */}
                                        <Stack grow position="relative" zIndex="above">
                                            <Stack gap="x4">
                                                {/* space name */}
                                                <Stack gap="sm">
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

                                                {/* info boxes */}
                                                <Box horizontal alignItems="start" gap="md">
                                                    <TokenInfoBox
                                                        membershipType={membershipType}
                                                        hasError={Boolean(
                                                            _form.formState.errors[
                                                                'tokensGatingMembership'
                                                            ],
                                                        )}
                                                        tokensGatingMembership={
                                                            tokensGatingMembership
                                                        }
                                                        onInfoBoxClick={onInfoBoxClick}
                                                    />

                                                    <InformationBox
                                                        title="Cost"
                                                        border={
                                                            _form.formState.errors['membershipCost']
                                                                ? 'negative'
                                                                : 'none'
                                                        }
                                                        centerContent={
                                                            <Box paddingX width="100%">
                                                                <Paragraph
                                                                    truncate
                                                                    textAlign="center"
                                                                >
                                                                    {costInfoBoxText()}
                                                                </Paragraph>
                                                            </Box>
                                                        }
                                                        subtitle={
                                                            membershipPricingType === 'dynamic'
                                                                ? 'First 100'
                                                                : ''
                                                        }
                                                        onClick={onInfoBoxClick}
                                                    />

                                                    <InformationBox
                                                        title="Max"
                                                        border={
                                                            _form.formState.errors[
                                                                'membershipLimit'
                                                            ]
                                                                ? 'negative'
                                                                : 'none'
                                                        }
                                                        centerContent={
                                                            <Box paddingX width="100%">
                                                                <Paragraph
                                                                    truncate
                                                                    textAlign="center"
                                                                >
                                                                    {_form.formState.errors[
                                                                        'membershipLimit'
                                                                    ]
                                                                        ? '-- '
                                                                        : limit}
                                                                </Paragraph>
                                                            </Box>
                                                        }
                                                        subtitle="Memberships"
                                                        onClick={onInfoBoxClick}
                                                    />

                                                    <InformationBox
                                                        title="Founder"
                                                        centerContent={
                                                            <Avatar
                                                                size="avatar_sm"
                                                                userId={loggedInWalletAddress}
                                                            />
                                                        }
                                                        subtitle={shortAddress(
                                                            abstractAccountAddress ?? '',
                                                        )}
                                                    />

                                                    <InformationBox
                                                        // key="c"
                                                        title="Valid For"
                                                        centerContent={1}
                                                        subtitle="Year"
                                                    />
                                                </Box>

                                                {/* bio */}
                                                <Box
                                                    background="lightHover"
                                                    rounded="sm"
                                                    paddingY="md"
                                                >
                                                    <AutoGrowTextArea
                                                        text={spaceBioValue ?? undefined}
                                                        fontSize="lg"
                                                        placeholder="Add town description"
                                                        tone="none"
                                                        maxLength={400}
                                                        minHeight="x20"
                                                        counterOffset={{
                                                            bottom: 'none',
                                                        }}
                                                        {..._form.register('spaceBio')}
                                                    />
                                                </Box>
                                            </Stack>
                                        </Stack>

                                        {/* right col */}

                                        <MotionStack
                                            paddingTop="sm"
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
                                width="500"
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
            {transactionDetails.isTransacting ? <LazyCreateSpaceMintAnimation /> : <></>}
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

export const TokenInfoBox = ({
    membershipType,
    tokensGatingMembership,
    onInfoBoxClick,
    hasError,
}: {
    membershipType: 'tokenHolders' | 'everyone'
    tokensGatingMembership: { address: string; chainId: number }[]
    onInfoBoxClick: () => void
    hasError?: boolean
}) => {
    return (
        <InformationBox
            // key="c"
            title="For"
            centerContent={
                <>
                    {membershipType === 'tokenHolders' ? (
                        tokensGatingMembership.length === 0 ? (
                            <Box>
                                <TokenImage imgSrc={undefined} width="x4" />
                            </Box>
                        ) : (
                            <Box position="relative" width="x3" aspectRatio="1/1">
                                {tokensGatingMembership.map((token, index) => (
                                    <Box
                                        key={token.address + token.chainId}
                                        position="absolute"
                                        top="none"
                                        style={{
                                            zIndex: 100 - index,
                                            transform: `translateX(${
                                                -(tokensGatingMembership.length * 5) / 2
                                            }px)`,
                                            left: index ? `${index * 10}px` : 0,
                                        }}
                                    >
                                        <SelectedToken
                                            contractAddress={token.address}
                                            chainId={token.chainId}
                                        />
                                    </Box>
                                ))}
                            </Box>
                        )
                    ) : (
                        <Icon type="people" size="square_md" />
                    )}
                </>
            }
            subtitle={membershipType === 'tokenHolders' ? 'Token holders' : 'Anyone'}
            onClick={onInfoBoxClick}
        />
    )
}

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
            <Box background="lightHover" rounded="sm">
                <AutoGrowTextArea
                    text={spaceNameValue}
                    style={{
                        fontFamily: 'TitleFont',
                    }}
                    maxLength={32}
                    fontSize="h2"
                    paddingY="md"
                    placeholder="Town name"
                    tone="none"
                    autoComplete="one-time-code"
                    rounded="sm"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault()
                        }
                    }}
                    {...form.register('spaceName')}
                />
            </Box>
        </>
    )
}

function SelectedToken({ contractAddress, chainId }: { contractAddress: string; chainId: number }) {
    const { data: tokenDataWithChainId } = useTokenMetadataForChainId(contractAddress, chainId)

    return <TokenImage imgSrc={tokenDataWithChainId?.data.imgSrc} width="x3" />
}
