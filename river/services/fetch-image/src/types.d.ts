export interface ChainConfig {
	chainId: number
	riverRegistry: string
}

export type Address = `0x${string}`

// todo: this one needs to be 0x.... 64 characters
export type StreamIdHex = `0x${string}`

export interface MediaContent {
	data: ArrayBuffer
	mimeType: string
}
