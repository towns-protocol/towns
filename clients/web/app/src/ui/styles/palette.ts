export const Figma = {
    LightMode: {
        Level1: 'hsl(255, 33%, 100%)',
        Level1Transparent: 'hsla(255, 33%, 100%, var(--bg-opacity,1))',
        Level1Hover: 'hsl(255, 33%, 98%)',

        Level2: 'hsl(260, 21%, 96%)',
        Level2Hover: 'hsl(260, 21%, 93%)',

        Level3: 'hsl(258, 15%, 89%)',
        Level3Hover: 'hsl(258, 15%, 86%)',

        Level4: 'hsl(258, 8%, 76%)',
        Level4Hover: 'hsl(258, 8%, 73%)',

        Readability: 'hsl(255, 33%, 98.5%)',
        ReadabilityHover: 'hsl(255, 33%, 95%)',

        TransparentHover: 'hsla(264, 6%, 17%,0.20)',
        LightTransparentHover: 'hsla(255, 100%, 17% , 4%)',

        Primary: 'hsl(260, 5%, 8%)',
        Secondary: 'hsl(264, 5%, 18%)',
        Tertiary: 'hsl(265, 8%, 45%)',
    },
    DarkMode: {
        Level1: 'hsla(255, 9%, 9%, 1)',
        Level1Transparent: 'hsla(255, 9%, 9%, var(--bg-opacity,1))',
        Level1Hover: 'hsla(255, 9%, 13%, 1)',

        Level2: 'hsla(260, 9%, 14%, 1)',
        Level2Hover: 'hsla(260, 9%, 18%, 1)',

        Level3: 'hsla(263, 8%, 20%, 1)',
        Level3Hover: 'hsla(263, 8%, 24%, 1)',

        Level4: 'hsla(256, 7%, 30%, 1)',
        Level4Hover: 'hsla(256, 7%, 34%, 1)',

        Readability: 'hsl(255 9% 11%)',
        ReadabilityHover: 'hsl(255 9% 13%)',

        TransparentHover: 'hsla(255, 100%, 94% , 0.2)',
        LightTransparentHover: 'hsla(255, 100%, 94% , 4%)',

        Primary: 'hsla(0, 0%, 92%, 1)',
        Secondary: 'hsla(254, 14%, 82%, 1)',
        Tertiary: 'hsla(258, 4%, 55%, 1)',
    },
    Colors: {
        Blue: '#16C5DA',
        BlueTransparent: '#16C5DA90',
        Green: '#21E078',
        Red: '#F2693E',

        Purple: '#9B51FA',
        Pink: '#FF25E9',

        White: '#F8F7FB',
        Black: '#151418',
    },
} as const
