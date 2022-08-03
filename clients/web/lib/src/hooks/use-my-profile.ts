import { MatrixContext } from "../components/MatrixContextProvider";
import { UserEvent } from "matrix-js-sdk";
import { useContext, useEffect, useState } from "react";
import { MyProfile, ZionContext } from "../types/matrix-types";

export function useMyProfile(): MyProfile | undefined {
  const { client } = useContext<ZionContext>(MatrixContext);
  // const { myProfile } = useMatrixStore();
  const userId = client?.getUserId();
  const user = userId ? client?.getUser(userId) : undefined;
  const [myProfile, setMyProfile] = useState<MyProfile>();

  useEffect(() => {
    if (!user) {
      return;
    }
    const updateProfile = () => {
      setMyProfile({
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      });
    };
    user.on(UserEvent.DisplayName, updateProfile);
    user.on(UserEvent.AvatarUrl, updateProfile);
    updateProfile();
    return () => {
      user.removeListener(UserEvent.DisplayName, updateProfile);
      user.removeListener(UserEvent.AvatarUrl, updateProfile);
    };
  }, [user]);

  return myProfile;
}
