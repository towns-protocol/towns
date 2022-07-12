import React from "react";
import { motion } from "framer-motion";

export const FadeIn = ({
  delay,
  ...props
}: {
  children: React.ReactNode;
  delay?: boolean | number;
}) => (
  <motion.div
    transition={{
      duration: 1,
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
