import { style } from "@vanilla-extract/css";
import { createSprinkles, defineProperties } from "@vanilla-extract/sprinkles";
import { vcn } from "vanilla-classnames";
import { responsiveConditions } from "ui/styles/breakpoints";
import { vars } from "ui/styles/vars.css";

/**
 * why not use recipes API ?
 * https://github.com/seek-oss/vanilla-extract/discussions/497
 */

export const avatarSizes = {
  sm: {
    width: vars.dims.icons.sm,
    height: vars.dims.icons.sm,
    borderRadius: vars.borderRadius.xs,
  },
  md: {
    width: vars.dims.icons.md,
    height: vars.dims.icons.md,
    borderRadius: vars.borderRadius.sm,
  },
  lg: {
    width: vars.dims.icons.lg,
    height: vars.dims.icons.lg,
    borderRadius: vars.borderRadius.md,
  },
  xl: {
    width: vars.dims.icons.xl,
    height: vars.dims.icons.xl,
    borderRadius: vars.borderRadius.md,
  },
} as const;

const avatarProperties = defineProperties({
  conditions: responsiveConditions,
  defaultCondition: "desktop",
  properties: {
    size: avatarSizes,

    shape: {
      circle: {
        borderRadius: vars.borderRadius.full,
      },
    },
    border: {
      true: {
        border: `2px solid ${vars.color.layer.default}`,
      },
    },
  },
});

export const avatarBaseStyle = style({
  backgroundSize: "cover",
  backgroundPosition: "center center",
});

export const avatarToggleClasses = vcn({
  nft: style({
    WebkitMaskImage: `url(/nftmask.svg)`,
    WebkitMaskOrigin: `center`,
    WebkitMaskRepeat: `no-repeat`,
    WebkitMaskSize: `cover`,
  }),
  stacked: style({
    selectors: {
      "&:not(:first-child)": {
        marginLeft: `calc(-1 * ${vars.space.xs})`,
      },
    },
    border: `2px solid ${vars.color.layer.default}`,
  }),
});

export type ToggleProps = Parameters<typeof avatarToggleClasses>[0];

export const avatarAtoms = createSprinkles(avatarProperties);

export type AvatarAtoms = Parameters<typeof avatarAtoms>[0] & ToggleProps;
