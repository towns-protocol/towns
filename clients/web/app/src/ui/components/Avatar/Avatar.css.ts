import { recipe, RecipeVariants } from "@vanilla-extract/recipes";
import { vars } from "ui/styles/vars.css";

export const avatarStyle = recipe({
  base: {
    backgroundSize: "cover",
    backgroundPosition: "center center",
  },
  variants: {
    size: {
      sm: {
        width: vars.dims.sm,
        height: vars.dims.sm,
        borderRadius: vars.borderRadius.xs,
      },
      md: {
        width: vars.dims.md,
        height: vars.dims.md,
        borderRadius: vars.borderRadius.sm,
      },
      lg: {
        width: vars.dims.xl,
        height: vars.dims.xl,
        borderRadius: vars.borderRadius.md,
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
  },
});

export type AvatarStyle = RecipeVariants<typeof avatarStyle>;
