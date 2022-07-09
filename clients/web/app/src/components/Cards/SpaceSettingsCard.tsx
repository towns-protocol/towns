import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMatrixClient } from "use-matrix-client";
import { Avatar, Box, BoxProps, Card, Divider, Heading, Stack } from "@ui";

type Props = { spaceId: string };

export const SpaceSettingsCard = (props: Props) => {
  const { spaceId } = props;

  const navigate = useNavigate();

  const onInviteClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      navigate(`/spaces/${spaceId}/invite`);
    },
    [navigate, spaceId],
  );

  const { leaveRoom } = useMatrixClient();
  const onLeaveClick = useCallback(async () => {
    await leaveRoom(spaceId);
    navigate("/");
  }, [leaveRoom, navigate, spaceId]);

  return (
    <Box position="relative">
      <Card border arrow paddingBottom="md" width="300" fontSize="md">
        <Stack horizontal padding gap="md" alignItems="center">
          <Box>
            <Avatar size="avatar_md" type="space" />
          </Box>
          <Stack grow gap="sm" fontWeight="strong" color="gray2">
            <Heading level={5}>{spaceId}</Heading>
          </Stack>
        </Stack>
        <Divider space="xs" />
        <MenuItem onClick={onInviteClick}>Invite</MenuItem>
        <MenuItem onClick={onLeaveClick}>Leave</MenuItem>
      </Card>
    </Box>
  );
};

const MenuItem = ({ children, ...props }: BoxProps) => (
  <Box grow paddingY="sm" background={{ hover: "level3" }} {...props}>
    <Stack horizontal paddingX="md" cursor="pointer">
      {children}
    </Stack>
  </Box>
);

export const shortenAddress = (
  s: string,
  charsStart = 6,
  charsEnd = 2,
  delimiter = "..",
) => {
  return (s?.length ?? 0) <= charsStart + delimiter.length + charsEnd
    ? s
    : `${s.substring(0, charsStart)}${delimiter}${s.substring(
        s.length - charsEnd,
      )}`;
};
