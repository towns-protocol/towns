import { AnimatePresence, motion } from "framer-motion";
import React from "react";
import { useMatrixStore, useMyProfile } from "use-zion-client";
import { ProfileSettingsCard } from "@components/Cards/ProfileSettingsCard";
import { FadeIn } from "@components/Transitions";
import { Avatar, Paragraph, Stack, TooltipRenderer } from "@ui";

type Props = {
  expanded?: boolean;
};

export const ProfileCardButton = (props: Props) => {
  const { expanded: isExpanded } = props;
  const { isAuthenticated, userId, username } = useMatrixStore();
  const myProfile = useMyProfile();

  return !isAuthenticated ? null : (
    <TooltipRenderer
      layoutId="topbar"
      trigger="click"
      placement="horizontal"
      render={
        <ProfileSettingsCard
          userId={userId}
          username={username}
          avatarUrl={myProfile?.avatarUrl}
          displayName={myProfile?.displayName}
        />
      }
    >
      {({ triggerProps }) => (
        <>
          <MotionStack
            horizontal
            gap="sm"
            alignItems="center"
            layout="position"
            overflow="hidden"
          >
            <Avatar
              src={myProfile?.avatarUrl}
              size="avatar_x4"
              {...triggerProps}
            />
            <AnimatePresence>
              {isExpanded && (
                <FadeIn>
                  <Paragraph truncate strong color="gray1">
                    {myProfile?.displayName}
                  </Paragraph>
                </FadeIn>
              )}
            </AnimatePresence>
          </MotionStack>
        </>
      )}
    </TooltipRenderer>
  );
};

const MotionStack = motion(Stack);
//Stack horizontal gap="sm" alignItems="center"
