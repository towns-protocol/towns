import React, { forwardRef } from "react";
import { baseline } from "ui/styles/vars.css";
import { Box } from "../Box/Box";

const AvatarSize = {
  sm: baseline * 2.5,
  md: baseline * 3,
  lg: baseline * 7,
} as const;

type Props = {
  src?: string;
  nft?: boolean;
  size?: keyof typeof AvatarSize;
};

export const Avatar = (props: Props) => {
  if (props.nft) {
    return <NFTAvatar {...props} />;
  }
  return (
    <Box
      square="sm"
      aspectRatio="square"
      borderRadius="xs"
      style={{
        backgroundImage: `url(${props.src})`,
        backgroundSize: "cover",
        backgroundPosition: "center center",
      }}
    />
  );
};

export const NFTAvatar = forwardRef<SVGSVGElement, Props>((props, ref) => {
  const { size = "md" } = props;
  const id = props.src?.replace(/[^a-z]/gi, "") ?? "";
  return (
    <svg
      width={AvatarSize[size]}
      height={AvatarSize[size]}
      viewBox="0 0 58 59"
      fill="none"
      ref={ref}
    >
      <path
        d="M29.1944 1.53932L29 1.45732L28.8056 1.53932L9.71376 9.59388L9.52297 9.67438L9.44495 9.8662L1.53684 29.3116L1.46023 29.5L1.53684 29.6884L9.44495 49.1338L9.52297 49.3256L9.71376 49.4061L28.8056 57.4607L29 57.5427L29.1944 57.4607L48.2862 49.4061L48.477 49.3256L48.555 49.1338L56.4632 29.6884L56.5398 29.5L56.4632 29.3116L48.555 9.8662L48.477 9.67438L48.2862 9.59388L29.1944 1.53932Z"
        fill={`url(#${id})`}
        stroke="#E6ECF1"
      />
      <defs>
        <pattern
          id={`${id}`}
          patternContentUnits="objectBoundingBox"
          width="1"
          height="1"
        >
          <use
            xlinkHref={`#${props.src}`}
            transform="translate(0 -0.00464081) scale(0.00174825)"
          />
        </pattern>
        <image
          id={`${props.src}`}
          width="600"
          height="600"
          xlinkHref={props.src}
          preserveAspectRatio="xMidYMid slice"
        />
      </defs>
    </svg>
  );
});
