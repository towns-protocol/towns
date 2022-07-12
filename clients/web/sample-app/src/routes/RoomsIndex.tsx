import { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RoomIdentifier, useRoom } from "use-matrix-client";
import { Chat } from "../components/Chat";

export const RoomsIndex = () => {
  const navigate = useNavigate();
  const { roomSlug } = useParams();
  const room = useRoom(roomSlug);

  const onClickLeaveRoom = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const goToRoom = useCallback(
    (roomId: RoomIdentifier) => {
      navigate("/rooms/" + roomId.slug);
    },
    [navigate],
  );

  return room ? (
    <Chat
      roomId={room.id}
      membership={room.membership}
      onClickLeaveRoom={onClickLeaveRoom}
      goToRoom={goToRoom}
    />
  ) : (
    <div>
      <h2>Room Not Found {roomSlug}</h2>
    </div>
  );
};
