import { useNavigate } from "react-router-dom";
import { Membership } from "use-matrix-client";
import { CreateSpaceForm } from "../components/CreateSpaceForm";

export const SpacesNew = () => {
  const navigate = useNavigate();
  const onSpaceCreated = (roomId: string, membership: Membership) => {
    navigate("/spaces/" + roomId);
  };
  return <CreateSpaceForm onClick={onSpaceCreated} />;
};
