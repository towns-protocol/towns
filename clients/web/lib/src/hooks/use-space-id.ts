import { useSpaceContext } from "../components/SpaceContextProvider";

/// returns default space id if no space slug is provided
export function useSpaceId() {
  const { spaceId } = useSpaceContext();
  return spaceId;
}
