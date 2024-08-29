import axios from 'axios'
import { dlog } from '@river-build/dlog'

import { getTestServerUrl } from '../testUtils'

const log = dlog('stream-metadata:test:health', {
	allowJest: true,
	defaultEnabled: true,
})

describe('integration/stream-metadata/health', () => {
	const baseURL = getTestServerUrl()
	log('baseURL', baseURL)

	it('should return status 200 and status ok when the server is healthy', async () => {
		const endpoint = `${baseURL}/health`
		const response = await axios.get(endpoint)

		expect(response.status).toBe(200)
		expect(response.data).toEqual({ status: 'ok' })
	})
})
