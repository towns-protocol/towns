import { Visibility } from "matrix-js-sdk/lib/@types/partials";
import React, { useCallback, useMemo, useState } from "react";
import { CreateRoomInfo, Membership, useMatrixClient } from "use-matrix-client";
import { ContextBar } from "@components/ContextBar";
import { Box, Button, Dropdown, Stack, TextField } from "@ui";

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
    <>
      <ContextBar>New Space </ContextBar>
      <Box grow centerContent>
        <Stack padding gap="lg" minWidth="400">
          <Stack gap="lg">
            <TextField
              label="Room Name"
              secondaryLabel="(required)"
              placeholder="Type here..."
              onChange={onRoomNameChange}
            />

            <Dropdown
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
              label="Is DM:"
              options={IsDmOptions.map((value) => ({
                label: String(value),
                value: String(value),
              }))}
              defaultValue={isDM}
              onChange={(value) => setIsDM(value)}
            />
          </Stack>
          <Button size="input_lg" icon="plus" onClick={onClickCreateRoom}>
            Create
          </Button>
        </Stack>
      </Box>
    </>
  );
};
