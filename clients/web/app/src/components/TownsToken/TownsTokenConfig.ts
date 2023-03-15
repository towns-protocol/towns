export const TownsTokenConfig = {
    sizes: {
        sm: {
            containerSize: 140,
            addressSize: 105,
            addressRadius: 24,
            badgeSize: 85,
            badgeRadius: 16,
            fontSize: 8,
        },
        lg: {
            containerSize: 320,
            addressSize: 190,
            addressRadius: 20,
            badgeSize: 160,
            badgeRadius: 16,
            fontSize: 12,
        },
    },
} as const

export type TownsTokenSize = keyof typeof TownsTokenConfig.sizes
