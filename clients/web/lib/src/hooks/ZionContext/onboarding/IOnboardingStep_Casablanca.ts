import { IOnboardingState } from './IOnboardingState'
import { IOnboardingStep } from './IOnboardingStep'
import { ZionClient } from '../../../client/ZionClient'
import { Client as CasablancaClient } from '@river/sdk'

export abstract class IOnboardingStep_Casablanca<T = IOnboardingState> extends IOnboardingStep<T> {
    casablancaClient: CasablancaClient
    userId: string

    constructor(client: ZionClient, casablancaClient: CasablancaClient, userId: string) {
        super(client)
        this.casablancaClient = casablancaClient
        this.userId = userId
    }
}
