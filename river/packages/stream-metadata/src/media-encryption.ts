import type { ChunkedMedia } from '@river-build/proto'
import type { FastifyBaseLogger } from 'fastify'

import { getFunctionLogger } from './logger'

export function getMediaEncryption(
	log: FastifyBaseLogger,
	chunkedMedia: ChunkedMedia,
): { key: Uint8Array; iv: Uint8Array } {
	const logger = getFunctionLogger(log, 'getEncryption')
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
