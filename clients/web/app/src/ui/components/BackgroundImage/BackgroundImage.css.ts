import { RecipeVariants, recipe } from "@vanilla-extract/recipes";

export const BackgroundContainerStyle = recipe({
  base: {
    backgroundPosition: "center",
  },
  defaultVariants: {},
  variants: {
    size: {
      cover: {
        backgroundSize: "cover",
      },
      contain: {
        backgroundSize: "contain",
      },
    },
    gradient: {
      dark: {
        selectors: {
          "&:after": {
            content: "",
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundImage: `linear-gradient(180deg, rgba(255, 80, 86, 0) 50%, rgba(44, 43, 45, 0.6) 80%)`,
          },
        },
      },
    },
    overlay: {
      dark: {
        selectors: {
          "&:before": {
            content: "",
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: `rgba(0, 0, 0, 0.6)`,
          },
        },
      },
    },
  },
});

export type BackgroundVariantProps = RecipeVariants<
  typeof BackgroundContainerStyle
>;
