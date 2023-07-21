import { townsHash, townsRecoverPubKey, townsSign } from './crypto'
import { bin_fromHexString, bin_toHexString } from '../binary'
import { SigningKey } from 'ethers/lib/utils'
import { ethers } from 'ethers'

/* River public key for signing and verifying */
export interface RiverPublicKey {
    bytes: Uint8Array
}

/* River Key for signing and verifying identities of users and devices.
   Could be either RK (River Root Key) or RDK (River Device Key).
*/
export class RiverKey {
    /* ECDSA key pair */
    key: SigningKey

    public publicKey(): RiverPublicKey {
        return {
            bytes: bin_fromHexString(this.key.publicKey),
        }
    }

    public privateKey(): Uint8Array {
        return bin_fromHexString(this.key.privateKey)
    }

    public constructor(privateKey: Uint8Array) {
        this.key = new SigningKey(privateKey)
    }
}

/***
 * River Device Key (RDK) represents user's device identity. It gets created for
 * each new device and must be stored securely. RDK signs the user's events and
 * the client must provide the delegation signature alongside with the signed event
 * to proof the event's authenticity.
 */
export class RDK extends RiverKey {
    /* Signature of the public key by the RK key.
       populated by RK.signRdk() as secp256k1(keccak256(this.key.publicKey), rk.key.privateKey).
       If not set, the RDK doesn't have an associated RK.
     */
    delegateSig?: Uint8Array

    static from(privateKey: Uint8Array, delegateSig?: Uint8Array): RDK {
        const rdk = new RDK(privateKey)
        rdk.delegateSig = delegateSig
        return rdk
    }

    static createRandom(): RDK {
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
export class RK extends RiverKey {
    public async signRdk(rdk: RDK): Promise<Uint8Array> {
        const hash = townsHash(rdk.publicKey().bytes)
        rdk.delegateSig = await townsSign(hash, bin_fromHexString(this.key.privateKey))
        return rdk.delegateSig
    }

    public verifyRdk(rdk: RDK): boolean {
        if (!rdk.delegateSig) {
            return false
        }
        const hash = townsHash(rdk.publicKey().bytes)
        const recovered = townsRecoverPubKey(hash, rdk.delegateSig)
        return bin_toHexString(recovered) == this.key.publicKey.substring(2)
    }

    public static createRandom(): RK {
        return new RK(bin_fromHexString(ethers.Wallet.createRandom().privateKey))
    }
}
