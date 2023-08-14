export enum MAXTRIX_ERROR {
    M_FORBIDDEN = 'M_FORBIDDEN',
}

export enum CONTRACT_ERROR {
    AddRoleFailed = 'AddRoleFailed',
    EntitlementNotAllowed = 'Entitlement__NotAllowed',
    NotAllowed = 'NotAllowed',
    NotOwner = 'Ownable__NotOwner',
}

export class NoThrownError extends Error {}

export interface ErrorData {
    errorcode: string
    error: string
}

export interface MatrixError {
    data: ErrorData
}

export async function getError<TError>(call: () => unknown): Promise<TError> {
    try {
        await call()

        throw new NoThrownError()
    } catch (error: unknown) {
        return error as TError
    }
}
