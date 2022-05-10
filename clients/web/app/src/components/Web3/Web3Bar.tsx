import React from "react";
import { useMatrixStore } from "use-matrix-client";
import { Stack } from "@ui";
import { Login } from "@components/Web3/Login"

export const Web3Bar = () => {
    const { isAuthenticated } = useMatrixStore();
    return (
        <Stack
            borderBottom
            direction="row"
            shrink={false}
            height="height_xl"
            paddingX="md"
            background="level1"
            alignItems="center"
            gap="md"
            color="gray2"
            position="sticky"
            style={{ top: 0, zIndex: 10 }}
        >
            {isAuthenticated ? (
                "You're Authenticated to Web3!"
            ) : (
                <Login />
            )}
        </Stack>
    );
}
