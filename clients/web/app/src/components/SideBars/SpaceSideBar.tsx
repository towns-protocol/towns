import React from "react";
import { ActionNavItem } from "@components/NavItem/ActionNavItem";
import { SpaceNavItem } from "@components/NavItem/SpaceNavItem";
import { Box, Paragraph } from "@ui";
import { SpaceData } from "data/SpaceData";
import { NavContainer } from "./_SideBar";

type Props = {
  space: SpaceData;
};

export const SpaceSideBar = (props: Props) => {
  const { space } = props;

  return (
    <NavContainer>
      <ActionNavItem icon="back" link="/" id="" label="Back" />
      {space && (
        <SpaceNavItem
          exact
          compact
          id={space.id}
          avatar={space.avatarSrc}
          name={space.name}
        />
      )}
      <ActionNavItem
        compact
        icon="threads"
        link={`/spaces/${space.id}/threads`}
        id="threads"
        label="Threads"
      />
      <ActionNavItem
        compact
        icon="at"
        id="mentions"
        label="Mentions"
        link={`/spaces/${space.id}/mentions`}
      />
      {space.channels.map((group) => (
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
            <ActionNavItem
              compact
              key={tag.id}
              icon="tag"
              highlight={tag.highlight}
              link={`/spaces/${space.id}/${tag.id}`}
              id="threads"
              label={tag.id}
            />
          ))}
        </>
      ))}
    </NavContainer>
  );
};
