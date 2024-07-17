import fs from 'fs/promises'

export type Unpromisify<T> = T extends Promise<infer U> ? U : T

export async function exists(path: string) {
    try {
        await fs.access(path, fs.constants.F_OK)
        return true
    } catch (e) {
        return false
    }
}
