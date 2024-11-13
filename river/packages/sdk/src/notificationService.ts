import { makeAuthenticationRpcClient } from './makeAuthenticationRpcClient'
import { makeNotificationRpcClient } from './makeNotificationRpcClient'
import { bin_fromHexString, check } from '@river-build/dlog'
import { notificationServiceHash, riverSign } from './sign'
import { isDefined } from './check'
import { Signer } from 'ethers'
import { RpcOptions } from './rpcOptions'
import { SignerContext } from './signerContext'
import { hashPersonalMessage } from '@ethereumjs/util'

export class NotificationService {
    private static async _authenticateCommon(
        userId: Uint8Array,
        serviceUrl: string,
        opts: RpcOptions | undefined,
        getSignature: (hash: Buffer) => Promise<Uint8Array>,
        extraFinishAuthParams: Record<string, any>,
    ) {
        const authenticationRpcClient = makeAuthenticationRpcClient(serviceUrl, opts)

        const startResponse = await authenticationRpcClient.startAuthentication({ userId })
        check(startResponse.challenge.length >= 16, 'challenge must be 16 bytes')
        check(isDefined(startResponse.expiration), 'expiration must be defined')

        const hash = notificationServiceHash(
            userId,
            startResponse.expiration.seconds,
            startResponse.challenge,
        )

        const signature = await getSignature(hash)
        const finishResponse = await authenticationRpcClient.finishAuthentication({
            userId,
            challenge: startResponse.challenge,
            signature,
            ...extraFinishAuthParams,
        })

        return {
            startResponse,
            finishResponse,
            notificationRpcClient: makeNotificationRpcClient(
                serviceUrl,
                finishResponse.sessionToken,
                opts,
            ),
        }
    }

    static async authenticate(signerContext: SignerContext, serviceUrl: string, opts?: RpcOptions) {
        const userId = signerContext.creatorAddress

        return this._authenticateCommon(
            userId,
            serviceUrl,
            opts,
            async (hashSrc) => {
                const hash = hashPersonalMessage(hashSrc)
                return await riverSign(hash, signerContext.signerPrivateKey())
            },
            {
                delegateSig: signerContext.delegateSig,
                delegateExpiryEpochMs: signerContext.delegateExpiryEpochMs,
            },
        )
    }

    static async authenticateWithSigner(
        userId: string | Uint8Array,
        signer: Signer,
        serviceUrl: string,
        opts?: RpcOptions,
    ) {
        if (typeof userId === 'string') {
            userId = bin_fromHexString(userId)
        }

        return this._authenticateCommon(
            userId,
            serviceUrl,
            opts,
            async (hash) => {
                const sigHex = await signer.signMessage(hash)
                return bin_fromHexString(sigHex)
            },
            {},
        )
    }
}
