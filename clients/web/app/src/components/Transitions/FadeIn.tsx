import React from "react";
import { motion } from "framer-motion";

export const FadeIn = ({
  delay,
  disabled,
  layout,
  fast,
  ...props
}: {
  children: React.ReactNode;
  delay?: boolean | number;
  fast?: boolean;
  disabled?: boolean;
  layout?: boolean;
}) =>
  disabled ? (
    <>{props.children}</>
  ) : (
    <motion.div
      layout={layout}
      transition={{
        duration: fast ? 0.16 : 0.33,
        delay: typeof delay === "number" ? delay : delay ? 0.1 : 0,
      }}
      variants={{ hide: { opacity: 0 }, show: { opacity: 1 } }}
      initial="hide"
      animate="show"
      exit="hide"
    >
      {props.children}
    </motion.div>
  );
