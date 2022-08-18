import React from "react";
import { NavLink } from "react-router-dom";
import {
  Avatar,
  BackgroundImage,
  Box,
  BoxProps,
  Card,
  Heading,
  Paragraph,
  Stack,
} from "@ui";
import { fakeUserCache } from "data/UserData";
import { AvatarProps } from "ui/components/Avatar/Avatar";

type Props = {
  userId: string;
  children?: React.ReactNode;
  type?: "background";
  colSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  imageSrc: string;
  space: string;
  channel: string;
} & BoxProps;

export const Highlight = ({
  children,
  type,
  imageSrc,
  space,
  channel,
  colSpan = 3,
  userId,
  ...boxProps
}: Props) => (
  <Card
    colSpan={{
      mobile: 12,
      tablet: type === "background" ? 12 : 6,
      desktop: colSpan,
    }}
    background={{ lightMode: "default", darkMode: "level3" }}
    aspectRatio={type === "background" ? "2/1" : undefined}
    {...boxProps}
  >
    {type === "background" ? (
      <Stack grow color="onTone">
        {imageSrc && <BackgroundImage src={imageSrc} gradient="dark" />}
        <Box absoluteFill padding>
          <Box grow>
            <NamedAvatar userId={userId} />
          </Box>
          <Box gap="paragraph">
            <NavLink to="/spaces/bored-ape-yacht-club/announcements">
              <Heading>
                {space} {channel && `#${channel}`}
              </Heading>
            </NavLink>
            <>{children}</>
          </Box>
        </Box>
      </Stack>
    ) : (
      <>
        <Box aspectRatio="2/1">
          {imageSrc && <BackgroundImage src={imageSrc} />}
        </Box>
        <Stack grow gap="md" paddingY="sm" paddingX="sm">
          {space && (
            <Heading color="gray2">
              {space} {channel && `#${channel}`}
            </Heading>
          )}
          <Stack grow gap="line">
            {children}
          </Stack>

          <NamedAvatar
            userId={userId}
            size="avatar_sm"
            color="gray1"
            gap="xs"
          />
        </Stack>
      </>
    )}
  </Card>
);

const NamedAvatar = ({
  userId,
  size = "avatar_md",
  ...boxProps
}: {
  userId: string;
  size?: AvatarProps["size"];
} & Omit<BoxProps, "size">) => (
  <Stack horizontal alignItems="center" gap="sm" {...boxProps}>
    <Avatar border size={size} src={fakeUserCache[userId].avatarSrc} />
    <Paragraph size={size === "avatar_md" ? "md" : "sm"}>
      {fakeUserCache[userId].displayName}
    </Paragraph>
  </Stack>
);
