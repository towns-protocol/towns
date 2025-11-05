import { readFile } from 'fs/promises'
import { resolve } from 'path'
import { config } from 'dotenv'
import { default as imageSize } from 'image-size'
import { fileTypeFromBuffer } from 'file-type'
import {
    parseAppPrivateData,
    createTownsClient,
    sendChunkedMedia,
    setProfileImage,
    TownsService,
} from '@towns-protocol/sdk'

interface UploadPfpArgs {
    imagePath: string
}
export async function uploadPfp(args: UploadPfpArgs): Promise<void> {
    try {
        console.log('🖼️  Uploading profile picture...')
        const imagePath = resolve(process.cwd(), args.imagePath)

        // Load .env from current working directory
        const envPath = resolve(process.cwd(), '.env')
        config({ path: envPath })

        const appPrivateData = process.env.APP_PRIVATE_DATA
        if (!appPrivateData) {
            throw new Error(
                'APP_PRIVATE_DATA not found in .env file. Please ensure .env exists in the current directory.',
            )
        }
        const parsed = parseAppPrivateData(appPrivateData)
        if (!parsed.privateKey || !parsed.env) {
            throw new Error('Invalid APP_PRIVATE_DATA: missing required fields')
        }

        const imageBuffer = await readFile(imagePath)
        const { height, width } = imageSize(imageBuffer)
        if (!width || !height) {
            throw new Error('Could not determine image dimensions')
        }
        const filename = imagePath.split('/').pop() || 'image'
        const fileType = await fileTypeFromBuffer(imageBuffer)
        if (!fileType?.mime) {
            throw new Error('Could not determine file type')
        }
        const client = await createTownsClient({
            privateKey: parsed.privateKey,
            env: parsed.env,
            encryptionDevice: {
                fromExportedDevice: parsed.encryptionDevice,
            },
        })
        const chunkedMedia = await sendChunkedMedia(client, {
            type: 'chunked',
            data: imageBuffer,
            filename,
            height,
            width,
            mimetype: fileType.mime,
        })
        await setProfileImage(client, chunkedMedia)
        const streamMetadataUrl = client.config.services.find(
            (service) => service.id === TownsService.StreamMetadata,
        )?.url
        if (streamMetadataUrl) {
            const res = await fetch(
                `${streamMetadataUrl}/user/${client.userId}/refresh?target=image`,
            )
            if (!res.ok) {
                throw new Error('Failed to refresh user profile picture')
            }
        }
        console.log('✅ Profile picture uploaded successfully')
        process.exit(0)
    } catch (error) {
        console.error('\n❌ Error uploading profile picture:')
        console.error(error)
        process.exit(1)
    }
}
