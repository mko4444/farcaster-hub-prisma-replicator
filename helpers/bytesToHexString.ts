export function bytesToHexString(bytes: Uint8Array): { value: string; error?: string } {
  try {
    return { value: Buffer.from(bytes).toString("hex") };
  } catch (error) {
    throw new Error(`Error converting bytes to hex string: ${error}`);
  }
}
