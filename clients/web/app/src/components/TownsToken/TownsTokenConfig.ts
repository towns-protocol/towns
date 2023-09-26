export const TownsTokenConfig = {
    sizes: {
        sm: {
            containerSize: 130,
            addressSize: 105,
            addressRadius: 24,
            badgeSize: 85,
            badgeRadius: 16,
            fontSize: 8,
        },
        lg: {
            containerSize: 220,
            addressSize: 190,
            addressRadius: 20,
            badgeSize: 160,
            badgeRadius: 16,
            fontSize: 12,
        },
        xl: {
            containerSize: 280,
            addressSize: 270,
            addressRadius: 16,
            badgeSize: 216,
            badgeRadius: 16,
            fontSize: 16,
        },
    },
} as const

export type TownsTokenSize = keyof typeof TownsTokenConfig.sizes
