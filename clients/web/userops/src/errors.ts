export class CodeException extends Error {
    code: number | string
    constructor(message: string, code: number | string) {
        super(message)
        this.code = code
    }
}
