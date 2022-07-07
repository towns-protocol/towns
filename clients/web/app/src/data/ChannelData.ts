import { RoomIdentifier, makeRoomIdentifier } from "use-matrix-client";

export type Channel = {
  id: RoomIdentifier;
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
      { id: makeRoomIdentifier("general"), label: "general" },
      { id: makeRoomIdentifier("gm-gn"), label: "gm-gn", highlight: true },
      {
        id: makeRoomIdentifier("trade-sell"),
        label: "trade-sell",
        highlight: true,
      },
    ],
  },
  {
    label: "off topic",
    channels: [
      {
        id: makeRoomIdentifier("artist-hangout"),
        label: "artist-hangout",
        highlight: true,
      },
      {
        id: makeRoomIdentifier("crypto-talk"),
        label: "crypto-talk",
        highlight: true,
      },
    ],
  },
  {
    label: "members only",
    channels: [
      {
        id: makeRoomIdentifier("all-holders"),
        label: "all-holders",
        private: true,
        highlight: false,
      },
      {
        id: makeRoomIdentifier("hodlers-meetup"),
        label: "hodlers-meetup",
        private: true,
      },
      {
        id: makeRoomIdentifier("rare-apes-only"),
        label: "rare-apes-only",
        private: true,
      },
    ],
  },
];
