import { townsHash, townsRecoverPubKey, townsSign } from './crypto'
import { bin_fromHexString, bin_toHexString } from '../binary'
import { SigningKey } from 'ethers/lib/utils'
import { ethers } from 'ethers'
import { dlog } from '../dlog'

const log = dlog('csb:rk')

export type SerializedRK = Uint8Array

export type SerializedRDK = {
    sig: Uint8Array | undefined
    key: Uint8Array
}
/* River public key for signing and verifying */
export interface RiverPublicKey {
    bytes: Uint8Array
}

export interface ISerializeable<S> {
    serialize(): S
}

/* River Key for signing and verifying identities of users and devices.
   Could be either RK (River Root Key) or RDK (River Device Key).
*/
export class RiverKey {
    /* ECDSA key pair */
    readonly key: SigningKey
    public readonly address: string
    public readonly privateKey: Uint8Array

    public publicKey(): RiverPublicKey {
        return {
            bytes: bin_fromHexString(this.key.publicKey),
        }
    }

    public constructor(privateKey: Uint8Array) {
        this.privateKey = privateKey
        this.key = new SigningKey(privateKey)
        this.address = ethers.utils.computeAddress(this.key.publicKey)
    }
}

/***
 * River Device Key (RDK) represents user's device identity. It gets created for
 * each new device and must be stored securely. RDK signs the user's events and
 * the client must provide the delegation signature alongside with the signed event
 * to proof the event's authenticity.
 */
export class RDK extends RiverKey implements ISerializeable<SerializedRDK> {
    /* Signature of the public key by the RK key.
       populated by RK.signRdk() as secp256k1(keccak256(this.key.publicKey), rk.key.privateKey).
       If not set, the RDK doesn't have an associated RK.
     */
    delegateSig?: Uint8Array

    public isSigned(): boolean {
        return this.delegateSig !== undefined
    }

    public serialize(): SerializedRDK {
        return {
            sig: this.delegateSig,
            key: bin_fromHexString(this.key.privateKey),
        }
    }

    static from(value: SerializedRDK): RDK {
        if (!value.key) {
            throw new Error('RDK key is not set')
        }
        const rdk = new RDK(value.key)
        rdk.delegateSig = value.sig
        return rdk
    }

    static createRandom(): RDK {
        log('createRandom RDK')
        return new RDK(bin_fromHexString(ethers.Wallet.createRandom().privateKey))
    }
}

/***
 * River Root Key (RK) represents Towns user identity. It gets created for each new user and must be stored securely.
 * RK can perform the following operations:
 *  - sign River Device Keys (RDK) (the public part)
 *  - verify River Device Keys (RDK) (the public part)
 *  - sign user Wallet (the public part)
 */
export class RK extends RiverKey implements ISerializeable<SerializedRK> {
    public async signRdk(rdk: RDK): Promise<RDK> {
        if (rdk.isSigned()) {
            throw new Error('RDK is already signed')
        }
        const hash = townsHash(rdk.publicKey().bytes)
        rdk.delegateSig = await townsSign(hash, bin_fromHexString(this.key.privateKey))
        return rdk
    }

    public verifyRdk(rdk: RDK): boolean {
        if (!rdk.delegateSig) {
            log('rdk.delegateSig is not set')
            return false
        }
        const hash = townsHash(rdk.publicKey().bytes)
        const recovered = townsRecoverPubKey(hash, rdk.delegateSig)
        return bin_toHexString(recovered) == this.key.publicKey.substring(2)
    }

    public serialize(): SerializedRK {
        return bin_fromHexString(this.key.privateKey)
    }

    static from(value: SerializedRK): RK {
        return new RK(value)
    }

    public static createRandom(): RK {
        log('createRandom RK')
        return new RK(bin_fromHexString(ethers.Wallet.createRandom().privateKey))
    }
}
export function createRandom<T>(keyType: { new (pk: Uint8Array): T }): T {
    return new keyType(bin_fromHexString(ethers.Wallet.createRandom().privateKey))
}
