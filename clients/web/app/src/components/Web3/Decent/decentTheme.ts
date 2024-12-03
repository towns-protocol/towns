import { BoxTheme } from '@decent.xyz/the-box'
import '@decent.xyz/the-box/index.css'
import { vars } from 'ui/styles/vars.css'
import './decent.global.css'

// see decent.global.css for further customization not supported by the-box
export const decentTheme: BoxTheme = {
    // swap
    mainBgColor: 'none',
    mainTextColor: vars.color.text.default,
    tokenSwapCardBgColor: vars.color.layer.level2,
    switchBtnBgColor: vars.color.background.level3,
    tokenDialogHoverColor: vars.color.layer.level3,
    boxSubtleColor1: vars.color.text.gray2,
    borderRadius: vars.borderRadius.md,
    boxDialogBgColor: vars.color.layer.level2,
    boxDialogTextColor: vars.color.text.default,

    // onboarding
    lighterBgColor: vars.color.background.level2,

    // buyBtnBgColor: 'red',
    // buyBtnTextColor: '#ffffff',
    // borderColor: '#27252B',
    loadShineColor1: vars.color.background.level3,
    loadShineColor2: vars.color.background.level2,
    // greenBadgeTextColor: '#11BC91',
    // greenBadgeBgColor: '#123129',
    // yellowBadgeTextColor: '#FF8B31',
    // yellowBadgeBgColor: '#3D2818',
    blueBadgeBgColor: 'none',
    // blueBadgeTextColor: '#256AF6',
    // circleLinkChainColor: '#9969FF',
    // circleLinkBgColor: '#261D3C',
    // buyBtnBorderRadius: '999px',
}
