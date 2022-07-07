import { MatrixClient, MatrixEvent, RoomMember } from "matrix-js-sdk";
import { MutableRefObject, useCallback } from "react";
import { Membership } from "../../types/matrix-types";
import { useMatrixStore } from "../../store/use-matrix-store";

export const useRoomMembershipEventHandler = (
  matrixClientRef: MutableRefObject<MatrixClient | undefined>,
) => {
  const { joinRoom, leaveRoom, setRoom, updateMembership } = useMatrixStore();

  const handleRoomMembershipEvent = useCallback(
    (event: MatrixEvent, member: RoomMember) => {
      console.log(`RoomMember.membership event`, {
        eventType: event.getType(),
        userId: member.userId,
        roomId: member.roomId,
        membership: member.membership,
      });
      if (!matrixClientRef.current) {
        console.log(`matrixClientRef.current is undefined`);
        return;
      }
      switch (member.membership) {
        case Membership.Invite: {
          const room = matrixClientRef.current.getRoom(member.roomId);
          if (room) {
            setRoom(room);
          }
          updateMembership(
            member.roomId,
            member.userId,
            member.membership as Membership,
            member.userId === matrixClientRef.current.getUserId(),
          );
          break;
        }
        case Membership.Join: {
          joinRoom(
            member.roomId,
            member.userId,
            member.userId === matrixClientRef.current.getUserId(),
          );
          break;
        }
        case Membership.Leave: {
          leaveRoom(
            member.roomId,
            member.userId,
            member.userId === matrixClientRef.current.getUserId(),
          );
          break;
        }
        default:
          console.log("Unhandled membership event", event);
          break;
      }
    },
    [joinRoom, leaveRoom, matrixClientRef, setRoom, updateMembership],
  );

  return handleRoomMembershipEvent;
};
