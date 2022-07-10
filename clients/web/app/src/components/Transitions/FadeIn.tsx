import React from "react";
import { motion } from "framer-motion";

export const FadeIn = (props: { children: React.ReactNode }) => (
  <motion.div
    transition={{ duration: 0.1 }}
    variants={{ hide: { opacity: 0 }, show: { opacity: 1 } }}
    initial="hide"
    animate="show"
    exit="hide"
  >
    {props.children}
  </motion.div>
);
