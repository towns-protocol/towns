import { useEffect, useState } from 'react'
import { useZionContext } from '../components/ZionContextProvider'
import { decryptAESGCM } from '../utils/crypto-utils'

type Props = {
    streamId: string
    iv: Uint8Array
    secretKey: Uint8Array
}

export function useChunkedMedia(props: Props) {
    const { streamId } = props
    const { casablancaClient } = useZionContext()
    const [objectURL, setObjectURL] = useState<string | undefined>(undefined)

    useEffect(() => {
        if (!casablancaClient) {
            return
        }

        async function getObjectURL(): Promise<string | undefined> {
            const cache = await caches.open('chunked-media')
            const response = await cache.match(streamId)
            if (response) {
                const blob = await response.blob()
                return URL.createObjectURL(blob)
            }

            if (!casablancaClient) {
                return undefined
            }

            const stream = await casablancaClient.getStream(streamId)
            const data = stream.mediaContent.chunks.reduce((acc, chunk) => {
                return new Uint8Array([...acc, ...chunk])
            }, new Uint8Array())

            const decrypted = await decryptAESGCM(data, props.iv, props.secretKey)

            const blob = new Blob([decrypted])
            const objectURL = URL.createObjectURL(blob)
            await cache.put(streamId, new Response(blob))
            return objectURL
        }

        getObjectURL()
            .then((objectURL) => {
                setObjectURL(objectURL)
            })
            .catch((err) => {
                console.log(err)
            })
    }, [casablancaClient, setObjectURL, streamId, props.iv, props.secretKey])

    return { objectURL }
}
