import { Box, Divider, TextField, Theme, Typography } from "@mui/material";
import {
  Membership,
  RoomMessage,
  getShortUsername,
  useMatrixStore,
  RoomIdentifier,
} from "use-matrix-client";
import { useCallback, useMemo, useState } from "react";

import { AcceptInvitation } from "./AcceptInvitation";

interface Props {
  roomId: RoomIdentifier;
  membership: string;
  sendMessage: (roomId: RoomIdentifier, message: string) => Promise<void>;
  joinRoom: (roomId: RoomIdentifier) => Promise<void>;
}

export function ChatMessages(props: Props): JSX.Element {
  const { allMessages } = useMatrixStore();
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

  const roomMessages = useMemo(() => {
    if (allMessages) {
      const messages = allMessages[props.roomId.slug];
      if (messages && messages.length > 0) {
        console.log("messages", messages);
        return messages;
      }
    }

    return undefined;
  }, [allMessages, props.roomId]);

  const messagesLength = useMemo(
    () => roomMessages?.length,
    [roomMessages?.length],
  );

  const chatMessages = useMemo(() => {
    if (props.membership === Membership.Invite) {
      return (
        <AcceptInvitation roomId={props.roomId} joinRoom={props.joinRoom} />
      );
    } else if (roomMessages && messagesLength && props.roomId) {
      if (roomMessages.length > 0) {
        return roomMessages.map((m: RoomMessage, index: number) => (
          <Typography
            key={index}
            display="block"
            variant="body1"
            component="span"
            sx={messageStyle}
          >
            {`${getShortUsername(m.sender)}: ${m.body}`}
          </Typography>
        ));
      } else {
        <Typography
          display="block"
          variant="body1"
          component="span"
          sx={messageStyle}
        >
          There are no messages.
        </Typography>;
      }
    }
  }, [
    props.membership,
    props.roomId,
    props.joinRoom,
    roomMessages,
    messagesLength,
  ]);

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

const messageStyle = {
  padding: (theme: Theme) => theme.spacing(1),
  gap: (theme: Theme) => theme.spacing(1),
};
