import React from "react";
import { SaleCard } from "@components/Cards/SaleCard";
import { ShareCard } from "@components/Cards/ShareCard";
import { Highlight } from "@components/Highlight";
import { Message } from "@components/Message";
import { MainSideBar } from "@components/SideBars/MainSideBar";
import { Avatar, Box, Grid, Heading } from "@ui";
import { Card } from "ui/components/Card/Card";
import { Stack } from "ui/components/Stack/Stack";
import { LiquidContainer } from "./SpacesIndex";

export const Home = () => (
  <>
    <MainSideBar />
    <Stack horizontal grow justifyContent="center" paddingY="lg" basis="1200">
      <LiquidContainer fullbleed position="relative">
        <Stack grow gap="md">
          <Heading level={2}>Highlights</Heading>
          <Grid columns={12} gap="md">
            <Highlight
              colSpan={6}
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
              colSpan={6}
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
                  https://www.forbes.com/sites/...
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
            <Box paddingTop="lg" colSpan={12}>
              <Heading level={4} color="gray1">
                Shared with you
              </Heading>
            </Box>
            <ShareCard
              colSpan={4}
              space="Azuki"
              channel="announcements"
              userId="40"
              imageSrc="placeholders/frame_7.png"
            >
              <p>
                hey guys, just a suggestion here, I love the whole idea of space
                doodle which allows the nft to have multipl...
              </p>
            </ShareCard>
            <ShareCard
              colSpan={4}
              space="Azuki"
              channel="announcements"
              userId="20"
              imageSrc="placeholders/frame_3.png"
            >
              <p>
                hey guys, just a suggestion here, I love the whole idea of space
                doodle which allows the nft to have multipl...
              </p>
            </ShareCard>
            <ShareCard
              colSpan={4}
              space="Azuki"
              channel="announcements"
              userId="30"
              imageSrc="placeholders/frame_2.png"
            >
              <p>
                hey guys, just a suggestion here, I love the whole idea of space
                doodle which allows the nft to have multipl...
              </p>
            </ShareCard>
            <Box paddingTop="lg" colSpan={12}>
              <Heading level={4} color="gray1">
                Trending for sale
              </Heading>
            </Box>
            <SaleCard
              colSpan={3}
              space="Mutant Ape Yacht Club"
              supply={22343}
              floorPrice={45}
              imageSrc="placeholders/frame_6.png"
            />
            <SaleCard
              colSpan={3}
              space="World of Women"
              supply={92231}
              floorPrice={45}
              imageSrc="placeholders/frame_2.png"
            />
            <SaleCard
              colSpan={3}
              space="Doodles"
              supply={223}
              floorPrice={45}
              imageSrc="placeholders/frame_3.png"
            />
            <SaleCard
              colSpan={3}
              space="Crypto Punks"
              supply={343}
              floorPrice={45}
              imageSrc="placeholders/frame_4.png"
            />
            <Box paddingTop="lg" colSpan={12}>
              <Heading level={4} color="gray1">
                Top discussions
              </Heading>
            </Box>
            <Card colSpan={12} padding="md" background="default">
              <Message
                channel="announcements"
                name="sunsoutapesout"
                avatar={<Avatar src="/placeholders/nft_2.png" />}
                date="Today at 11:01 AM"
                reactions={{ "👋": 20 }}
              >
                <p>
                  Hey <strong>@everyone</strong>,
                </p>
                <p>
                  We're thrilled to announce that <strong>@steamboy</strong> has
                  joined the core team full-time as our Art Director!
                </p>
                <p>
                  Let's give our newest team members a warm welcome! They're no
                  strangers to the community and we would not be where we're at
                  today if it weren't for them.
                </p>
              </Message>
            </Card>
          </Grid>
        </Stack>
      </LiquidContainer>
    </Stack>
  </>
);
