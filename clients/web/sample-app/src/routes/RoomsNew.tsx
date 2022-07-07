import { useNavigate } from "react-router-dom";
import { Membership, RoomIdentifier } from "use-matrix-client";
import { CreateRoomForm } from "../components/CreateRoomForm";

export const RoomsNew = () => {
  const navigate = useNavigate();
  const onClickRoom = (roomId: RoomIdentifier, membership: Membership) => {
    navigate("/rooms/" + roomId.slug);
  };
  return <CreateRoomForm onClick={onClickRoom} />;
};
