import { bech32m } from "bech32";

export function is_valid_address(address) {
  try {
    const { prefix, words } = bech32m.decode(address);
    return words.length === 52 && prefix === "aleo";
  } catch (e) {
    return false;
  }
}
