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
      { id: "show-room", highlight: true },
      { id: "floor-talk" },
      { id: "introduce-yourself" },
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
  {
    label: "international",
    tags: [
      { id: "中文" },
      { id: "español", highlight: true },
      { id: "français" },
      { id: "한국어" },
    ],
  },
];
