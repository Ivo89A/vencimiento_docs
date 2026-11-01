import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import { DocumentFileInfrastructureError } from "./document-file.errors";

export function isPrivateNetworkAddress(address: string): boolean {
  const normalized = address.toLowerCase();
  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.slice(7);
    if (isIP(mapped) === 4) return isPrivateNetworkAddress(mapped);
    // Hex-encoded IPv4-mapped addresses are not accepted as a shortcut around the IPv4 policy.
    return false;
  }
  if (isIP(address) === 4) {
    const [first, second] = address.split(".").map(Number);
    return first === 127 || first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
  }
  if (isIP(address) === 6) return normalized === "::1" || /^(fc|fd)[0-9a-f]{2}:/.test(normalized);
  return false;
}

export async function resolvePrivateAddress(host: string, signal: AbortSignal) {
  signal.throwIfAborted();
  let addresses: Array<{ address: string; family: number }>;
  try { addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await lookup(host, { all: true, verbatim: true }); }
  catch { throw new DocumentFileInfrastructureError("ANTIVIRUS_UNAVAILABLE"); }
  signal.throwIfAborted();
  if (!addresses.length || addresses.some((item) => !isPrivateNetworkAddress(item.address))) {
    throw new DocumentFileInfrastructureError("ANTIVIRUS_UNSAFE_ADDRESS");
  }
  // Connect to the validated literal, not the hostname: no second DNS resolution/rebinding.
  return addresses[0];
}
