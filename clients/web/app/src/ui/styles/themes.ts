import { Figma } from './palette'

export const ToneName = {
    Neutral: 'neutral',
    Accent: 'accent',
    AccentTransparent: 'accentTransparent',
    CTA1: 'cta1',
    CTA2: 'cta2',
    Error: 'error',
    ENS: 'etherum',
    Positive: 'positive',
    Negative: 'negative',
} as const

export type ToneNameType = (typeof ToneName)[keyof typeof ToneName]

const tone = {
    // default
    [ToneName.Neutral]: '',
    [ToneName.Accent]: Figma.Colors.Blue,
    [ToneName.AccentTransparent]: Figma.Colors.BlueTransparent,
    [ToneName.CTA1]: Figma.Colors.Green,
    [ToneName.CTA2]: Figma.Colors.Purple,
    [ToneName.Error]: Figma.Colors.Red,
    [ToneName.Positive]: Figma.Colors.Green,
    [ToneName.Negative]: Figma.Colors.Red,
} as const

const overlay = {
    white: Figma.Colors.White,
    black: Figma.Colors.Black,
    transparentBright: `rgba(255,255,255,0.5)`,
    transparentDark: `rgba(0,0,0,0.5)`,
}

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
        level1Hover: Figma.LightMode.Level1Hover,
        level2: Figma.LightMode.Level2,
        level2Hover: Figma.LightMode.Level2Hover,
        level3: Figma.LightMode.Level3,
        level3Hover: Figma.LightMode.Level3Hover,
        level4: Figma.LightMode.Level4,
        level4Hover: Figma.LightMode.Level4Hover,
        readability: Figma.LightMode.Readability,
        readabilityHover: Figma.LightMode.ReadabilityHover,
        hover: Figma.LightMode.TransparentHover,
        inverted: Figma.LightMode.Primary,
    } as const

    const text = {
        default: Figma.LightMode.Primary,
        gray1: Figma.LightMode.Secondary,
        gray2: Figma.LightMode.Tertiary,
        accent: Figma.Colors.Purple,
        secondary: Figma.Colors.Pink,
        inverted: Figma.DarkMode.Primary,
        onTone: Figma.Colors.Black,
    }

    return {
        tone,
        layer,
        text,
        overlay,
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
        level1Hover: Figma.DarkMode.Level1Hover,
        level2: Figma.DarkMode.Level2,
        level2Hover: Figma.DarkMode.Level2Hover,
        level3: Figma.DarkMode.Level3,
        level3Hover: Figma.DarkMode.Level3Hover,
        level4: Figma.DarkMode.Level4,
        level4Hover: Figma.DarkMode.Level4Hover,
        readability: Figma.DarkMode.Readability,
        readabilityHover: Figma.DarkMode.ReadabilityHover,
        hover: Figma.DarkMode.TransparentHover,
        inverted: Figma.DarkMode.Primary,
    } as const

    const text = {
        default: Figma.DarkMode.Primary,
        gray1: Figma.DarkMode.Secondary,
        gray2: Figma.DarkMode.Tertiary,
        accent: Figma.Colors.Purple,
        secondary: Figma.Colors.Pink,
        inverted: Figma.DarkMode.Level1,
        onTone: Figma.Colors.Black,
    } as const

    return {
        tone,
        layer,
        text,

        overlay,
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
