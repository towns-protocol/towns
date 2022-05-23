import { Visibility } from "matrix-js-sdk/lib/@types/partials";
import React, { useCallback, useMemo, useState } from "react";
import { CreateRoomInfo, Membership, useMatrixClient } from "use-matrix-client";
import { Button, Dropdown, Icon, Input } from "@ui";

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

  const renderDropdown = useCallback((selected?: string) => {
    return !selected ? (
      <></>
    ) : (
      <>
        {selected}
        <Icon type="down" size="square_inline" />
      </>
    );
  }, []);
  return (
    <>
      <h1>🚧 🚧 New Space 🚧 🚧</h1>
      <p>Room Name:</p>
      <Input placeholder="Type here..." onChange={onRoomNameChange} />
      <p>Visibility:</p>
      <Dropdown
        options={VisibilityOptions.map((value) => ({ label: value, value }))}
        renderSelected={renderDropdown}
        selected={visibility}
        onChange={(value) => setVisibility(value as Visibility)}
      />
      <p>Is DM:</p>
      <Dropdown
        options={IsDmOptions.map((value) => ({
          label: String(value),
          value: String(value),
        }))}
        renderSelected={renderDropdown}
        selected={isDM}
        onChange={(value) => setIsDM(value)}
      />
      <Button onClick={onClickCreateRoom}>Create</Button>
    </>
  );
};
