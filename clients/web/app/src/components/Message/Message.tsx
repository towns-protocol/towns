import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { Reactions } from "@components/Reactions/Reactions";
import { Replies } from "@components/Replies/Replies";
import { Avatar, Box, BoxProps, ButtonText, Stack, Text } from "@ui";
import { MessageContextMenu } from "./MessageContextMenu";

type Props = {
  avatar: string | React.ReactNode;
  name: string;
  condensed?: boolean;
  channel?: string;
  reactions?: { [key: string]: number };
  userReaction?: string;
  replies?: { userIds: number[]; fakeLength?: number };
  date?: string;
  editing?: boolean;
  onSelectMessage?: (id: string) => void;
  onEditMessage?: (id: string) => void;
  id?: string;
  children?: React.ReactNode;
  rounded?: BoxProps["rounded"];
  padding?: BoxProps["padding"];
  background?: BoxProps["background"];
} & BoxProps;

export const Message = ({
  id,
  avatar,
  condensed,
  name,
  channel,
  editing: isEditing,
  reactions,
  replies,
  userReaction,
  date,
  children,
  onEditMessage,
  onSelectMessage,
  ...boxProps
}: Props) => {
  const onSelectThread = () => {
    id && onSelectMessage?.(id);
  };

  const onEdit = () => {
    id && onEditMessage?.(id);
  };
  const [showMenu, setShowMenu] = useState(false);
  const onMouseOver = () => {
    setShowMenu(true);
  };
  const onMouseOut = () => {
    setShowMenu(false);
  };
  return (
    <Stack
      horizontal
      gap="paragraph"
      {...boxProps}
      background={{
        default: isEditing ? "level2" : undefined,
        hover: "level2",
      }}
      onMouseOver={onMouseOver}
      onMouseLeave={onMouseOut}
    >
      {/* left / avatar gutter */}
      {/* snippet: center avatar with name row by keeping the size of the containers equal  */}
      <Box>
        {typeof avatar === "string" ? (
          <Avatar src={avatar} size="avatar_lg" />
        ) : (
          avatar
        )}
      </Box>
      {/* right / main content */}
      <Stack grow gap={condensed ? "paragraph" : "md"} position="relative">
        {/* name & date top row */}
        <Box direction="row" gap="sm" alignItems="center" height="height_sm">
          {/* display name */}
          <Text
            truncate
            fontSize="md"
            color={name?.match(/\.eth$/) ? "etherum" : "gray1"}
            as="span"
          >
            {name}
          </Text>
          {/* channel */}
          {channel && (
            <NavLink to={channel}>
              <ButtonText color="default" as="span">
                #{channel}
              </ButtonText>
            </NavLink>
          )}
          {/* date, alignment tbc depending on context */}
          {date && (
            <Text fontSize="sm" color="gray2" as="span" textAlign="right">
              {date}
            </Text>
          )}
        </Box>

        <Box
          pointerEvents="auto"
          fontSize="md"
          color="default"
          onClick={!isEditing ? onEdit : undefined}
        >
          {children}
        </Box>
        {reactions && (
          <Box direction="row">
            <Reactions reactions={reactions} userReaction={userReaction} />
          </Box>
        )}
        {replies && (
          <Box direction="row">
            <Replies replies={replies} />
          </Box>
        )}
        {showMenu && !isEditing && (
          <Box position="topRight">
            <MessageContextMenu onOpenThread={onSelectThread} onEdit={onEdit} />
          </Box>
        )}
      </Stack>
    </Stack>
  );
};
