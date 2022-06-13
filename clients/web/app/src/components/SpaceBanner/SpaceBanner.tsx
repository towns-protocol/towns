import React, { useCallback } from "react";
import { useMatrixClient } from "use-matrix-client";
import { useNavigate, useParams } from "react-router-dom";
import {
  Avatar,
  Box,
  Card,
  Divider,
  Dropdown,
  Heading,
  Icon,
  Paragraph,
  Stack,
  TooltipRenderer,
} from "@ui";
import { fakeUsers } from "data/UserData";

type Props = {
  bannerSrc?: string;
  avatarSrc?: string;
  name?: string;
  onSettingsClicked?: () => void;
};

const pseudos = [fakeUsers[0], fakeUsers[10], fakeUsers[20]];

export const SpaceBanner = (props: Props) => {
  const { avatarSrc, name } = props;
  return (
    <Stack grow width="100%" justifyContent="center">
      <Stack horizontal gap="md" padding="md">
        {/* avatar container */}
        <Box border padding="sm" borderRadius="lg" background="level2">
          <Avatar src={avatarSrc} size="avatar_xxl" />
        </Box>
        {/* title and stats container */}
        <Stack grow justifyContent="center" gap="md">
          <Heading level={3}>{name}</Heading>
          <SpaceSummary />
        </Stack>
        {/* actions container */}
        <Stack horizontal alignItems="center" gap="sm">
          <Dropdown
            height="input_md"
            options={pseudos.map((p) => ({
              label: p.displayName,
              value: p.id,
            }))}
            defaultValue={pseudos[0].id}
          />
          <TooltipRenderer
            placement="vertical"
            render={<SpaceSettingsMenu />}
            layoutId="dropdown"
            trigger="click"
          >
            {({ triggerProps }) => (
              <Box onClick={props.onSettingsClicked} {...triggerProps}>
                <Icon
                  type="settings"
                  background="level3"
                  size="square_lg"
                  padding="sm"
                />
              </Box>
            )}
          </TooltipRenderer>
        </Stack>
      </Stack>
    </Stack>
  );
};

const SpaceSettingsMenu = () => {
  const { spaceId } = useParams();
  const { leaveRoom } = useMatrixClient();
  const navigate = useNavigate();

  const onInviteClicked = useCallback(() => {
    console.log("invite clicked");
    navigate("/spaces/" + spaceId + "/invite");
  }, [navigate, spaceId]);

  const onLeaveClicked = useCallback(async () => {
    console.log("leave clicked", spaceId);
    if (spaceId) {
      await leaveRoom(spaceId);
    }
    navigate("/");
  }, [leaveRoom, navigate, spaceId]);

  const onSettingsClicked = useCallback(() => {
    navigate("/spaces/" + spaceId + "/settings");
  }, [navigate, spaceId]);

  return (
    <Card padding minWidth="200">
      <Stack gap="sm">
        <Box cursor="pointer" onClick={onInviteClicked}>
          Invite User
        </Box>
        <Divider />
        <Box cursor="pointer" onClick={onLeaveClicked}>
          Leave Space
        </Box>
        <Divider />
        <Box cursor="pointer" onClick={onSettingsClicked}>
          Settings
        </Box>
      </Stack>
    </Card>
  );
};

export const SpaceSummary = ({ compact }: { compact?: boolean }) => (
  <Stack horizontal gap={compact ? "sm" : "md"} color="gray1">
    <Stack horizontal gap={compact ? "xs" : "sm"} alignItems="center">
      <Box background="accent" square="square_sm" rounded="full" />
      <Paragraph size={compact ? "sm" : "lg"}>2.3K</Paragraph>
    </Stack>
    <Stack horizontal gap={compact ? "xs" : "sm"} alignItems="center">
      <Icon type="token" size="square_xs" />
      <Paragraph size={compact ? "sm" : "lg"}>12.4M</Paragraph>
    </Stack>
  </Stack>
);
