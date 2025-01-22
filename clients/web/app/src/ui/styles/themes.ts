import { Figma } from './palette'

export const ToneName = {
    Neutral: 'neutral',
    Accent: 'accent',
    AccentTransparent: 'accentTransparent',
    CTA1: 'cta1',
    CTA2: 'cta2',
    Error: 'error',
    ENS: 'etherum',
    Presence: 'presence',
    Positive: 'positive',
    PositiveSubtle: 'positiveSubtle',
    Negative: 'negative',
    NegativeSubtle: 'negativeSubtle',
    None: 'none',
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
    [ToneName.Presence]: Figma.Colors.Green,
} as const

const overlay = {
    white: Figma.Colors.White,
    black: Figma.Colors.Black,
}

const html = {
    inherit: 'inherit',
    initial: 'initial',
    none: 'none',
}

const Gradients = {
    Rainbow: {
        backgroundImage: `linear-gradient(90deg, ${Figma.Colors.Blue}, ${Figma.Colors.Yellow}, ${Figma.Colors.Pink})`,
        color: 'transparent',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    },
    GreenBlue: {
        backgroundImage: 'linear-gradient(90deg, #21E078 0%, #1FDBF1 100%)',
        color: 'transparent',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    },
} as const

const light = (() => {
    // special green for light mode
    const _tone = {
        ...tone,
        [ToneName.CTA1]: Figma.LightMode.Green,
        [ToneName.Positive]: Figma.LightMode.Green,
        [ToneName.Presence]: Figma.LightMode.Green,
    } as const

    const layer = {
        none: 'none',
        inherit: 'inherit',
        level1: Figma.LightMode.Level1,
        level1Hover: Figma.LightMode.Level1Hover,
        level1Transparent: Figma.LightMode.Level1Transparent,
        level2: Figma.LightMode.Level2,
        level2Hover: Figma.LightMode.Level2Hover,
        level3: Figma.LightMode.Level3,
        level3Hover: Figma.LightMode.Level3Hover,
        level4: Figma.LightMode.Level4,
        level4Hover: Figma.LightMode.Level4Hover,
        readability: Figma.LightMode.Readability,
        readabilityHover: Figma.LightMode.ReadabilityHover,
        hover: Figma.LightMode.TransparentHover,
        lightHover: Figma.LightMode.LightTransparentHover,
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
        rainbow: Gradients.Rainbow,
        greenBlue: Gradients.GreenBlue,
    }

    return {
        tone: _tone,
        layer,
        text,
        overlay,
        foreground: {
            ...text,
            ..._tone,
            ...html,
        } as const,
        background: {
            ...layer,
            ..._tone,
        } as const,
    } as const
})()

const dark = (() => {
    const layer = {
        none: 'none',
        inherit: 'inherit',
        level1: Figma.DarkMode.Level1,
        level1Hover: Figma.DarkMode.Level1Hover,
        level1Transparent: Figma.DarkMode.Level1Transparent,
        level2: Figma.DarkMode.Level2,
        level2Hover: Figma.DarkMode.Level2Hover,
        level3: Figma.DarkMode.Level3,
        level3Hover: Figma.DarkMode.Level3Hover,
        level4: Figma.DarkMode.Level4,
        level4Hover: Figma.DarkMode.Level4Hover,
        readability: Figma.DarkMode.Readability,
        readabilityHover: Figma.DarkMode.ReadabilityHover,
        hover: Figma.DarkMode.TransparentHover,
        lightHover: Figma.DarkMode.LightTransparentHover,
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
        rainbow: Gradients.Rainbow,
        greenBlue: Gradients.GreenBlue,
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
