import { useCallback } from 'react'
import { Analytics } from 'hooks/useAnalytics'
import { TokenGatedByAnalytics } from './useGatherSpaceDetailsAnalytics'

////////////////////////////////////////////////////
// For a logged out brand new user w/o redirect:
////////////////////////////////////////////////////
//  (Page event) public town page - post oauth redirect false
//  clicked join town on town page
//  privy modal shown
//  privy login success
//  joining town
//  river connected successfully
//  joined town
//  set username

////////////////////////////////////////////////////
// For a logged out brand new user with redirect:
////////////////////////////////////////////////////
//  (Page event) public town page - post oauth redirect false
//  clicked join town on town page
//  privy modal shown
//  (Page event) public town page - post oauth redirect true - should ignore this event
//  privy login success
//  joining town
// <<<< Optional town with price >>>>
//  river connected successfully
//  joined town
//  set username

////////////////////////////////////////////////////
// For an existing user that was logged out w/o redirect
////////////////////////////////////////////////////
//  (Page event) public town page - post oauth redirect false
//  clicked join town on town page
//  privy modal shown
//  privy login success
//  joining town
// <<<< Optional town with price >>>>
//  river connected successfully
//  joined town
//  set username

////////////////////////////////////////////////////
// For an already logged in user
////////////////////////////////////////////////////
//////////// these 2 events might swap in sequence, it shouldn't matter
//  river connected successfully
//  (Page event) public town page - post oauth redirect false - authenticated true
////////////////
//  clicked join town on town page
//  joining town
// <<<< Optional town with price >>>>
//  joined town

////////////////////////////////////////////////////
// Town with price
////////////////////////////////////////////////////
// ... typical flow
// joining town
// join transaction modal
// click copy wallet address
// ... typical flow

////////////////////////////////////////////////////
// Gated town without meeting requirements (logged in user)
////////////////////////////////////////////////////
//  river connected successfully
//  (Page event) public town page - post oauth redirect false
//  clicked join town on town page - meetsMembershipRequirements = false
//  viewed gated town requirements modal
// clicked link wallet on gated town requirements modal
// successfully linked wallet - meetsMembershipRequirements = true
// clicked join town on gated town requirements modal
// joining town
// <<<< Optional town with price >>>>
// joined town

export const useJoinFunnelAnalytics = () => {
    return {
        publicTownPage: useCallback(
            (args: {
                authenticated: boolean
                spaceId: string | undefined
                spaceName: string | undefined
                pricingModel: 'free' | 'paid'
                postOAuthRedirect: boolean
                gatedSpace: boolean
                pricingModule: 'fixed' | 'dynamic' | 'free'
            }) => {
                const {
                    authenticated,
                    spaceId,
                    spaceName,
                    pricingModel,
                    postOAuthRedirect,
                    gatedSpace,
                    pricingModule,
                } = args
                Analytics.getInstance().page('home-page', 'public town page', {
                    authenticated,
                    spaceId,
                    spaceName,
                    pricingModel,
                    // A user may redirect to oauth page, then return to the app and see the public town page again
                    postOAuthRedirect,
                    gatedSpace,
                    pricingModule,
                })
            },
            [],
        ),

        // this event is tracked either when user is logged out and clicks "join" - actually they are logging in, join logic is handled elsewhere afterwards
        // or when user is logged in and clicks "join"
        // we use other events/props to segment funnels based on auth state
        clickedJoinTownOnTownPage: useCallback(
            (args: {
                meetsMembershipRequirements?: boolean
                spaceId: string | undefined
                pricingModule: 'fixed' | 'dynamic' | 'free'
            }) => {
                const { meetsMembershipRequirements, spaceId, pricingModule } = args
                const eventStr = 'clicked join town on town page'
                if (meetsMembershipRequirements !== undefined) {
                    Analytics.getInstance().track(eventStr, {
                        spaceId,
                        meetsMembershipRequirements,
                        pricingModule,
                    })
                } else {
                    Analytics.getInstance().track(eventStr, {
                        spaceId,
                        pricingModule,
                    })
                }
            },
            [],
        ),

        clickedLinkWalletOnGatedTownRequirementsModal: useCallback(
            (args: { spaceId: string | undefined }) => {
                const { spaceId } = args
                Analytics.getInstance().track(
                    'clicked link wallet on gated town requirements modal',
                    {
                        spaceId,
                    },
                )
            },
            [],
        ),

        clickedJoinTownOnGatedTownRequirementsModal: useCallback(
            (args: { spaceId: string | undefined }) => {
                const { spaceId } = args
                Analytics.getInstance().track(
                    'clicked join town on gated town requirements modal',
                    {
                        spaceId,
                    },
                )
            },
            [],
        ),

        joiningTown: useCallback(
            (args: { spaceId: string | undefined; spaceName: string | undefined }) => {
                const { spaceId, spaceName } = args
                Analytics.getInstance().track('joining town', { spaceId, spaceName })
            },
            [],
        ),
        joinedTown: useCallback(
            (args: {
                spaceId: string | undefined
                spaceName: string | undefined
                gatedSpace: boolean | undefined
                pricingModule: 'fixed' | 'dynamic' | 'free'
                priceInWei: string | undefined
                tokensGatedBy: TokenGatedByAnalytics[] | undefined
            }) => {
                Analytics.getInstance().track('joined town', args)
            },
            [],
        ),

        setUsernameWhenJoiningTown: useCallback((args: { spaceId: string | undefined }) => {
            const { spaceId } = args
            Analytics.getInstance().track('set username when joining town', { spaceId })
        }, []),

        privyModalShown: useCallback(() => {
            Analytics.getInstance().track('privy modal shown')
        }, []),

        joinTransactionModalShown: useCallback(
            (args: {
                spaceId: string | undefined
                spaceName: string | undefined
                funds: 'sufficient' | 'insufficient'
            }) => {
                const { spaceId, spaceName, funds } = args
                Analytics.getInstance().track('join transaction modal', {
                    spaceId, // space id
                    spaceName, // ie 'fei's town'
                    funds, // 'sufficient'|'insufficient'
                })
            },
            [],
        ),

        clickCopyWalletAddress: useCallback(
            (args: { spaceId: string | undefined; spaceName: string | undefined }) => {
                const { spaceId, spaceName } = args
                Analytics.getInstance().track('click copy wallet address', {
                    spaceId, // space id
                    spaceName, // ie 'fei's town'
                })
            },
            [],
        ),

        clickedPayWithEth: useCallback(
            (args: {
                spaceName: string | undefined
                spaceId: string | undefined
                gatedSpace: boolean
                pricingModule: 'free' | 'fixed' | 'dynamic'
                priceInWei: string
            }) => {
                const { spaceName, spaceId, gatedSpace, pricingModule, priceInWei } = args
                Analytics.getInstance().track('clicked pay with ETH', {
                    spaceName,
                    spaceId,
                    gatedSpace,
                    pricingModule,
                    priceInWei,
                })
            },
            [],
        ),

        clickedPayWithCard: useCallback(
            (args: {
                spaceName: string | undefined
                spaceId: string | undefined
                gatedSpace: boolean
                pricingModule: 'free' | 'fixed' | 'dynamic'
                priceInWei: string
            }) => {
                const { spaceName, spaceId, gatedSpace, pricingModule, priceInWei } = args
                Analytics.getInstance().track('clicked pay with card', {
                    spaceName,
                    spaceId,
                    gatedSpace,
                    pricingModule,
                    priceInWei,
                })
            },
            [],
        ),

        viewedGatedTownRequirementsModal: useCallback(
            (args: { spaceId: string | undefined; meetsMembershipRequirements: boolean }) => {
                const { spaceId, meetsMembershipRequirements } = args
                // show asset verification modal
                Analytics.getInstance().page(
                    'requirements-modal',
                    'viewed gated town requirements modal',
                    {
                        spaceId,
                        meetsMembershipRequirements,
                    },
                )
            },
            [],
        ),

        successfullyLinkedWallet: useCallback(
            (args: { spaceId: string | undefined; meetsMembershipRequirements: boolean }) => {
                const { spaceId, meetsMembershipRequirements } = args
                Analytics.getInstance().track('successfully linked wallet', {
                    spaceId,
                    meetsMembershipRequirements,
                })
            },
            [],
        ),
    }
}
