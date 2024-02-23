export class CodeException extends Error {
    code: number | string
    data: unknown | undefined
    constructor(message: string, code: number | string, data?: unknown) {
        super(message)
        this.code = code
        this.data = data
    }
}
