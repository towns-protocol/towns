import { UseFormReturn } from 'react-hook-form'
import { useMemo } from 'react'
import * as Slides from '../CreateTown.Slides'
import { CreateTownFormSchema } from '../types'

export const useSlides = (form: UseFormReturn<CreateTownFormSchema>, isLoading: boolean) => {
    const [clientTownType, clientMembershipFee, clientCanJoin, clientGateBy] = form.watch([
        'clientTownType',
        'slideMembership',
        'clientCanJoin',
        'clientGateBy',
    ])

    const slides = useMemo(() => {
        const { errors } = form.formState
        const slides = [Slides.TownName]

        if (errors.slideNameAndIcon) {
            return slides
        }

        slides.push(Slides.TownType)

        if (!clientTownType) {
            return slides
        }
        if (clientTownType === 'paid') {
            slides.push(Slides.MembershipFees)
            if (errors.slideMembership) {
                return slides
            }
        }

        slides.push(Slides.WhoCanJoin)

        if (clientMembershipFee) {
            if (errors.clientCanJoin) {
                return slides
            }
        }

        if (clientCanJoin === 'gated') {
            slides.push(Slides.GateBy)

            if (clientGateBy === 'digitalAssets') {
                slides.push(Slides.GateByDigitalAssets)
            }

            if (clientGateBy === 'walletAddress') {
                slides.push(Slides.GateByWalletAddress)
            }
        }

        if (isLoading) {
            slides.push(Slides.CreateTownAnimation)
        }

        return slides
    }, [
        form.formState,
        clientTownType,
        clientMembershipFee,
        clientCanJoin,
        isLoading,
        clientGateBy,
    ])

    return slides
}
