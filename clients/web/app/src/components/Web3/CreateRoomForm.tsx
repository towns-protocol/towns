import { Visibility } from "matrix-js-sdk/lib/@types/partials";
import React, { useCallback, useMemo, useState } from "react";
import { CreateRoomInfo, Membership, useMatrixClient } from "use-matrix-client";
import { atoms } from "ui/styles/atoms/atoms.css";
import {
  Box,
  Button,
  Dropdown,
  Heading,
  Paragraph,
  Stack,
  TextField,
} from "@ui";

interface Props {
  onClick: (roomId: string, membership: Membership) => void;
}

export const CreateRoomForm = (props: Props) => {
  const VisibilityOptions = [Visibility.Private, Visibility.Public];
  const IsDmOptions = [false, true];

  const [roomName, setRoomName] = useState<string>("");
  const [visibility, setVisibility] = useState<Visibility>(Visibility.Public);
  const [isDM, setIsDM] = useState<string>(false.toString());
  const { createRoom } = useMatrixClient();

  const disableCreateButton = useMemo(
    () => roomName.length === 0,
    [roomName.length],
  );

  const onRoomNameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setRoomName(event.target.value);
    },
    [],
  );

  const onClickCreateRoom = useCallback(async () => {
    if (disableCreateButton) {
      console.log("please enter a room name");
      return;
    }
    const createRoomInfo: CreateRoomInfo = {
      roomName,
      visibility,
      isDirectMessage: isDM === "true",
    };
    const roomId = await createRoom(createRoomInfo);

    if (roomId) {
      console.log("room created with id", roomId);
      props.onClick(roomId, Membership.Join);
    }
  }, [createRoom, isDM, props, roomName, visibility, disableCreateButton]);

  return (
    <Stack padding gap="lg" minWidth="400">
      <Stack gap="lg">
        <TextField
          autoFocus
          background="level2"
          label="Room Name"
          secondaryLabel="(required)"
          description="This is your official space name that you own. Your space's URL will contain the same name."
          placeholder="Room Name"
          onChange={onRoomNameChange}
        />

        <Dropdown
          background="level2"
          label="Visibility"
          message=""
          options={VisibilityOptions.map((value) => ({
            label: value,
            value,
          }))}
          defaultValue={visibility}
          onChange={(value) => setVisibility(value as Visibility)}
        />

        <Dropdown
          background="level2"
          label="Is DM:"
          options={IsDmOptions.map((value) => ({
            label: String(value),
            value: String(value),
          }))}
          defaultValue={isDM}
          onChange={(value) => setIsDM(value)}
        />

        <Box gap="md">
          <Heading level={4}>Space URL</Heading>
          <Paragraph>This is what your official URL will look like</Paragraph>
          <Paragraph strong truncate size="md" display="inline-block">
            zion.xyz/
            <span className={atoms({ color: "gray2" })}>{roomName}</span>
          </Paragraph>
        </Box>
      </Stack>
      <Button size="input_lg" onClick={onClickCreateRoom}>
        Create
      </Button>
    </Stack>
  );
};
