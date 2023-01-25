import { Figma } from './palette'

export const ToneName = {
    Neutral: 'neutral',
    Accent: 'accent',
    CTA1: 'cta1',
    CTA2: 'cta2',
    Error: 'error',
    ENS: 'etherum',
    Positive: 'positive',
    Negative: 'negative',
} as const

export type ToneNameType = typeof ToneName[keyof typeof ToneName]

const tone = {
    // default
    [ToneName.Neutral]: '',
    [ToneName.Accent]: Figma.Colors.Blue,
    [ToneName.CTA1]: Figma.Colors.Orange,
    [ToneName.CTA2]: Figma.Colors.Purple,
    [ToneName.Error]: Figma.Colors.Error,
    // forms
    [ToneName.Positive]: Figma.Colors.Green,
    [ToneName.Negative]: Figma.Colors.Yellow,
    // specefics
    [ToneName.ENS]: Figma.Colors.ENSBlue,
} as const

const html = {
    inherit: 'inherit',
    initial: 'initial',
    none: 'none',
}

const light = (() => {
    const layer = {
        none: 'none',
        inherit: 'inherit',
        level1: Figma.LightMode.Level1,
        level2: Figma.LightMode.Level2,
        level3: Figma.LightMode.Level3,
        level4: Figma.LightMode.Level4,
        /** opacity overlay, highlighting content undependently of parent layer layers */
        overlay: `rgba(255,255,255,0.5)`,
        inverted: Figma.DarkMode.Level1,
    } as const

    const text = {
        default: Figma.LightMode.Primary,
        gray1: Figma.LightMode.Secondary,
        gray2: Figma.LightMode.Tertiary,
        accent: Figma.Colors.Purple,
        secondary: Figma.Colors.Orange,
        inverted: Figma.DarkMode.Primary,
        onTone: Figma.DarkMode.Primary,
    }

    const shadow = {
        light: `rgba(25, 27, 33, 0.2)`,
        medium: `rgba(0, 0, 0, 0.25)`,
    } as const

    return {
        tone,
        layer,
        text,
        shadow,
        foreground: {
            ...text,
            ...tone,
            ...html,
        } as const,
        background: {
            ...layer,
            ...tone,
        } as const,
    } as const
})()

const dark = (() => {
    const layer = {
        none: 'none',
        inherit: 'inherit',
        level1: Figma.DarkMode.Level1,
        level2: Figma.DarkMode.Level2,
        level3: Figma.DarkMode.Level3,
        level4: Figma.DarkMode.Level4,
        /** opacity overlay, highlighting content undependently of parent layer background */
        overlay: `rgba(255,255,255,0.5)`,
        inverted: Figma.DarkMode.Secondary,
    } as const

    const text = {
        default: Figma.DarkMode.Primary,
        gray1: Figma.DarkMode.Secondary,
        gray2: Figma.DarkMode.Tertiary,
        accent: Figma.Colors.Purple,
        secondary: Figma.Colors.Orange,
        inverted: Figma.DarkMode.Level1,
        onTone: Figma.DarkMode.Primary,
    } as const

    const shadow = {
        light: `rgba(25, 27, 33, 0.2)`,
        medium: `rgba(0, 0, 0, 0.25)`,
    } as const

    return {
        tone,
        layer,
        text,
        shadow,
        foreground: {
            ...text,
            ...tone,
            ...html,
        } as const,
        background: {
            ...layer,
            ...tone,
        } as const,
    } as const
})()

export const themes = {
    light,
    dark,
} as const
