import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FormProvider, UseFormReturn, useFormContext } from 'react-hook-form'
import { ethers } from 'ethers'

import { useNavigate } from 'react-router'
import { useConnectivity } from 'use-towns-client'
import { CreateSpaceFlowStatus } from 'use-towns-client/dist/client/TownsClientTypes'
import { AnimatePresence } from 'framer-motion'
import { PrivyWrapper } from 'privy/PrivyProvider'
import { UserOpTxModal } from '@components/Web3/UserOpTxModal/UserOpTxModal'
import {
    Box,
    Button,
    ErrorMessage,
    FormRender,
    Grid,
    IconButton,
    MotionBox,
    MotionStack,
    Paragraph,
    Stack,
    Text,
    TextField,
} from '@ui'
import { BlurredBackground } from '@components/TouchLayoutHeader/BlurredBackground'
import {
    LargeUploadImageTemplate,
    UploadImageTemplateSize,
} from '@components/UploadImage/LargeUploadImageTemplate'
import { useImageStore } from '@components/UploadImage/useImageStore'
import { InteractiveTownsToken } from '@components/TownsToken/InteractiveTownsToken'
import { shortAddress } from 'ui/utils/utils'
import { FadeInBox } from '@components/Transitions'
import { TEMPORARY_SPACE_ICON_URL } from '@components/Web3/constants'
import { AutoGrowTextArea } from 'ui/components/TextArea/AutoGrowTextArea'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { Avatar } from '@components/Avatar/Avatar'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { isTouch } from 'hooks/useDevice'
import { InformationBox } from '@components/TownPageLayout/InformationBox'
import { TokenInfoBox } from '@components/TownPageLayout/TokenInfoBox'
import { CreateSpaceAnimation } from '@components/SetupAnimation/CreateSpaceAnimation'
import { SECOND_MS } from 'data/constants'
import { AppBugReportButton } from '@components/AppBugReport/AppBugReportButton'
import { UploadImageRequestConfig } from '@components/UploadImage/useOnImageChangeEvent'
import { CreateSpaceFormV2SchemaType, schema } from './CreateSpaceFormV2.schema'
import { AvatarPlaceholder } from '../AvatarPlaceholder'
import { PanelType, TransactionDetails } from './types'
import { PanelContent } from './PanelContents'
import { CreateTownSubmit } from './CreateTownSubmit'
import { BottomBarWithColWidths } from '../BottomBar'

type Member = {
    address: ReturnType<typeof useConnectivity>['loggedInWalletAddress']
    displayName?: string
}

function useColumnWidths({
    leftColRef,
    rightColRef,
}: {
    leftColRef: React.RefObject<HTMLDivElement>
    rightColRef: React.RefObject<HTMLDivElement>
}) {
    const [widths, setWidths] = useState<[number, number]>([0, 0])

    useEffect(() => {
        const _set = () => {
            const leftColWidth = leftColRef.current?.offsetWidth ?? 0
            const rightColWidth = rightColRef.current?.offsetWidth ?? 0
            setWidths([leftColWidth, rightColWidth])
        }
        _set()
        window.addEventListener('resize', _set)
        return () => {
            window.removeEventListener('resize', _set)
        }
    }, [leftColRef, rightColRef])

    return widths
}

export const CreateSpaceFormV2 = React.memo(() => {
    return (
        <PrivyWrapper>
            <CreateSpaceFormV2WithoutAuth />
        </PrivyWrapper>
    )
})

function CreateSpaceFormV2WithoutAuth() {
    const { loggedInWalletAddress } = useConnectivity()
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

    const leftColRef = useRef<HTMLDivElement>(null)
    const rightColRef = useRef<HTMLDivElement>(null)
    const [leftColWidth, rightColWidth] = useColumnWidths({ leftColRef, rightColRef })

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
            shortDescription: null,
            longDescription: null,
            // TODO: currency defaults to ETH when addressZero
            membershipCurrency: ethers.constants.AddressZero,
        }

    const [createFlowStatus, setCreateFlowStatus] = useState<CreateSpaceFlowStatus>()

    const onCreateSpaceFlowStatus = useCallback((status: CreateSpaceFlowStatus) => {
        console.log('[createSpace] onCreateSpaceFlowStatus', status)
        setCreateFlowStatus(status)
    }, [])

    return (
        <Stack horizontal>
            {isTouch() && (
                <Stack
                    horizontal
                    padding
                    position="relative"
                    zIndex="above"
                    alignItems="center"
                    justifyContent="spaceBetween"
                    width="100%"
                    paddingTop={{
                        standalone: 'safeAreaInsetTop',
                        default: 'md',
                    }}
                >
                    <Stack>
                        <IconButton
                            background="level2"
                            icon="back"
                            color="default"
                            disabled={transactionDetails.isTransacting}
                            onClick={() => navigate('/')}
                        />
                    </Stack>
                    <AppBugReportButton />
                </Stack>
            )}
            <FormRender
                absoluteFillSafeSafari
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
                        shortDescriptionValue,
                        longDescriptionValue,
                        membershipPricingType,
                        spaceIconUrl,
                    ] = _form.watch([
                        'spaceName',
                        'membershipCost',
                        'membershipLimit',
                        'tokensGatingMembership',
                        'membershipType',
                        'shortDescription',
                        'longDescription',
                        'membershipPricingType',
                        'spaceIconUrl',
                    ])

                    const formattedLimit = new Intl.NumberFormat().format(limit)

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
                    const _isTouch = isTouch()

                    const costInfoBoxText = () => {
                        {
                            _form.formState.errors['membershipCost']
                                ? '--'
                                : +price === 0
                                ? 'Free'
                                : price
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
                        return price
                    }

                    const isEveryoneMembership = membershipType === 'everyone'
                    const isTokenFieldTouched = _form.formState.touchedFields.tokensGatingMembership

                    return (
                        <FormProvider {..._form}>
                            <Stack centerContent grow width="100%" padding="xs">
                                <Stack
                                    centerContent
                                    grow
                                    width="100%"
                                    background={isTouch() ? 'none' : 'readability'}
                                    rounded="xs"
                                    position="relative"
                                    overflow="auto"
                                >
                                    {spaceIconUrl && (
                                        <MotionBox
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ duration: 0.5 }}
                                            position="absolute"
                                            top="none"
                                            left="none"
                                            bottom="none"
                                            right="none"
                                            pointerEvents="none"
                                        >
                                            <BlurredBackground imageSrc={spaceIconUrl} blur={40} />
                                        </MotionBox>
                                    )}

                                    {/* columns */}
                                    <Stack
                                        grow
                                        centerContent
                                        scrollbars
                                        position="relative"
                                        alignItems="center"
                                        paddingX="lg"
                                        width={{
                                            tablet: '100%',
                                        }}
                                        overflow="auto"
                                    >
                                        <Stack
                                            gap={{
                                                tablet: 'x4',
                                                desktop: 'x20',
                                            }}
                                            flexDirection={{
                                                tablet: 'columnReverse',
                                                desktop: 'row',
                                            }}
                                            width="100%"
                                        >
                                            {/* left col */}
                                            <Stack grow position="relative" ref={leftColRef}>
                                                <Stack gap="x4">
                                                    {/* image when panel open */}
                                                    {!_isTouch && panelType && (
                                                        <Stack display="block">
                                                            <UploadImageField
                                                                size="sm"
                                                                isActive={!!panelType}
                                                                transactionDetails={
                                                                    transactionDetails
                                                                }
                                                            />
                                                        </Stack>
                                                    )}

                                                    <Stack gap="sm">
                                                        <SpaceNameField
                                                            form={_form}
                                                            spaceNameValue={spaceNameValue}
                                                        />
                                                        {_form.formState.errors['spaceName'] &&
                                                            showSpaceNameError() && (
                                                                <FadeInBox key="spaceNameError">
                                                                    <ErrorMessage
                                                                        errors={
                                                                            _form.formState.errors
                                                                        }
                                                                        fieldName="spaceName"
                                                                    />
                                                                </FadeInBox>
                                                            )}
                                                    </Stack>

                                                    {/* info boxes */}
                                                    <MotionBox
                                                        horizontal
                                                        scrollbars
                                                        layoutScroll
                                                        alignItems="start"
                                                        gap="sm"
                                                        overflow="auto"
                                                        zIndex="layer"
                                                    >
                                                        <TokenInfoBox
                                                            tokensGatingMembership={
                                                                tokensGatingMembership
                                                            }
                                                            hasError={
                                                                Boolean(
                                                                    _form.formState.errors[
                                                                        'tokensGatingMembership'
                                                                    ],
                                                                ) && !!isTokenFieldTouched
                                                            }
                                                            title="For"
                                                            subtitle={
                                                                isEveryoneMembership
                                                                    ? 'Anyone'
                                                                    : 'Holders'
                                                            }
                                                            anyoneCanJoin={isEveryoneMembership}
                                                            dataTestId="membership-token-type"
                                                            onInfoBoxClick={onInfoBoxClick}
                                                        />

                                                        <InformationBox
                                                            title="Cost"
                                                            border={
                                                                _form.formState.errors[
                                                                    'membershipCost'
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
                                                                        {costInfoBoxText()}
                                                                    </Paragraph>
                                                                </Box>
                                                            }
                                                            subtitle={
                                                                membershipPricingType === 'dynamic'
                                                                    ? 'First 100'
                                                                    : 'ETH'
                                                            }
                                                            dataTestId="membership-cost-type"
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
                                                                            : formattedLimit}
                                                                    </Paragraph>
                                                                </Box>
                                                            }
                                                            subtitle="Memberships"
                                                            dataTestId="membership-limit"
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
                                                            dataTestId="town-founder"
                                                        />

                                                        <InformationBox
                                                            title="Valid For"
                                                            centerContent={1}
                                                            subtitle="Year"
                                                            dataTestId="town-valid-for"
                                                        />
                                                    </MotionBox>

                                                    {/* motto */}
                                                    <Box
                                                        background="lightHover"
                                                        rounded="sm"
                                                        paddingY="md"
                                                    >
                                                        <AutoGrowTextArea
                                                            text={
                                                                shortDescriptionValue ?? undefined
                                                            }
                                                            fontSize="lg"
                                                            placeholder="Add town motto"
                                                            tone="none"
                                                            maxLength={32}
                                                            counterOffset={{
                                                                bottom: 'none',
                                                            }}
                                                            data-testid="town-motto-textarea"
                                                            {..._form.register('shortDescription')}
                                                        />
                                                    </Box>
                                                    {/* bio */}
                                                    <Box
                                                        background="lightHover"
                                                        rounded="sm"
                                                        paddingY="md"
                                                    >
                                                        <AutoGrowTextArea
                                                            text={longDescriptionValue ?? undefined}
                                                            fontSize="lg"
                                                            placeholder="Add town description"
                                                            tone="none"
                                                            maxLength={400}
                                                            minHeight="x20"
                                                            counterOffset={{
                                                                bottom: 'none',
                                                            }}
                                                            data-testid="town-description-textarea"
                                                            {..._form.register('longDescription')}
                                                        />
                                                    </Box>
                                                </Stack>
                                            </Stack>

                                            {/* right col */}
                                            <MotionStack
                                                centerContent={_isTouch}
                                                paddingTop="sm"
                                                opacity={
                                                    _isTouch
                                                        ? 'opaque'
                                                        : panelType === undefined
                                                        ? 'opaque'
                                                        : 'transparent'
                                                }
                                                ref={rightColRef}
                                            >
                                                {/* mimics the top bar to push down relative content */}
                                                <Box
                                                    paddingBottom="md"
                                                    paddingTop={{
                                                        standalone: 'safeAreaInsetTop',
                                                        default: 'none',
                                                    }}
                                                    display={{ touch: 'flex', default: 'none' }}
                                                >
                                                    <Box height="height_md" />
                                                </Box>
                                                <Stack display="block">
                                                    <UploadImageField
                                                        isActive={
                                                            _isTouch || panelType === undefined
                                                        }
                                                        transactionDetails={transactionDetails}
                                                    />
                                                </Stack>
                                            </MotionStack>
                                        </Stack>
                                    </Stack>

                                    {/* Bottom bar */}
                                    <>
                                        {_isTouch ? (
                                            <Stack padding width="100%">
                                                <CreateTownSubmit
                                                    setPanelType={setPanelType}
                                                    form={_form}
                                                    setTransactionDetails={setTransactionDetails}
                                                    onCreateSpaceFlowStatus={
                                                        onCreateSpaceFlowStatus
                                                    }
                                                >
                                                    {({ onSubmit, disabled }) => (
                                                        <SubmitButton
                                                            disabled={disabled}
                                                            transactionDetails={transactionDetails}
                                                            onSubmit={onSubmit}
                                                        />
                                                    )}
                                                </CreateTownSubmit>
                                            </Stack>
                                        ) : (
                                            <Stack
                                                width="100%"
                                                borderTop="default"
                                                background="backdropBlur"
                                            >
                                                <BottomBarWithColWidths
                                                    gap="x20"
                                                    leftColWidth={leftColWidth}
                                                    rightColWidth={rightColWidth}
                                                    leftColContent={
                                                        _isTouch ? (
                                                            <></>
                                                        ) : (
                                                            <Stack gap="sm">
                                                                <Stack
                                                                    horizontal
                                                                    width="100%"
                                                                    justifyContent="spaceBetween"
                                                                >
                                                                    <Text
                                                                        fontWeight="strong"
                                                                        color="default"
                                                                    >
                                                                        Memberships
                                                                    </Text>
                                                                    <Text color="gray2">
                                                                        {formattedLimit}
                                                                    </Text>
                                                                </Stack>

                                                                <Box
                                                                    height="x1"
                                                                    background="cta1"
                                                                    rounded="full"
                                                                    width="100%"
                                                                />
                                                            </Stack>
                                                        )
                                                    }
                                                    rightColContent={
                                                        <CreateTownSubmit
                                                            setPanelType={setPanelType}
                                                            form={_form}
                                                            setTransactionDetails={
                                                                setTransactionDetails
                                                            }
                                                            onCreateSpaceFlowStatus={
                                                                onCreateSpaceFlowStatus
                                                            }
                                                        >
                                                            {({ onSubmit, disabled }) => (
                                                                <>
                                                                    {!panelType && (
                                                                        <SubmitButton
                                                                            disabled={disabled}
                                                                            transactionDetails={
                                                                                transactionDetails
                                                                            }
                                                                            onSubmit={onSubmit}
                                                                        />
                                                                    )}
                                                                </>
                                                            )}
                                                        </CreateTownSubmit>
                                                    }
                                                />
                                            </Stack>
                                        )}
                                    </>
                                </Stack>
                            </Stack>

                            {/* Panel */}
                            {panelType && (
                                <PanelWrapper panelType={panelType}>
                                    <PanelContent onClosed={() => setPanelType(undefined)}>
                                        <Stack height="x16">
                                            <CreateTownSubmit
                                                setPanelType={setPanelType}
                                                form={_form}
                                                setTransactionDetails={setTransactionDetails}
                                                onCreateSpaceFlowStatus={onCreateSpaceFlowStatus}
                                            >
                                                {({ onSubmit, disabled }) => (
                                                    <SubmitButton
                                                        disabled={disabled}
                                                        transactionDetails={transactionDetails}
                                                        onSubmit={onSubmit}
                                                    />
                                                )}
                                            </CreateTownSubmit>
                                        </Stack>
                                    </PanelContent>
                                </PanelWrapper>
                            )}
                        </FormProvider>
                    )
                }}
            </FormRender>
            <ProgressOverlay
                isTransacting={transactionDetails.isTransacting}
                status={createFlowStatus}
            />

            <UserOpTxModal />
        </Stack>
    )
}

const ProgressOverlay = (props: { status?: CreateSpaceFlowStatus; isTransacting: boolean }) => {
    const { isTransacting, status } = props

    const [showOverlay, setShowOverlay] = useState(() => isTransacting)

    useEffect(() => {
        if (!isTransacting) {
            const timeout = setTimeout(() => {
                setShowOverlay(false)
            }, SECOND_MS * 0.5)
            return () => {
                clearTimeout(timeout)
            }
        } else {
            setShowOverlay(true)
        }
    }, [isTransacting])

    useEffect(() => {
        console.log('[createFlowStatus]', isTransacting, status)
    }, [isTransacting, status])

    const steps = useMemo(
        () => ['Creating town onchain', 'Initializing River streams', 'Setting up your town'],
        [],
    )
    const step = useMemo(() => {
        switch (status) {
            default:
            case CreateSpaceFlowStatus.MintingSpace:
                return 0
            case CreateSpaceFlowStatus.CreatingSpace:
                return 1
            case CreateSpaceFlowStatus.CreatingChannel:
            case CreateSpaceFlowStatus.CreatingUser:
                return 2
        }
    }, [status])

    return (
        <AnimatePresence>
            {showOverlay ? (
                <FadeInBox
                    centerContent
                    padding
                    position="absoluteFill"
                    background="backdropBlur"
                    key="overlay"
                >
                    <CreateSpaceAnimation steps={steps} step={step} />
                </FadeInBox>
            ) : null}
        </AnimatePresence>
    )
}

const SubmitButton = ({
    onSubmit,
    disabled,
    transactionDetails,
}: {
    onSubmit: () => void
    disabled: boolean
    transactionDetails: TransactionDetails
}) => {
    return (
        <Button
            disabled={disabled}
            tone={disabled ? 'level3' : 'cta1'}
            data-testid="create-town-button"
            onClick={onSubmit}
        >
            {transactionDetails.isTransacting && <ButtonSpinner />}
            {transactionDetails.isTransacting ? 'Creating your town...' : 'Create Town'}
        </Button>
    )
}

const PanelWrapper = ({
    panelType,
    children,
}: {
    panelType: PanelType
    children: React.ReactNode
}) => {
    const touch = isTouch()

    if (touch) {
        return children
    }

    return (
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
        >
            {children}
        </MotionStack>
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

export const UploadImageField = ({
    isActive,
    transactionDetails,
    size,
}: {
    isActive: boolean
    transactionDetails: TransactionDetails
    size?: UploadImageTemplateSize
}) => {
    const { register, formState, setError, clearErrors, setValue, watch } =
        useFormContext<CreateSpaceFormV2SchemaType>()

    const rawImageSrc = watch('spaceIconUrl')
    const spaceName = watch('spaceName')
    // b/c it's a FileList before upload
    const imageSrc = typeof rawImageSrc === 'string' ? rawImageSrc : undefined
    const _isTouch = isTouch()

    const onUpload = useCallback(
        ({ imageUrl, file, id, type }: UploadImageRequestConfig) => {
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

    const avoidScrollbarsStyle = useMemo(() => ({ contain: 'layout' }), [])

    return (
        <Box display="inline-block" style={avoidScrollbarsStyle}>
            {isActive ? (
                <LargeUploadImageTemplate<CreateSpaceFormV2SchemaType>
                    canEdit={!transactionDetails.isTransacting}
                    type="spaceIcon"
                    formFieldName="spaceIconUrl"
                    resourceId={TEMPORARY_SPACE_ICON_URL}
                    setError={setError}
                    register={register}
                    formState={formState}
                    imageRestrictions={{
                        // no limits on dimensions for spaces
                        minDimension: {
                            message: '',
                            min: 0,
                        },
                    }}
                    clearErrors={clearErrors}
                    uploadIconSize="square_md"
                    uploadIconPosition={imageSrc ? 'topRight' : 'absoluteCenter'}
                    size={size ?? 'tabletToDesktop'}
                    onUploadImage={onUpload}
                >
                    <InteractiveTownsToken
                        mintMode
                        size={size ? 'sm' : _isTouch ? 'md' : 'xl'}
                        spaceName={spaceName}
                        address={transactionDetails.townAddress}
                        imageSrc={imageSrc ?? undefined}
                    />
                </LargeUploadImageTemplate>
            ) : (
                <InteractiveTownsToken
                    mintMode
                    size={_isTouch ? 'md' : 'xl'}
                    spaceName={spaceName}
                    address={transactionDetails.townAddress}
                    imageSrc={imageSrc ?? undefined}
                />
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
            <Box background="lightHover" rounded="sm">
                <TextField
                    paddingY="sm"
                    value={spaceNameValue}
                    maxLength={32}
                    fontSize="h2"
                    fontWeight="strong"
                    placeholder="Town name"
                    tone="none"
                    autoComplete="one-time-code"
                    rounded="sm"
                    data-testid="town-name-input"
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
