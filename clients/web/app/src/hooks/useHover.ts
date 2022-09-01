import {
  MutableRefObject,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { throttle } from "throttle-debounce";
import { RootLayerContext } from "@ui";

/**
 * similar to https://github.com/mjsarfatti/use-mouse-leave but taking into
 * account child elements and modal container
 */
export const useHover = (ref: MutableRefObject<HTMLDivElement | null>) => {
  const [isHover, setIsHover] = useState(false);

  const onMouseEnter = useCallback(() => {
    setIsHover(true);
  }, []);

  const { rootLayerRef } = useContext(RootLayerContext);

  useEffect(() => {
    if (!isHover) {
      return;
    }
    const onMouseMove = throttle(50, (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!ref.current?.contains(el) && !rootLayerRef?.current?.contains(el)) {
        setIsHover(false);
      }
    });

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("click", onMouseMove);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("click", onMouseMove);
    };
  }, [ref, rootLayerRef, isHover]);

  return { isHover, onMouseEnter };
};
