import { recipe, RecipeVariants } from "@vanilla-extract/recipes";
import { vars } from "ui/styles/vars.css";

export const avatarSizes = {
  sm: {
    width: vars.dims.icons.sm,
    height: vars.dims.icons.sm,
    borderRadius: vars.borderRadius.xs,
  },
  md: {
    width: vars.dims.icons.md,
    height: vars.dims.icons.md,
    borderRadius: vars.borderRadius.lg,
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
};

export const avatarStyle = recipe({
  base: {
    backgroundSize: "cover",
    backgroundPosition: "center center",
  },
  variants: {
    size: avatarSizes,
    stacked: {
      true: {
        selectors: {
          "&:not(:first-child)": {
            marginLeft: `calc(-1 * ${vars.space.xs})`,
          },
        },
        border: `2px solid ${vars.color.background.default}`,
      },
    },
    nft: {
      true: {
        WebkitMaskImage: `url(/nftmask.svg)`,
        WebkitMaskOrigin: `center`,
        WebkitMaskRepeat: `no-repeat`,
        WebkitMaskSize: `cover`,
      },
    },
  },

  defaultVariants: {
    size: "md",
    nft: false,
    stacked: false,
  },
});

export type AvatarStyle = RecipeVariants<typeof avatarStyle>;
