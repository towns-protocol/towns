import { useEffect, useRef, useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { Analytics } from 'hooks/useAnalytics'
import { CreateTownFormSchema } from '../types'
import * as Slides from '../CreateTown.Slides'

export const useSlideAnalytics = (props: {
    slideIndex: number
    numSlides: number
    slideNames: string[]
    form: UseFormReturn<CreateTownFormSchema>
}) => {
    const { numSlides, slideNames } = props
    const slideIndex = Math.min(props.slideIndex, numSlides - 1)
    const [visitedSlides, setVisitedSlides] = useState<Set<string>>(new Set())
    const valuesRef = useRef(props.form.getValues())
    valuesRef.current = props.form.getValues()

    useEffect(() => {
        const prevSlide = slideNames[slideIndex - 1]
        if (!prevSlide || visitedSlides.has(prevSlide)) {
            return
        }
        setVisitedSlides((prev) => {
            prev.add(prevSlide)
            return prev
        })
        if (prevSlide === Slides.TownName.name) {
            Analytics.getInstance().track('submit name and image')
        } else if (prevSlide === Slides.TownType.name) {
            Analytics.getInstance().track('submit town type', {
                townType: valuesRef.current.clientTownType,
            })
        } else if (prevSlide === Slides.MembershipFees.name) {
            Analytics.getInstance().track('submit paid model', {
                paidModel: valuesRef.current.slideMembership.clientMembershipFee,
            })
        } else if (prevSlide === Slides.WhoCanJoin.name) {
            Analytics.getInstance().track('submit access type', {
                accessType: valuesRef.current.clientCanJoin,
            })
        }
    }, [slideIndex, slideNames, visitedSlides])
}
