import React from "react";
import { Avatar, Box, Button, Card, Paragraph, Stack } from "@ui";
import { fakeUserCache } from "data/UserData";
import { Icon } from "ui/components/Icon";

type Props = {
  userId: string;
  title: string;
  abstract: string;
  time?: string;
  results?: number;
};

export const Proposal = (props: Props) => {
  const user = fakeUserCache[props.userId];
  return (
    <Card padding border horizontal gap>
      <Box shrink>
        <Avatar circle src={user.avatarSrc} size="avatar_x6" />
      </Box>
      <Box grow color="gray2" gap="paragraph">
        <Paragraph>{user.displayName}</Paragraph>
        <Paragraph strong color="default">
          {props.title}
        </Paragraph>
        <Box maxWidth="1200">
          <p>{props.abstract}</p>
        </Box>
        {props.results && (
          <Stack horizontal gap="sm" alignItems="center">
            <Icon type="check" background="positive" size="square_sm" />
            <Paragraph size="sm">Yes - 60%</Paragraph>
          </Stack>
        )}
      </Box>
      <Box>
        {!props.results ? (
          <Button tone="positive" size="input_sm">
            Open
          </Button>
        ) : (
          <Button tone="cta2" size="input_sm">
            Closed
          </Button>
        )}
      </Box>
    </Card>
  );
};
