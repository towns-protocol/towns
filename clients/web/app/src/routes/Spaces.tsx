import React from "react";
import { Outlet } from "react-router";
import { useParams } from "react-router-dom";
import { NavContainer } from "@components/MainNav/MainNav";
import { MainAction } from "@components/MainNavActions/MainNavActions";
import {
  SpaceNavItem,
  mockSpaces,
} from "@components/SpaceNavItem/SpaceNavItem";
import { Box, Paragraph } from "@ui";

export const Spaces = () => {
  const { spaceId } = useParams();
  const space = mockSpaces.find((s) => s.id === spaceId) ?? mockSpaces[0];
  return (
    // <Box grow direction="row">
    <>
      <NavContainer>
        <MainAction icon="back" link="/" id="" label="Back" />
        {space && (
          <SpaceNavItem
            exact
            compact
            id={space.id}
            avatar={space.avatar}
            name={space.name}
          />
        )}
        <MainAction
          compact
          icon="threads"
          link={`/spaces/${spaceId}/threads`}
          id="threads"
          label="Threads"
        />
        <MainAction
          compact
          icon="at"
          id="mentions"
          label="Mentions"
          link={`/spaces/${spaceId}/mentions`}
        />
        {channelGroups.map((group) => (
          <>
            <Box
              paddingX="sm"
              height="md"
              paddingY="xs"
              justifyContent="end"
              display={{ tablet: "none", desktop: "flex" }}
            >
              <Paragraph color="gray2" textTransform="uppercase">
                {group.label}
              </Paragraph>
            </Box>
            {group.tags.map((tag) => (
              <MainAction
                compact
                key={tag.id}
                icon="tag"
                highlight={tag.highlight}
                link={`/spaces/${spaceId}/${tag.id}`}
                id="threads"
                label={tag.id}
              />
            ))}
          </>
        ))}
      </NavContainer>
      <Box grow="x9">
        <Outlet />
      </Box>
    </>
    // </Box>
  );
};

const channelGroups: ChannelGroup[] = [
  {
    label: "ape chat",
    tags: [
      { id: "general" },
      { id: "gm-gn", highlight: true },
      { id: "trade-sell", highlight: true },
      { id: "show-room", highlight: true },
      { id: "floor-talk" },
      { id: "introduce-yourself" },
    ],
  },
  {
    label: "off topic",
    tags: [
      { id: "artist-hangout", highlight: true },
      { id: "crypto-talk", highlight: true },
    ],
  },
  {
    label: "members only",
    tags: [
      { id: "all-holders", private: true, highlight: false },
      { id: "hodlers-meetup", private: true },
      { id: "rare-apes-only", private: true },
    ],
  },
  {
    label: "international",
    tags: [
      { id: "中文" },
      { id: "español", highlight: true },
      { id: "français" },
      { id: "한국어" },
    ],
  },
];

type ChannelGroup = {
  label: string;
  tags: { id: string; private?: boolean; highlight?: boolean }[];
};
