import Olm from '@matrix-org/olm'

export async function createOlmAccount(): Promise<Olm.Account> {
    // Olm library must be init prior to creating an account
    await Olm.init()
    const account = new Olm.Account()
    return account
}
