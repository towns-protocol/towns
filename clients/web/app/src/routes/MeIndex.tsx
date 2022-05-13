import React from "react";
import { useMatrixStore } from "use-matrix-client";
import { Button, Heading } from "@ui";
import { Card } from "ui/components/Card/Card";
import { Stack } from "ui/components/Stack/Stack";
import { useRootTheme } from "hooks/useRootTheme";
import { LiquidContainer } from "./SpacesIndex";

export const MeIndex = () => {
  const { toggleTheme } = useRootTheme({
    useDefaultOSTheme: false,
    ammendHTMLBody: true,
  });
  const { isAuthenticated, username, userId } = useMatrixStore();
  return (
    <Stack horizontal grow justifyContent="center" paddingY="lg" basis="1200">
      <LiquidContainer fullbleed position="relative">
        <Stack grow gap="md">
          <Heading level={2}>Welcome </Heading>
          <Card colSpan={12} padding="md" background="default">
            <p>
              IsAuthenticated:{" "}
              <strong>{isAuthenticated ? "true" : "false"}</strong>
            </p>
          </Card>
          <Card colSpan={12} padding="md" background="default">
            <p>
              UserName: <strong>{username}</strong>
            </p>
          </Card>
          <Card colSpan={12} padding="md" background="default">
            <p>
              UserId: <strong>{userId}</strong>
            </p>
          </Card>
          <Card colSpan={12} padding="md" background="default">
            <Button onClick={toggleTheme}>Toggle Theme</Button>
          </Card>
        </Stack>
      </LiquidContainer>
    </Stack>
  );
};
