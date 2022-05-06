export type ChannelGroups = ChannelGroup[];

export type ChannelGroup = {
  label: string;
  tags: { id: string; private?: boolean; highlight?: boolean }[];
};

export const fakeChannelGroups: ChannelGroup[] = [
  {
    label: "ape chat",
    tags: [
      { id: "general" },
      { id: "gm-gn", highlight: true },
      { id: "trade-sell", highlight: true },
    ],
  },
  {
    label: "off topic",
    tags: [
      { id: "artist-hangout", highlight: true },
      { id: "crypto-talk", highlight: true },
    ],
  },
  {
    label: "members only",
    tags: [
      { id: "all-holders", private: true, highlight: false },
      { id: "hodlers-meetup", private: true },
      { id: "rare-apes-only", private: true },
    ],
  },
];
