// Function to check if a string is a valid hexadecimal Ethereum address
export function isValidEthereumAddress(address: string): boolean {
	return /^0x[a-fA-F0-9]{40}$/.test(address)
}

export function isBytes32String(value: string) {
	if (value === null) {
		return false
	}
	const hexStringPattern = /^0x[a-fA-F0-9]{64}$/
	return hexStringPattern.test(value)
}
