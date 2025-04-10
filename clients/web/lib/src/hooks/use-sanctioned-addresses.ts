import { useQuery } from '../query/queryClient'

// Sanctions addresses directly from the GitHub repository
const SANCTIONS_BASE_URL =
    'https://raw.githubusercontent.com/0xB10C/ofac-sanctioned-digital-currency-addresses/refs/heads/lists'
const CHAIN_LISTS = ['ETH', 'BSC', 'ARB', 'USDC', 'USDT', 'ETC']

export const sanctionsQueryKey = () => ['sanctions'] as const

// Test addresses for development/testing purposes
const TEST_ADDRESSES = [
    '0x4B1809aEA0Ef8033F1d04C4947B4fbe0e04C67ee', // Julija
    '0x49d04e5d030019146B81f55556628DaA5bE6DF13', // Darko
].map((addr) => addr.toLowerCase())

export const fetchSanctionedAddresses = async (): Promise<Set<string>> => {
    try {
        console.log('Fetching sanctions from all chains via GitHub')

        // Create fetch promises for all chains in parallel
        const fetchPromises = CHAIN_LISTS.map(async (chain) => {
            try {
                const response = await fetch(
                    `${SANCTIONS_BASE_URL}/sanctioned_addresses_${chain}.json`,
                )
                if (!response.ok) {
                    console.warn(`Failed to fetch sanctions for ${chain}: ${response.statusText}`)
                    return []
                }
                return (await response.json()) as string[]
            } catch (error) {
                console.warn(`Error fetching ${chain} sanctions:`, error)
                return []
            }
        })

        const results = await Promise.all(fetchPromises)

        // Combine all addresses, normalize them, and filter out non-Ethereum addresses
        const allAddresses = results.flatMap((addr) =>
            addr.filter((a) => a.startsWith('0x')).map((a) => a.toLowerCase()),
        )

        const uniqueAddresses = new Set([...allAddresses, ...TEST_ADDRESSES])

        console.info(
            `Sanctions fetch complete. Combined ${allAddresses.length} addresses into ${uniqueAddresses.size} unique addresses (including ${TEST_ADDRESSES.length} test addresses)`,
        )
        return uniqueAddresses
    } catch (error) {
        console.error('Failed to fetch sanctioned addresses:', error)
        // If everything fails, return an empty set
        return new Set([])
    }
}

export function useSanctionedAddresses() {
    const { data: sanctionedAddresses, isLoading } = useQuery(
        sanctionsQueryKey(),
        fetchSanctionedAddresses,
        {
            staleTime: 60 * 60 * 1000 * 24, // 1 day
            retry: 3,
        },
    )

    const isSanctioned = (address: string): boolean => {
        if (!sanctionedAddresses) {
            return false
        }
        return sanctionedAddresses.has(address.toLowerCase())
    }

    return {
        isSanctioned,
        isLoading,
    }
}
