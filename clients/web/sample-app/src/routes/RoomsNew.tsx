import { useNavigate } from "react-router-dom";
import { Membership } from "use-matrix-client";
import { CreateRoomForm } from "../components/CreateRoomForm";

export const RoomsNew = () => {
  const navigate = useNavigate();
  const onClickRoom = (roomId: string, membership: Membership) => {
    navigate("/rooms/" + roomId);
  };
  return <CreateRoomForm onClick={onClickRoom} />;
};
