export interface Caches {
    default: {
        put(request: Request | string, response: Response): Promise<undefined>
        match(request: Request | string): Promise<Response | undefined>
        delete(request: Request | string): Promise<boolean>
    }
}
