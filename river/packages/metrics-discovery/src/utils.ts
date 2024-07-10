import fs, { WriteFileOptions } from 'fs'

export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export function writeFile(
    file: string,
    data: string | NodeJS.ArrayBufferView,
    options: WriteFileOptions,
) {
    return new Promise<void>((resolve, reject) => {
        fs.writeFile(file, data, options, (err) => {
            if (err) {
                reject(err)
            } else {
                resolve()
            }
        })
    })
}
