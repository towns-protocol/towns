import { SiweMessage } from 'siwe'

export async function verifySiweMessage(request: Request) {
	const { message, signature } = (await request.json()) as {
		message?: string
		signature?: string
	}
	const siweMessage = new SiweMessage(message as string)
	await siweMessage.verify({ signature: signature as string })
	return new Response(JSON.stringify({ siweMessage }))
}
