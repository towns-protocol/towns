import type { ChunkedMedia } from '@river-build/proto'
import type { FastifyBaseLogger } from 'fastify'

export function getMediaEncryption(
	logger: FastifyBaseLogger,
	chunkedMedia: ChunkedMedia,
): { key: Uint8Array; iv: Uint8Array } {
	switch (chunkedMedia.encryption.case) {
		case 'aesgcm': {
			return {
				key: chunkedMedia.encryption.value.secretKey,
				iv: chunkedMedia.encryption.value.iv,
			}
		}
		default:
			logger.error(
				{
					case: chunkedMedia.encryption.case,
					value: chunkedMedia.encryption.value,
				},
				'Unsupported encryption',
			)
			throw new Error('Unsupported encryption')
	}
}
