import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FormProvider, UseFormReturn, useFormContext } from 'react-hook-form'
import { ethers } from 'ethers'

import { useNavigate } from 'react-router'
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
import { UploadImageRequestConfig } from 'api/lib/uploadImage'
import { InteractiveTownsToken } from '@components/TownsToken/InteractiveTownsToken'
import { useAuth } from 'hooks/useAuth'
import { shortAddress } from 'ui/utils/utils'
import { FadeInBox } from '@components/Transitions'
import { TEMPORARY_SPACE_ICON_URL } from '@components/Web3/constants'
import { AutoGrowTextArea } from 'ui/components/TextArea/AutoGrowTextArea'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { Avatar } from '@components/Avatar/Avatar'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { isTouch } from 'hooks/useDevice'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { ErrorReportForm } from '@components/ErrorReport/ErrorReport'
import { InformationBox } from '@components/TownPageLayout/InformationBox'
import { TokenInfoBox } from '@components/TownPageLayout/TokenInfoBox'
import { CreateSpaceFormV2SchemaType, schema } from './CreateSpaceFormV2.schema'
import { AvatarPlaceholder } from '../AvatarPlaceholder'
import { PanelType, TransactionDetails } from './types'
import { PanelContent } from './PanelContents'
import { CreateTownSubmit } from './CreateTownSubmit'
import { BottomBarWithColWidths } from '../BottomBar'

const LazyCreateSpaceMintAnimation = React.lazy(() => import('./CreateSpaceMintAnimation'))

type Member = { address: ReturnType<typeof useAuth>['loggedInWalletAddress']; displayName?: string }

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

export function CreateSpaceFormV2() {
    const { loggedInWalletAddress } = useAuth()
    const hasReached2Chars = useRef(false)
    const navigate = useNavigate()

    const [transactionDetails, setTransactionDetails] = useState<TransactionDetails>({
        isTransacting: false,
        townAddress: undefined,
    })
    const [isShowingBugReport, setIsShowingBugReport] = useState(false)
    const showBugReport = () => setIsShowingBugReport(true)
    const hideBugReport = () => setIsShowingBugReport(false)

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
            spaceMotto: null,
            spaceBio: null,
            // TODO: currency defaults to ETH when addressZero
            membershipCurrency: ethers.constants.AddressZero,
        }

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
                    paddingTop="safeAreaInsetTop"
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

                    <Stack>
                        <IconButton
                            icon="bug"
                            background="level2"
                            color="gray2"
                            disabled={transactionDetails.isTransacting}
                            onClick={showBugReport}
                        />
                    </Stack>

                    {isShowingBugReport && (
                        <ModalContainer onHide={hideBugReport}>
                            <ErrorReportForm onHide={hideBugReport} />
                        </ModalContainer>
                    )}
                </Stack>
            )}
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
                        spaceMottoValue,
                        spaceBioValue,
                        membershipPricingType,
                        spaceIconUrl,
                    ] = _form.watch([
                        'spaceName',
                        'membershipCost',
                        'membershipLimit',
                        'tokensGatingMembership',
                        'membershipType',
                        'spaceMotto',
                        'spaceBio',
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

                    const isEveryoneMembership = membershipType === 'everyone'

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
                                            <Stack
                                                grow
                                                position="relative"
                                                zIndex="above"
                                                ref={leftColRef}
                                            >
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
                                                    >
                                                        <TokenInfoBox
                                                            tokensGatingMembership={
                                                                tokensGatingMembership
                                                            }
                                                            hasError={Boolean(
                                                                _form.formState.errors[
                                                                    'tokensGatingMembership'
                                                                ],
                                                            )}
                                                            title="For"
                                                            subtitle={
                                                                isEveryoneMembership
                                                                    ? 'Anyone'
                                                                    : 'Holders'
                                                            }
                                                            anyoneCanJoin={isEveryoneMembership}
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
                                                                            : formattedLimit}
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
                                                            title="Valid For"
                                                            centerContent={1}
                                                            subtitle="Year"
                                                        />
                                                    </MotionBox>

                                                    {/* motto */}
                                                    <Box
                                                        background="lightHover"
                                                        rounded="sm"
                                                        paddingY="md"
                                                    >
                                                        <AutoGrowTextArea
                                                            text={spaceMottoValue ?? undefined}
                                                            fontSize="lg"
                                                            placeholder="Add town motto"
                                                            tone="none"
                                                            maxLength={32}
                                                            counterOffset={{
                                                                bottom: 'none',
                                                            }}
                                                            {..._form.register('spaceMotto')}
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
                                                >
                                                    {({ onSubmit, disabled }) => (
                                                        <>
                                                            {
                                                                <SubmitButton
                                                                    disabled={disabled}
                                                                    transactionDetails={
                                                                        transactionDetails
                                                                    }
                                                                    onSubmit={onSubmit}
                                                                />
                                                            }
                                                        </>
                                                    )}
                                                </CreateTownSubmit>
                                            </Stack>
                                        ) : (
                                            <Stack width="100%">
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
                                    <PanelContent onClick={() => setPanelType(undefined)}>
                                        <Stack height="x16">
                                            <CreateTownSubmit
                                                setPanelType={setPanelType}
                                                form={_form}
                                                setTransactionDetails={setTransactionDetails}
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
            {transactionDetails.isTransacting ? (
                <Suspense fallback={<></>}>
                    <LazyCreateSpaceMintAnimation />
                </Suspense>
            ) : (
                <></>
            )}
            <UserOpTxModal />
        </Stack>
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
        <Button disabled={disabled} tone={disabled ? 'level3' : 'cta1'} onClick={onSubmit}>
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
                    clearErrors={clearErrors}
                    overrideUploadCb={onUpload}
                    uploadIconSize="square_md"
                    uploadIconPosition={imageSrc ? 'topRight' : 'absoluteCenter'}
                    size={size ?? 'tabletToDesktop'}
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
