import { useSpaceContext } from "../components/SpaceContextProvider";
import { useTimeline } from "./use-timeline";

export function useSpaceTimeline() {
  const { spaceRoom } = useSpaceContext();
  return useTimeline(spaceRoom);
}
