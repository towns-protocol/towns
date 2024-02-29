import { worker } from '../src/index'

test('GET with defined URL', async () => {
	const result = await worker.fetch(new Request('http://falcon', { method: 'GET' }), {
		LATEST_DEV_TOWN_INVITE_URL: 'https://google.com',
	})
	expect(result.status).toBe(302)
})

test('GET without defined URL', async () => {
	const result = await worker.fetch(new Request('http://falcon', { method: 'GET' }), {})
	expect(result.status).toBe(500)
	const text = await result.text()
	expect(text).toBe("LATEST_DEV_TOWN_INVITE_URL is not set. We're probably reseting, hang tight!")
})
