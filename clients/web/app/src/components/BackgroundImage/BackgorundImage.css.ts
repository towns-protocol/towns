import { RecipeVariants, recipe } from "@vanilla-extract/recipes";

export const backgroundImageContainerClassName = recipe({
  base: {},
  defaultVariants: {},
  variants: {
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
            opacity: 0.5,
            backgroundImage: `linear-gradient(180deg, rgba(83, 80, 86, 0) 42.71%, rgba(44, 43, 45, 0.87) 77.78%)`,
          },
        },
      },
    },
  },
});

export const backgroundImageClassName = recipe({
  base: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center center",
  },
  defaultVariants: {
    size: "cover",
  },
  variants: {
    size: {
      cover: {
        objectFit: "cover",
      },
      contain: {
        objectFit: "contain",
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
            opacity: 1,
            backgroundImage: `linear-gradient(180deg, rgba(83, 80, 86, 0) 42.71%, rgba(44, 43, 45, 0.87) 77.78%)`,
          },
        },
      },
    },
  },
});

export type BackgroundImageVariantProps = RecipeVariants<
  typeof backgroundImageClassName
>;

export type BackgroundImageContainerVariantProps = RecipeVariants<
  typeof backgroundImageContainerClassName
>;
