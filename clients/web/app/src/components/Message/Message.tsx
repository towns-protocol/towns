import { format } from "date-fns";
import React, { useRef } from "react";
import { NavLink } from "react-router-dom";
import { Channel, RoomIdentifier } from "use-zion-client";
import { Reactions } from "@components/Reactions/Reactions";
import { MessageReplies } from "@components/Replies/MessageReplies";
import { Avatar, Box, BoxProps, ButtonText, Stack, Text } from "@ui";
import { MessageReactions } from "hooks/useFixMeMessageThread";
import { useHover } from "hooks/useHover";
import { AvatarAtoms } from "ui/components/Avatar/Avatar.css";
import { MessageContextMenu } from "./MessageContextMenu";

type Props = {
  userId?: string | null;
  avatar?: string;
  avatarSize?: AvatarAtoms["size"];
  name: string;
  condensed?: boolean;
  minimal?: boolean;
  messageSourceAnnotation?: string;
  reactions?: MessageReactions;
  replies?: number;
  timestamp?: number;
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
    avatarSize = "avatar_md",
    condensed,
    name,
    messageSourceAnnotation,
    channelId,
    spaceId,
    editable: isEditable,
    editing: isEditing,
    minimal: isMinimal,
    onReaction,
    reactions,
    replies,
    timestamp,
    children,
    ...boxProps
  } = props;

  const ref = useRef<HTMLDivElement>(null);

  const { isHover, onMouseEnter } = useHover(ref);

  const date = timestamp ? format(timestamp, "h:mm a") : undefined;

  return (
    <Stack
      horizontal
      ref={ref}
      onMouseEnter={onMouseEnter}
      {...boxProps}
      background={{
        default: isEditing || isHover ? "level2" : undefined,
      }}
    >
      {/* left / avatar gutter */}
      {/* snippet: center avatar with name row by keeping the size of the containers equal  */}
      <Box minWidth="x7">
        {!isMinimal ? (
          <Avatar src={avatar} size={avatarSize} insetY="none" />
        ) : (
          <></>
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

            {/* date, alignment tbc depending on context */}
            {date && (
              <Text fontSize="sm" color="gray2" as="span" textAlign="right">
                {date}
              </Text>
            )}
          </Box>
        )}
        <Stack gap="paragraph">
          <Stack fontSize="md" color="gray1" gap="md">
            {children}
          </Stack>

          {/* channel */}
          {messageSourceAnnotation && (
            <ButtonText color="gray2" as="span">
              {messageSourceAnnotation}
            </ButtonText>
          )}

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
        </Stack>
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
