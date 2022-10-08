import { useZionContext } from "../components/ZionContextProvider";
import { UserEvent } from "matrix-js-sdk";
import { useEffect, useState } from "react";
import { MyProfile } from "../types/matrix-types";

export function useMyProfile(): MyProfile | undefined {
  const { client } = useZionContext();
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
        userId: user.userId,
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
