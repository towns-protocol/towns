import { Box, Divider, TextField, Theme, Typography } from "@mui/material";
import {
  Membership,
  RoomIdentifier,
  TimelineEvent,
  ZTEvent,
} from "use-zion-client";
import { useCallback, useMemo, useState } from "react";

import { AcceptInvitation } from "./AcceptInvitation";

interface Props {
  roomId: RoomIdentifier;
  timeline: TimelineEvent[];
  membership: string;
  sendMessage: (roomId: RoomIdentifier, message: string) => Promise<void>;
  joinRoom: (roomId: RoomIdentifier) => Promise<void>;
}

export function ChatMessages(props: Props): JSX.Element {
  const { timeline } = props;
  const [currentMessage, setCurrentMessage] = useState<string>("");
  const onTextChanged = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setCurrentMessage(event.target.value);
    },
    [],
  );

  const onKeyDown = useCallback(
    async (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" && currentMessage) {
        await props.sendMessage(props.roomId, currentMessage);
        setCurrentMessage("");
      }
    },
    [currentMessage, props],
  );

  const chatMessages = useMemo(() => {
    if (props.membership === Membership.Invite) {
      return (
        <AcceptInvitation roomId={props.roomId} joinRoom={props.joinRoom} />
      );
    } else if (props.membership === Membership.Join) {
      if (timeline.length > 0) {
        return timeline.map((m: TimelineEvent, index: number) => (
          <Typography
            key={index}
            display="block"
            variant="body1"
            component="span"
            sx={messageStyle}
          >
            {`${formatEvent(m)}`}
          </Typography>
        ));
      } else {
        return (
          <Typography
            display="block"
            variant="body1"
            component="span"
            sx={messageStyle}
          >
            There are no messages.
          </Typography>
        );
      }
    } else {
      return (
        <Typography
          display="block"
          variant="body1"
          component="span"
          sx={messageStyle}
        >
          We don't have membership information for this room
        </Typography>
      );
    }
  }, [props.membership, props.roomId, props.joinRoom, timeline]);

  return (
    <Box display="flex" flexGrow="1" flexDirection="column">
      {chatMessages}
      <Box display="flex" flexDirection="row" flexGrow={1} />
      {props.membership === Membership.Join ? (
        <>
          <Divider />
          <Box sx={messageStyle}>
            <TextField
              id="filled-basic"
              label="Type message here"
              variant="filled"
              fullWidth={true}
              onChange={onTextChanged}
              onKeyDown={onKeyDown}
              value={currentMessage}
            />
          </Box>
        </>
      ) : null}
    </Box>
  );
}

function formatEvent(event: TimelineEvent): string {
  switch (event.content?.kind) {
    case ZTEvent.RoomMessage:
      return `${event.content.sender.displayName}: ${event.content.body}`;
    default:
      return event.fallbackContent;
  }
}

const messageStyle = {
  padding: (theme: Theme) => theme.spacing(1),
  gap: (theme: Theme) => theme.spacing(1),
};
