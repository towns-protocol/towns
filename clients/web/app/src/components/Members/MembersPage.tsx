import React from "react";
import { Avatar, Box, Grid, Paragraph } from "@ui";
import { fakeUsers } from "data/UserData";

export const MembersPage = () => {
  const users = fakeUsers.slice(0, 15);
  return (
    <Grid columnMinSize="140px" columnMaxSize="220px" flexWrap="wrap">
      {users.map((u) => (
        <Box gap key={u.id} colSpan={1}>
          <Box centerContent aspectRatio="1/1">
            <Avatar circle src={u.avatarSrc} size="avatar_xl" />
          </Box>
          <Box textAlign="center" gap="paragraph">
            <Paragraph textAlign="center" size="sm">
              {u.displayName}
            </Paragraph>
            <Paragraph textAlign="center" color="gray2" size="sm">
              {u.address}
            </Paragraph>
            <Box horizontal centerContent>
              <Box
                border
                paddingY="xs"
                paddingX="sm"
                rounded="sm"
                background="level2"
              >
                <Paragraph size="sm">{u.role}</Paragraph>
              </Box>
            </Box>
          </Box>
        </Box>
      ))}
    </Grid>
  );
};
