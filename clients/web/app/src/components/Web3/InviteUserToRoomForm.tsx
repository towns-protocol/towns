import React, { useCallback, useState } from "react";
import { Button, Input } from "@ui";

interface Props {
  spaceName: string;
  spaceId: string;
  onInviteClicked: (spaceId: string, inviteeUserId: string) => void;
  onCancelClicked: () => void;
}

export const InviteUserToRoomForm = (props: Props) => {
  const [inviteeUserId, setInviteeUserId] = useState<string>("");

  const onChangeUserId = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setInviteeUserId(event.target.value);
    },
    [],
  );
  const onInviteClicked = useCallback(async () => {
    console.log("invite clicked", inviteeUserId);
    if (inviteeUserId === "") {
      console.log("error, invitee is empty");
      return;
    }
    props.onInviteClicked(props.spaceId, inviteeUserId);
  }, [inviteeUserId, props]);

  return (
    <>
      <h1> Invite user to join space "{props.spaceName}" </h1>
      <p>Invitee user id:</p>
      <Input placeholder="@userId:homeServer" onChange={onChangeUserId} />
      <Button onClick={onInviteClicked}>INVITE</Button>
      <Button onClick={props.onCancelClicked}>CANCEL</Button>
    </>
  );
};
