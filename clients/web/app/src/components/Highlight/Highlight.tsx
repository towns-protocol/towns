import React from "react";
import { NavLink } from "react-router-dom";
import { Card } from "ui/components/Card/Card";
import { Avatar, BackgroundImage, Box, BoxProps, Paragraph, Stack } from "@ui";
import { fakeUserCache } from "data/UserData";

type Props = {
  userId: string;
  children?: React.ReactNode;
  type?: "background";
  colSpan?: 1 | 2 | 3 | 4;
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
  colSpan = 1,
  userId,
  ...boxProps
}: Props) => (
  <Card
    colSpan={{ mobile: 4, desktop: colSpan }}
    background={{ lightMode: "default", darkMode: "level2" }}
    aspectRatio={type === "background" ? "2/1" : undefined}
    {...boxProps}
  >
    {type === "background" ? (
      <Stack grow>
        {imageSrc && <BackgroundImage src={imageSrc} gradient="dark" />}
        <Box absoluteFill padding>
          <Box grow>
            <Avatar
              border
              circle
              size="md"
              src={fakeUserCache[userId].avatarSrc}
            />
          </Box>
          <Box gap="xs" color="onTone">
            <NavLink to="/spaces/bored-ape-yacht-club/announcements">
              <Paragraph strong size="sm">
                {space} {channel && `#${channel}`}
              </Paragraph>
            </NavLink>
            <>{children}</>
          </Box>
        </Box>
      </Stack>
    ) : (
      <>
        <Box border aspectRatio="2/1">
          {imageSrc && <BackgroundImage src={imageSrc} />}
        </Box>
        <Stack grow gap="sm" paddingY="sm" paddingX="xs">
          {space && (
            <Paragraph color="gray2" fontWeight="strong">
              {space} {channel && `#${channel}`}
            </Paragraph>
          )}
          <Stack grow color="gray1">
            {children}
          </Stack>
          <Stack direction="row" gap="xs" alignItems="center">
            <Avatar circle size="xs" src={fakeUserCache[userId].avatarSrc} />
            <Paragraph color="gray1">
              {fakeUserCache[userId].displayName}
            </Paragraph>
          </Stack>
        </Stack>
      </>
    )}
  </Card>
);
