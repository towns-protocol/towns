import React, { Suspense } from "react";
import { Box } from "@ui";

type Props = {
  children?: React.ReactNode;
};

export const SuspenseLoader = (props: Props) => (
  <Suspense fallback={<Fallback />}>{props.children}</Suspense>
);

const Fallback = () => <Box absoluteFill centerContent />;
