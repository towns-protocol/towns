import { AnimatePresence } from 'framer-motion'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { useEvent } from 'react-use-event-hook'
import { CreateSpaceFlowStatus } from 'use-towns-client'
import { usePlatformMinMembershipPriceInEth } from 'hooks/usePlatformMinMembershipPriceInEth'
import { Box, BoxProps, FormRender, SizeBox } from '@ui'
import { FadeInBox } from '@components/Transitions'
import { env } from 'utils'
import { Dots } from './components/Dots'
import { MobileNavigationHeader } from './components/MobileNavigationHeader'
import { useSlides } from './hooks/useSlides'
import { usePaginationScroll } from './hooks/useSlidesScroll'
import { createTownDefaultValues } from './createTown.const'
import { useRefinedCreateTownShema } from './createTown.schema'
import { CreateTownFormSchema } from './types'
import { SubmitButton } from './components/SubmitButton'
import { TownCreationProgressSlide } from './components/TownCreationProgressSlide'
import { useSubmit } from './hooks/useSubmit'
import { FormDebug } from './components/FormDebug'
import { useSlideAnalytics } from './hooks/useSlideAnalytics'

const scrollStyle: React.CSSProperties = {
    scrollSnapType: 'y mandatory',
    scrollBehavior: 'smooth',
    WebkitOverflowScrolling: 'touch',
}

export const CreateTown = () => {
    return <CreateTownFormRender>{(form) => <CreateTownForm form={form} />}</CreateTownFormRender>
}

export const CreateTownFormRender = (props: {
    children: (form: UseFormReturn<CreateTownFormSchema>) => JSX.Element
}) => {
    const { data: minimumMmebershipPrice } = usePlatformMinMembershipPriceInEth()
    const dynamicRefine = useRefinedCreateTownShema({ minMembershipCost: minimumMmebershipPrice })
    return (
        <FormRender
            horizontal
            id="CreateTownForm"
            schema={dynamicRefine}
            defaultValues={createTownDefaultValues as CreateTownFormSchema}
            mode="all"
        >
            {props.children}
        </FormRender>
    )
}

export const CreateTownForm = (props: { form: UseFormReturn<CreateTownFormSchema> }) => {
    const { form } = props

    const [createFlowStatus, setCreateFlowStatus] = useState<CreateSpaceFlowStatus>()

    const { onSubmit, isSubmitting, error } = useSubmit({
        form,
        onCreateSpaceFlowStatus: useEvent((status: CreateSpaceFlowStatus) => {
            setCreateFlowStatus(status)
        }),
    })

    // Set gatingType based on clientCanJoin
    // TODO: may remove this logic and use gatingType directly

    const { setValue } = form
    const clientCanJoin = form.watch('clientCanJoin')

    useEffect(() => {
        if (clientCanJoin === 'gated') {
            setValue('gatingType', 'gated')
        }
        if (clientCanJoin === 'anyone') {
            setValue('gatingType', 'everyone')
        }
    }, [clientCanJoin, setValue])

    const slides = useSlides(form, isSubmitting)

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // Pagination

    const { scrollRef, slideIndex, nextSlide, scrollToSlide } = usePaginationScroll({
        numSlides: slides.length,
    })

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // Analytics

    const slideNames = useMemo(() => slides.map((Slide) => Slide.name), [slides])

    useSlideAnalytics({ slideIndex, numSlides: slides.length, slideNames, form })

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // Trigger form validation for each new slide structure

    const hasTriggeredRef = useRef<string>()

    useEffect(() => {
        const slideStructure = slideNames.join()
        if (hasTriggeredRef.current === slideStructure) {
            return
        }
        hasTriggeredRef.current = slideStructure
        form.trigger()
    }, [form, slideNames])

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // Progress overlay

    const [isProgressOverlayVisible, setIsProgressOverlayVisible] = useState(false)

    useEffect(() => {
        if (isSubmitting) {
            nextSlide?.()
            setIsProgressOverlayVisible(true)
        }
        if (error) {
            setIsProgressOverlayVisible(false)
        }
    }, [isSubmitting, error, nextSlide])

    // if submitting, the last slide is empty and for animation purposes we
    // don't want to count it
    const numSlides = slides.length - (isSubmitting ? 1 : 0)

    return (
        <>
            <MobileNavigationHeader />
            <Box absoluteFill centerContent>
                <SlidesContainer ref={scrollRef} style={scrollStyle}>
                    {slides.map((Slide, index) => {
                        const isLastSlide = numSlides === index + 1
                        return (
                            <Slide
                                key={Slide.name}
                                form={form}
                                slideIndex={index}
                                numSlides={numSlides}
                                isCurrentSlide={index === slideIndex}
                                renderAfter={
                                    isLastSlide ? (
                                        <SubmitButton
                                            form={form}
                                            isSubmitting={isSubmitting}
                                            error={error}
                                            onSubmit={onSubmit}
                                        />
                                    ) : undefined
                                }
                                onNextSlide={nextSlide}
                            />
                        )
                    })}
                    <Box minHeight="100" />
                </SlidesContainer>
            </Box>
            <AnimatePresence>
                {isProgressOverlayVisible && (
                    <FadeInBox
                        absoluteFill
                        centerContent
                        delay={0.75}
                        preset="fadeup"
                        key="progress"
                    >
                        <SlidesContainer ref={scrollRef} style={scrollStyle}>
                            <TownCreationProgressSlide isTransacting status={createFlowStatus} />
                        </SlidesContainer>
                    </FadeInBox>
                )}
                {!isProgressOverlayVisible && (
                    <Dots
                        key="dots"
                        position="topRight"
                        zIndex="above"
                        height="100%"
                        slideIndex={slideIndex}
                        slidesLength={slides.length}
                        getDotActive={(slideIndex) => slideIndex < slides.length}
                        onSelectDot={(slideIndex) => {
                            scrollToSlide(slideIndex)
                        }}
                    />
                )}
            </AnimatePresence>
            {env.DEV && <FormDebug form={form} data={{ slideIndex }} />}
        </>
    )
}

const SlidesContainer = React.forwardRef<HTMLDivElement, BoxProps>((props, ref) => (
    <SizeBox
        position="relative"
        width="100%"
        height="100%"
        minWidth={{ desktop: '800', mobile: '100%' }}
        maxWidth="1400"
        overflow="scroll"
        {...props}
        ref={ref}
    />
))
