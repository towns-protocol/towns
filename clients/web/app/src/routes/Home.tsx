import React from "react";
import { AnnouncementCard } from "@components/AnnouncementCard";
import { HighlightCard } from "@components/HighlightCard";
import { MainNav } from "@components/MainNav/MainNav";
import { Grid, Heading } from "@ui";
import { Stack } from "ui/components/Stack/Stack";
import { LiquidContainer } from "./SpacesIndex";

export const Home = () => (
  <>
    <MainNav />
    <Stack horizontal grow justifyContent="center" paddingY="md" basis="1200">
      <LiquidContainer fullbleed>
        <Stack grow gap="sm">
          <Heading level={1} color="gray1">
            Highlights
          </Heading>
          <Grid columns={4} gap="sm">
            <HighlightCard colSpan={2} />
            <HighlightCard colSpan={2} />
            <AnnouncementCard />
            <AnnouncementCard />
            <AnnouncementCard />
            <AnnouncementCard />
          </Grid>
        </Stack>
      </LiquidContainer>
    </Stack>
  </>
);
