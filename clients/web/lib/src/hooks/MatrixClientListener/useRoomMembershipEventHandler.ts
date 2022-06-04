import { MatrixClient, MatrixEvent, RoomMember } from "matrix-js-sdk";
import { MutableRefObject, useCallback, useEffect, useState } from "react";
import { Membership } from "../../types/matrix-types";
import { useMatrixStore } from "../../store/use-matrix-store";

interface SyncMembership {
  roomId: string;
  userId: string;
  membership: Membership;
}

export const useRoomMembershipEventHandler = (
  matrixClientRef: MutableRefObject<MatrixClient | undefined>,
) => {
  const { joinRoom, leaveRoom, setRoom, updateMembership } = useMatrixStore();
  const [syncInfo, setSyncInfo] = useState<SyncMembership>();

  useEffect(() => {
    if (matrixClientRef.current && syncInfo) {
      const room = matrixClientRef.current.getRoom(syncInfo.roomId);
      if (room) {
        setRoom(room);
      }
      updateMembership(
        syncInfo.roomId,
        syncInfo.userId,
        syncInfo.membership,
        syncInfo.userId === matrixClientRef.current.getUserId(),
      );
    }
  }, [matrixClientRef, setRoom, syncInfo, updateMembership]);

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
          setSyncInfo({
            roomId: member.roomId,
            userId: member.userId,
            membership: member.membership as Membership,
          });
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
    [joinRoom, leaveRoom, matrixClientRef],
  );

  return handleRoomMembershipEvent;
};
