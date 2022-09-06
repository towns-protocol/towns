import React, { useRef } from "react";
import { NavLink } from "react-router-dom";
import { RoomIdentifier } from "use-zion-client";
import { Reactions } from "@components/Reactions/Reactions";
import { Avatar, Box, BoxProps, ButtonText, Stack, Text } from "@ui";
import { useHover } from "hooks/useHover";
import { MessageReactions } from "hooks/useFixMeMessageThread";
import { MessageReplies } from "@components/Replies/MessageReplies";
import { MessageContextMenu } from "./MessageContextMenu";

type Props = {
  userId?: string | null;
  avatar?: string | React.ReactNode;
  name: string;
  condensed?: boolean;
  minimal?: boolean;
  channel?: string;
  reactions?: MessageReactions;
  replies?: number;
  date?: string;
  editing?: boolean;
  editable?: boolean;
  eventId?: string;
  channelId?: RoomIdentifier;
  spaceId?: RoomIdentifier;
  children?: React.ReactNode;
  onReaction?: (eventId: string, reaction: string) => void;
  rounded?: BoxProps["rounded"];
  padding?: BoxProps["padding"];
  background?: BoxProps["background"];
} & BoxProps;

export const Message = (props: Props) => {
  const {
    userId,
    eventId,
    avatar,
    condensed,
    name,
    channel,
    channelId,
    spaceId,
    editable: isEditable,
    editing: isEditing,
    minimal: isMinimal,
    onReaction,
    reactions,
    replies,
    date,
    children,
    ...boxProps
  } = props;

  const ref = useRef<HTMLDivElement>(null);

  const { isHover, onMouseEnter } = useHover(ref);

  return (
    <Stack
      horizontal
      ref={ref}
      gap="paragraph"
      onMouseEnter={onMouseEnter}
      {...boxProps}
      background={{
        default: isEditing || isHover ? "level2" : undefined,
        hover: "level2",
      }}
    >
      {/* left / avatar gutter */}
      {/* snippet: center avatar with name row by keeping the size of the containers equal  */}
      <Box minWidth="x6">
        {isMinimal ? (
          <></>
        ) : typeof avatar === "string" ? (
          <Avatar src={avatar} size="avatar_md" insetY="xxs" />
        ) : (
          avatar
        )}
      </Box>

      {/* right / main content */}
      <Stack grow gap={condensed ? "paragraph" : "md"} position="relative">
        {/* name & date top row */}
        {!isMinimal && (
          <Box horizontal gap="sm" alignItems="center" height="height_sm">
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
              <Text fontSize="md" color="gray2" as="span" textAlign="right">
                {date}
              </Text>
            )}
          </Box>
        )}
        <Stack pointerEvents="auto" fontSize="md" color="gray1" gap="md">
          {children}
        </Stack>

        {reactions ? (
          <Stack horizontal>
            <Reactions
              userId={userId}
              parentId={eventId}
              reactions={reactions}
              onReaction={onReaction}
            />
          </Stack>
        ) : null}

        {replies && eventId && (
          <Stack horizontal>
            <MessageReplies eventId={eventId} replyCount={replies} />
          </Stack>
        )}

        {spaceId && channelId && eventId && isHover && !isEditing && (
          <MessageContextMenu
            canReact
            canReply
            channelId={channelId}
            spaceId={spaceId}
            eventId={eventId}
            canEdit={isEditable}
          />
        )}
      </Stack>
    </Stack>
  );
};
