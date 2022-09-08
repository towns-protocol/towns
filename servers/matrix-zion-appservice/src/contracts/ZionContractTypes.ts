import { BigNumber, ethers } from "ethers";

export enum EntitlementType {
  Administrator = 0,
  Moderator = 1,
  Join = 2,
  Leave = 3,
  Read = 4,
  Write = 5,
  Block = 6,
  Redact = 7,
  Add_Channel = 8,
  Remove_Channel = 9,
}

export function getEntitlementTypeBigNumber(type: EntitlementType): BigNumber {
  return ethers.BigNumber.from(type);
}

export function toBigNumber(n: number): BigNumber {
  return ethers.BigNumber.from(n);
}
