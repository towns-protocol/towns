import { IOnboardingState } from './IOnboardingState'
import { IOnboardingStep } from './IOnboardingStep'
import { MatrixClient, User as MatrixUser } from 'matrix-js-sdk'
import { ZionClient } from '../../../client/ZionClient'

export abstract class IOnboardingStep_Matrix<T = IOnboardingState> extends IOnboardingStep<T> {
    matrixClient: MatrixClient
    matrixUserId: string

    constructor(client: ZionClient, matrixClient: MatrixClient, matrixUserId: string) {
        super(client)
        this.matrixClient = matrixClient
        this.matrixUserId = matrixUserId
    }
    get matrixUser(): MatrixUser | undefined {
        const user = this.matrixClient.getUser(this.matrixUserId)
        return user ?? undefined
    }
}
