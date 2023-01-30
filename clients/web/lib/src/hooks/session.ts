import { StatusCodes } from 'http-status-codes'
import { MatrixClient, MatrixError } from 'matrix-js-sdk'
import {
    getParamsPublicKeyEthereum,
    isLoginFlowPublicKeyEthereum,
    isPublicKeyEtheremParams,
    isPublicKeyEtheremParamsV2,
    LoginTypePublicKey,
    PublicKeyEtheremParams,
    PublicKeyEtheremParamsV2,
} from './login'

export interface NewSession {
    sessionId: string
    version: number
    chainIds: number[]
    error?: string
}

export async function newLoginSession(client: MatrixClient): Promise<NewSession> {
    console.log(`[newLoginSession] start`)
    try {
        // According to the Client-Server API specm send a GET
        // request without arguments to start a new login session.
        await client.login(LoginTypePublicKey, {})
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (ex: any) {
        // https://spec.matrix.org/v1.2/client-server-api/#user-interactive-api-in-the-rest-api
        // Per spec, expect an exception with the session ID
        const error = ex as MatrixError
        printMatrixError(error, `[newLoginSession]`)

        if (
            // Expected 401
            error.httpStatus === StatusCodes.UNAUTHORIZED &&
            isLoginFlowPublicKeyEthereum(error.data)
        ) {
            const loginFlows = error.data
            const params = getParamsPublicKeyEthereum(loginFlows.params)
            console.log(`[newLoginSession] Login session info`, loginFlows, params)
            if (params) {
                return newSessionSuccess(loginFlows.session, params)
            } else {
                return newSessionError(
                    `Server did not return information about the chain IDs or version`,
                )
            }
        } else {
            return newSessionError(`${error.httpStatus ?? 'no-status'} ${error.message}`)
        }
    }

    console.log(`[newLoginSession] end`)
    // Always fail auth if it reaches here.
    return newSessionError('Unauthorized')
}

export async function newRegisterSession(
    client: MatrixClient,
    walletAddress: string,
): Promise<NewSession> {
    console.log(`[newRegisterSession] start`)
    try {
        // https://spec.matrix.org/v1.2/client-server-api/#post_matrixclientv3register
        const requestData = {
            auth: { type: LoginTypePublicKey },
            username: walletAddress,
        }
        await client.registerRequest(requestData, LoginTypePublicKey)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (ex: any) {
        // https://spec.matrix.org/v1.2/client-server-api/#user-interactive-api-in-the-rest-api
        // Per spec, expect an exception with the session ID
        const error = ex as MatrixError
        printMatrixError(error, `[newRegisterSession]`)

        if (
            // Expected 401
            error.httpStatus === StatusCodes.UNAUTHORIZED &&
            isLoginFlowPublicKeyEthereum(error.data)
        ) {
            const loginFlows = error.data
            const params = getParamsPublicKeyEthereum(error.data.params)
            if (!params) {
                console.log('[newRegisterSession] No public key ethereum params')
                return newSessionError(`${error.httpStatus} ${error.message}`)
            }
            console.log(` [newRegisterSession] Register session info`, loginFlows, params)
            return newSessionSuccess(loginFlows.session, params)
        } else {
            return newSessionError(`${error.httpStatus ?? 'no-status'} ${error.message}`)
        }
    }

    console.log(`[newRegisterSession] end`)
    // Always fail auth if it reaches here.
    return newSessionError('Unauthorized')
}

function newSessionSuccess(
    sessionId: string,
    params: PublicKeyEtheremParams | PublicKeyEtheremParamsV2,
): NewSession {
    /**
     * Workaround until latest Dendrite is deployed in the cloud.
     * https://linear.app/hnt-labs/issue/HNT-172/cloud-deployment-changes-to-enable-authz-check-on-dendrite
     */
    if (isPublicKeyEtheremParamsV2(params)) {
        return {
            sessionId,
            chainIds: [params.chain_id],
            version: params.version,
        }
    } else if (isPublicKeyEtheremParams(params)) {
        return {
            sessionId,
            chainIds: params.chain_ids,
            version: params.version,
        }
    }
    throw new Error('Unable to parse params')
}

function newSessionError(error: string): NewSession {
    return {
        sessionId: '',
        chainIds: [],
        version: 0,
        error,
    }
}

function printMatrixError(error: MatrixError, label?: string): void {
    label = label ?? ''
    console.log(label, {
        errcode: error.errcode,
        httpStatus: error.httpStatus,
        message: error.message,
        name: error.name,
        data: error.data,
    })
}
