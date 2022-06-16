import { ChannelGroups, fakeChannelGroups } from "./ChannelData";

/**
 * Simplified representation of a space
 */
export type SpaceData = {
  id: string;
  name: string;
  avatarSrc: string;
  bannerSrc?: string;
  active?: boolean;
  // should belong to usersettings
  pinned?: boolean;
  channels: ChannelGroups;
  isFakeSpace?: boolean;
};

export const emptySpace: SpaceData = {
  id: "none",
  name: "Space Not Found",
  avatarSrc: "/placeholders/nft_10.png",
  channels: [],
};

export const fakeSpaces: SpaceData[] = [
  {
    id: "council",
    name: "Zion Council",
    avatarSrc: "/placeholders/nft_10.png",
    pinned: true,
    channels: [
      {
        label: "Welcome",
        tags: [
          { id: "general" },
          { id: "introductions", highlight: true },
          { id: "feature-request", highlight: true },
        ],
      },
      {
        label: "Crypto",
        tags: [
          { id: "markets", highlight: true },
          { id: "NFTs", highlight: true },
        ],
      },
    ],
  },
  {
    id: "bored-ape-yacht-club",
    name: "Bored Ape Yacht Club",
    avatarSrc: "/placeholders/nft_10.png",
    pinned: true,
    channels: fakeChannelGroups,
  },
  {
    id: "crypto-punks",
    name: "Crypto Punks",
    avatarSrc: "/placeholders/nft_14.png",
    bannerSrc: "/placeholders/frame_5.png",
    pinned: true,
    active: true,
    channels: fakeChannelGroups,
  },
  {
    id: "doodles",
    name: "Doodles",
    avatarSrc: "/placeholders/nft_41.png",
    bannerSrc: "/placeholders/frame_4.png",
    pinned: true,
    channels: fakeChannelGroups,
  },
  {
    id: "fwb",
    name: "FWB",
    avatarSrc: "/placeholders/nft_18.png",
    bannerSrc: "/placeholders/frame_4.png",
    channels: fakeChannelGroups,
  },
  {
    id: "world-of-women",
    name: "World of Women",
    avatarSrc: "/placeholders/nft_26.png",
    bannerSrc: "/placeholders/frame_4.png",
    active: true,
    channels: fakeChannelGroups,
  },
  {
    id: "mutant-ape-yacht-club",
    name: "Mutant Ape Yacht Club",
    avatarSrc: "/placeholders/nft_37.png",
    bannerSrc: "/placeholders/frame_4.png",
    active: true,
    channels: fakeChannelGroups,
  },
  {
    id: "the-sandbox",
    name: "The Sandbox",
    avatarSrc: "/placeholders/nft_33.png",
    bannerSrc: "/placeholders/frame_4.png",
    channels: fakeChannelGroups,
  },
  {
    id: "azuki",
    name: "Azuki",
    avatarSrc: "/placeholders/nft_40.png",
    bannerSrc: "/placeholders/frame_4.png",
    active: true,
    channels: fakeChannelGroups,
  },
  {
    id: "clone-x",
    name: "Clone X - X Takashi Murakami",
    avatarSrc: "/placeholders/nft_19.png",
    bannerSrc: "/placeholders/frame_4.png",
    channels: fakeChannelGroups,
  },
];

fakeSpaces.forEach((space) => {
  space.isFakeSpace = true;
});
