import { EmojiData } from "emoji-mart";
import React, {
  MutableRefObject,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { NavLink } from "react-router-dom";
import { throttle } from "throttle-debounce";
import {
  Avatar,
  Box,
  BoxProps,
  ButtonText,
  RootLayerContext,
  Stack,
  Text,
} from "@ui";
import { Reactions } from "@components/Reactions/Reactions";
import { Replies } from "@components/Replies/Replies";
import { atoms } from "ui/styles/atoms.css";
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
  editable?: boolean;
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
  editable: isEditable,
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

  const onSelectReaction = (data: EmojiData) => {
    // sendReaction
  };

  const onEdit = () => {
    id && onEditMessage?.(id);
  };

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
        <Box horizontal gap="sm" alignItems="center" height="height_sm">
          {/* display name */}
          <Text
            truncate
            fontSize="md"
            color={name?.match(/\.eth$/) ? "etherum" : "gray1"}
            as="span"
          >
            {name}
            <span className={atoms({ fontSize: "sm", color: "gray2" })}>
              {" "}
              {id?.substring(0, 10)}
            </span>
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
          onDoubleClick={!isEditing && isEditable ? onEdit : undefined}
        >
          {children}
        </Box>

        {reactions ? (
          <Stack horizontal>
            <Reactions reactions={reactions} userReaction={userReaction} />
          </Stack>
        ) : null}
        {replies && (
          <Box direction="row">
            <Replies replies={replies} />
          </Box>
        )}
        {isHover && !isEditing && (
          <MessageContextMenu
            onOpenThread={onSelectThread}
            onEdit={isEditable ? onEdit : undefined}
            onSelectReaction={onSelectReaction}
          />
        )}
      </Stack>
    </Stack>
  );
};

/**
 * similar to https://github.com/mjsarfatti/use-mouse-leave but taking into
 * account child elements and modal container
 */
const useHover = (ref: MutableRefObject<HTMLDivElement | null>) => {
  const [isHover, setIsHover] = useState(false);

  const onMouseEnter = useCallback(() => {
    setIsHover(true);
  }, []);

  const { rootLayerRef } = useContext(RootLayerContext);

  useEffect(() => {
    if (!isHover) {
      return;
    }
    const onMouseMove = throttle(50, (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!ref.current?.contains(el) && !rootLayerRef?.current?.contains(el)) {
        setIsHover(false);
      }
    });
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("click", onMouseMove);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("click", onMouseMove);
    };
  }, [ref, rootLayerRef, isHover]);

  return { isHover, onMouseEnter };
};
