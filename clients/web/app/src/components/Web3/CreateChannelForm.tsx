import React, { useCallback, useMemo, useState } from "react";
import {
  CreateRoomInfo,
  Membership,
  RoomIdentifier,
  RoomVisibility,
  useMatrixClient,
} from "use-matrix-client";
import { Button, Dropdown, Stack, TextField } from "@ui";

interface Props {
  parentSpaceId: RoomIdentifier;
  onClick: (roomId: RoomIdentifier, membership: Membership) => void;
}

export const CreateChannelForm = (props: Props) => {
  const VisibilityOptions = [RoomVisibility.Private, RoomVisibility.Public];

  const [roomName, setRoomName] = useState<string>("");
  const [visibility, setVisibility] = useState<RoomVisibility>(
    RoomVisibility.Public,
  );
  const { createRoom } = useMatrixClient();
  const { onClick, parentSpaceId } = props;

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
      console.log("please enter a channel name");
      return;
    }
    const createRoomInfo: CreateRoomInfo = {
      roomName,
      visibility,
      isDirectMessage: false,
      parentSpaceId: parentSpaceId,
    };
    const roomId = await createRoom(createRoomInfo);

    if (roomId) {
      console.log("channel created with id", roomId);
      onClick(roomId, Membership.Join);
    }
  }, [
    disableCreateButton,
    roomName,
    visibility,
    parentSpaceId,
    createRoom,
    onClick,
  ]);

  return (
    <Stack padding gap="lg" minWidth="400">
      <Stack gap="lg">
        <TextField
          autoFocus
          background="level2"
          label="Channel Name"
          secondaryLabel="(required)"
          description="This is a channel within your space. This channel will have a unique url."
          placeholder="Channel Name"
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
          onChange={(value) => setVisibility(value as RoomVisibility)}
        />
      </Stack>
      <Button
        size="input_lg"
        disabled={disableCreateButton}
        onClick={onClickCreateRoom}
      >
        Create
      </Button>
    </Stack>
  );
};
