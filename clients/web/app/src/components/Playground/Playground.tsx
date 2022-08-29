import React from "react";
import {
  Box,
  BoxProps,
  Button,
  Divider,
  Heading,
  Icon,
  IconName,
  Paragraph,
  Stack,
  iconTypes,
} from "@ui";
import { TextProps } from "ui/components/Text/Text";
import { atoms } from "ui/styles/atoms.css";
import { RichTextEditor } from "@components/RichText/RichTextEditor";

export const Playground = () => {
  return (
    <Stack absoluteFill padding="lg" gap="lg">
      <Container label="RichText">
        <RichTextEditor />
      </Container>
      <Container label="Headings">
        <Heading level={1}>Heading 1</Heading>
        <Heading level={2}>Heading 2</Heading>
      </Container>
      <Container label="Paragraph">
        <Paragraph size="lg">Paragraph large</Paragraph>
        <Paragraph>Paragraph medium</Paragraph>
        <Paragraph size="sm">Paragraph small</Paragraph>
      </Container>
      <Container label="Paragraph" fontWeight="strong">
        <Paragraph size="lg">Paragraph large</Paragraph>
        <Paragraph>Paragraph medium</Paragraph>
        <Paragraph size="sm">
          <strong>Paragraph small</strong>
        </Paragraph>
      </Container>
      <Container label="Buttons">
        <Divider label="tones" />
        <Box gap alignSelf="start" minWidth="250" alignItems="start">
          <Button>Default</Button>
          <Button tone="cta1">CTA</Button>
        </Box>
        <Divider label="sizes" />
        <Box gap alignSelf="start" minWidth="250" alignItems="start">
          <Button size="button_lg">large</Button>
          <Button size="button_md">medium</Button>
          <Button size="button_sm">small</Button>
        </Box>
        <Divider label="icon buttons" />
        <Box gap alignSelf="start" minWidth="250" alignItems="start">
          <Button tone="cta1" size="button_lg" icon="check">
            Action
          </Button>
          <Button tone="cta1" size="button_md" icon="check">
            Action
          </Button>
          <Button tone="cta1" size="button_sm" icon="check">
            Action
          </Button>
        </Box>
        <Divider label="icons" />
        <Box gap alignSelf="start" minWidth="250" alignItems="start">
          {iconTypes.map((t: IconName) => (
            <Stack horizontal key={t}>
              <Box width="x6">
                <Icon type={t} />
              </Box>
              <Box color="gray2">{t}</Box>
            </Stack>
          ))}
        </Box>
      </Container>
    </Stack>
  );
};

const Container = ({
  label,
  children,
  ...boxProps
}: { label: string } & BoxProps) => (
  <Stack gap border rounded="sm">
    <Box padding background="level2">
      <Paragraph strong size="lg">
        {label}
      </Paragraph>
    </Box>
    <Stack padding gap {...boxProps}>
      {children}
    </Stack>
  </Stack>
);

export const Comment = (props: TextProps) => (
  <span {...props} className={atoms({ color: "gray2" })} />
);
