import React from "react";
import { Highlight } from "@components/Highlight";
import { MainSideBar } from "@components/SideBars/MainSideBar";
import { Grid, Heading } from "@ui";
import { Stack } from "ui/components/Stack/Stack";
import { LiquidContainer } from "./SpacesIndex";

export const Home = () => (
  <>
    <MainSideBar />
    <Stack horizontal grow justifyContent="center" paddingY="md" basis="1200">
      <LiquidContainer fullbleed>
        <Stack grow gap="sm">
          <Heading color="gray1" level={1}>
            Highlights
          </Heading>
          <Grid columns={4} gap="sm">
            <Highlight
              colSpan={2}
              userId="2"
              space="RTFKT"
              type="background"
              channel="highlights"
              imageSrc="placeholders/frame_0.png"
            >
              <p>
                Hey @everyone, Quest #3 Completed :⚔️ MNLTH has EVOLVED AND
                WHATTTTTT ? 1 Quest left ❌❌❌🗿Final ...
              </p>
            </Highlight>
            <Highlight
              colSpan={2}
              userId="3"
              type="background"
              space="RTFKT"
              channel="highlights"
              imageSrc="placeholders/frame_1.png"
            >
              <p>
                🌟 Golden Star artist is Maggie Mae 🌟 Maggie is a multifaceted
                artist from Rhode Island 🇺🇸 who works with various mediums such
                as digital, illustratio...
              </p>
            </Highlight>
            <Highlight
              space="Azuki"
              channel="announcements"
              userId="10"
              imageSrc="placeholders/frame_8.png"
            >
              <p>
                🌟 Golden Star artist is Maggie Mae 🌟 Maggie is a multifaceted
                artist from Rhode Island
              </p>
            </Highlight>
            <Highlight
              space="Azuki"
              channel="general"
              userId="20"
              imageSrc="placeholders/frame_6.png"
            >
              <p>
                Oh shit we’re in Forbes!!
                <br />
              </p>
              <p>More content in the article above. Text on several lines...</p>
            </Highlight>
            <Highlight
              space="Azuki"
              channel="announcements"
              userId="30"
              imageSrc="placeholders/frame_5.png"
            >
              <p>
                Oh shit we’re in Forbes!!
                <br />
                <a href="https://www.forbes.com/sites/jeffkauflin/2022/02/14/how-azukis-suddenly-became-the-worlds">
                  https://www.forbes.com/sites/jeffkauflin/2022/02/14/how-azukis-suddenly-became-the-worlds...
                </a>
              </p>
              <p>More content in the article above. Text on several lines...</p>
            </Highlight>
            <Highlight
              space="Azuki"
              channel="announcements"
              userId="40"
              imageSrc="placeholders/frame_7.png"
            >
              <p>More content in the article above. Text on several lines...</p>
            </Highlight>
          </Grid>
        </Stack>
      </LiquidContainer>
    </Stack>
  </>
);
