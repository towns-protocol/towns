export enum CONTRACT_ERROR {
    AddRoleFailed = 'AddRoleFailed',
    NotAllowed = 'NotAllowed',
    NotOwner = 'Ownable__NotOwner',
    RoleAlreadyExists = 'ChannelService__RoleAlreadyExists',
}

export class NoThrownError extends Error {}

export interface ErrorWithCode extends Error {
    code: number
}

export async function getError<TError>(call: () => unknown): Promise<TError> {
    try {
        await call()

        throw new NoThrownError()
    } catch (error: unknown) {
        return error as TError
    }
}
