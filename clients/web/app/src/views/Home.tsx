import { AnnouncementCard } from "@components/AnnouncementCard";
import { HighlightCard } from "@components/HighlightCard";
import { Box, Grid, Heading } from "@ui";
import React from "react";

export const Home = () => (
  <Box grow="x9" justifyContent="center" direction="row" padding="lg">
    <Box maxWidth={{ desktop: "1200" }}>
      <Box grow gap="md">
        <Heading level={1}>Highlights</Heading>
        <Grid columns={4} gap="sm">
          <HighlightCard colSpan={2} />
          <HighlightCard colSpan={2} />
          <AnnouncementCard />
          <AnnouncementCard />
          <AnnouncementCard />
          <AnnouncementCard />
        </Grid>
        <Heading level={2}>Shared with you</Heading>
      </Box>
    </Box>
  </Box>
);
