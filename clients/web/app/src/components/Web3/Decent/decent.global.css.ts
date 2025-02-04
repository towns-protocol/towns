import { globalStyle } from '@vanilla-extract/css'
import { vars } from 'ui/styles/vars.css'

globalStyle('.box-swap-modal-token-card button', {
    color: 'inherit',
    backgroundColor: 'transparent',
    cursor: 'pointer',
})

globalStyle('.box-swap-modal-token-card .box-swap-input', {
    color: 'inherit',
})

globalStyle('.box-swap-modal-content .box-swap-switch-btn', {
    display: 'flex',
    cursor: 'pointer',
})

globalStyle('.box-swap-modal .box-address-search-box', {
    backgroundColor: `${vars.color.layer.level3} !important`,
    borderRadius: `${vars.borderRadius.md} !important`,
})

globalStyle('.box-swap-modal .box-address-search-box input', {
    backgroundColor: 'transparent !important',
    color: `${vars.color.text.default} !important`,
})

globalStyle('.box-popular-chip ', {
    backgroundColor: `${vars.color.layer.level3} !important`,
    color: `${vars.color.text.default} !important`,
    cursor: 'pointer',
})

globalStyle('.box-token-row ', {
    backgroundColor: `${vars.color.layer.level3} !important`,
    color: `${vars.color.text.default} !important`,
    cursor: 'pointer',
})

globalStyle('.box-token-row:hover', {
    backgroundColor: `${vars.color.layer.level4} !important`,
})

globalStyle('.box-swap-fee-card', {
    backgroundColor: `${vars.color.layer.level2} !important`,
    borderRadius: `${vars.borderRadius.md} !important`,
})

globalStyle('.box-swap-fee-card button', {
    background: `none !important`,
    color: `${vars.color.text.default} !important`,
    cursor: 'pointer',
})

const ctaButton = {
    backgroundColor: `${vars.color.tone.cta1} !important`,
    borderRadius: `${vars.borderRadius.md} !important`,
    fontSize: `${vars.fontSize.md} !important`,
    height: `${vars.dims.button.button_md} !important`,
    fontVariationSettings: `${vars.fontWeight.medium.fontVariationSettings} !important`,
    paddingLeft: `${vars.dims.baseline.x3} !important`,
    paddingRight: `${vars.dims.baseline.x3} !important`,
    gap: `${vars.space.sm} !important`,
    color: `${vars.color.text.inverted} !important`,
    cursor: 'pointer',
}

globalStyle('.box-buy-btn', ctaButton)

const { backgroundColor, color, ...rest } = ctaButton

// onboarding fund button
globalStyle('.box-onboarding-swap-btn:not(.box-bg-red)', {
    ...rest,
    backgroundColor,
    color,
})

// onboarding fund button insufficient funds
globalStyle('.box-onboarding-swap-btn.box-bg-red', {
    ...rest,
})

globalStyle('.box-onboarding-big-input', {
    color: 'inherit',
})

globalStyle('.box-receiver-text-line', {
    color: vars.color.text.gray1,
})

globalStyle('.box-receiver-address-text', {
    background: 'transparent !important',
})

globalStyle('.box-onboarding-top-card button', {
    color: vars.color.text.default,
    background: 'transparent !important',
    cursor: 'pointer',
})

globalStyle('.box-token-group-option button', {
    backgroundColor: `${vars.color.layer.level3} !important`,
    color: `${vars.color.text.default} !important`,
    cursor: 'pointer',
})

globalStyle('.box-token-group-option button:hover', {
    backgroundColor: `${vars.color.layer.level4} !important`,
})

globalStyle('.box-balance-selector', {
    width: '100% !important',
    padding: '0 !important',
})

globalStyle('.box-balance-selector-amt', {
    background: 'transparent !important',
    color: `${vars.color.text.default} !important`,
})

globalStyle('.box-onboarding-src-converted-line', {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
})

globalStyle('.box-onboarding-middle-circle', {
    backgroundColor: `${vars.color.background.level3} !important`,
})
