import { AnimatePresence } from "framer-motion";
import React, { useEffect, useState } from "react";
import { FadeIn } from "@components/Transitions";
import { Button } from "@ui";
import { IconName } from "ui/components/Icon";
import { ButtonSpinner } from "./Spinner/ButtonSpinner";

export const LoginButton = (props: {
  label: string;
  loading?: boolean;
  icon?: IconName;
  onClick: () => void;
}) => {
  const hasSpinner = useDeferredLoading(props.loading);

  useEffect(() => {
    console.log(">>", props.label);
  }, [props.label]);

  return (
    <AnimatePresence exitBeforeEnter>
      <Button onClick={props.onClick}>
        <FadeIn key={props.label}>{props.label}</FadeIn>
        {hasSpinner && (
          <FadeIn delay>
            <ButtonSpinner />
          </FadeIn>
        )}
      </Button>
    </AnimatePresence>
  );
};

/**
 * to prevent gliches avoid showing spinner immediatly,
 * however avoid deferring when hiding
 **/
const useDeferredLoading = (isLoading?: boolean) => {
  const [deferredLoading, setDeferredLoading] = useState(isLoading);
  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        setDeferredLoading(true);
      }, 1000);
      return () => {
        clearTimeout(timeout);
      };
    } else {
      setDeferredLoading(false);
    }
  }, [isLoading]);

  return deferredLoading;
};
