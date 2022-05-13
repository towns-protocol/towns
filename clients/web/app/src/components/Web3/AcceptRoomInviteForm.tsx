import React from "react";
import { Button } from "@ui";

interface Props {
  spaceName: string;
  onAcceptInviteClicked: () => void;
  onDeclineInviteClicked: () => void;
}

export const AcceptRoomInviteForm = (props: Props) => {
  return (
    <>
      <h1> You've been invited to join space "{props.spaceName}" </h1>
      <Button onClick={props.onAcceptInviteClicked}>ACCEPT</Button>
      <Button onClick={props.onDeclineInviteClicked}>DECLINE</Button>
    </>
  );
};
