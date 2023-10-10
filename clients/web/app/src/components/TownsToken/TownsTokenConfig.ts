export const TownsTokenConfig = {
    sizes: {
        sm: {
            containerSize: 130,
            addressSize: 105,
            addressRadius: 20,
            badgeSize: 85,
            badgeRadius: 16,
            fontSize: 8,
            maxTextHeight: 42,
        },
        lg: {
            containerSize: 220,
            addressSize: 190,
            addressRadius: 20,
            badgeSize: 160,
            badgeRadius: 16,
            fontSize: 12,
            maxTextHeight: 80,
        },
        xl: {
            containerSize: 300,
            addressSize: 280,
            addressRadius: 32,
            badgeSize: 216,
            badgeRadius: 16,
            fontSize: 18,
            maxTextHeight: 120,
        },
    },
} as const

export type TownsTokenSize = keyof typeof TownsTokenConfig.sizes
