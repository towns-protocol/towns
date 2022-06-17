export type Channel = {
  id: string;
  label: string;
  private?: boolean;
  highlight?: boolean;
};

export type ChannelGroup = {
  label: string;
  channels: Channel[];
};

export const fakeChannelGroups: ChannelGroup[] = [
  {
    label: "ape chat",
    channels: [
      { id: "general", label: "general" },
      { id: "gm-gn", label: "gm-gn", highlight: true },
      { id: "trade-sell", label: "trade-sell", highlight: true },
    ],
  },
  {
    label: "off topic",
    channels: [
      { id: "artist-hangout", label: "artist-hangout", highlight: true },
      { id: "crypto-talk", label: "crypto-talk", highlight: true },
    ],
  },
  {
    label: "members only",
    channels: [
      {
        id: "all-holders",
        label: "all-holders",
        private: true,
        highlight: false,
      },
      { id: "hodlers-meetup", label: "hodlers-meetup", private: true },
      { id: "rare-apes-only", label: "rare-apes-only", private: true },
    ],
  },
];
