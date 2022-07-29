import { useMatrixStore } from "../store/use-matrix-store";
import { MyProfile } from "../types/matrix-types";

export function useMyProfile(): MyProfile | null {
  const { myProfile } = useMatrixStore();
  return myProfile;
}
