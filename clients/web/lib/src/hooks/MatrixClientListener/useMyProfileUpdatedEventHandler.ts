import { MatrixClient } from "matrix-js-sdk";
import { MutableRefObject, useCallback } from "react";
import { useMatrixStore } from "../../store/use-matrix-store";

export const useMyProfileUpdatedEventHandler = (
  matrixClientRef: MutableRefObject<MatrixClient | undefined>,
) => {
  const { setMyProfile, userId } = useMatrixStore();

  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
  const handleMyProfileUpdated = useCallback(() => {
    if (!matrixClientRef.current) {
      console.log(`matrixClientRef.current is undefined`);
      return;
    }
    if (!userId) {
      console.log(`userId is undefined`);
      return;
    }

    // possible that sometimes we want to fetch this data again, but of course
    // the sdk won't cache the response... good luck with that...
    // const profile = matrixClientRef.current.getProfileInfo(userId);
    // see: https://github.com/matrix-org/matrix-react-sdk/blob/c257bc3f7a3bf8db92c621ea1473d50706464be1/src/stores/OwnProfileStore.ts

    const user = matrixClientRef.current.getUser(userId);
    if (!user) {
      console.log("matrix user is undefined");
      return;
    }
    console.log("handleMyProfileUpdated", userId, {
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    });
    setMyProfile({
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      fetchedAt: new Date(),
    });
  }, [matrixClientRef, setMyProfile, userId]);

  return handleMyProfileUpdated;
};
