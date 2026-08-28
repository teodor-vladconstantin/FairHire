/** @type {import('next').NextConfig} */
const nextConfig = {
  // These packages ship native WASM binaries (PLONK proving/circuit-runtime).
  // They are only ever imported from Node-only Route Handlers
  // (src/app/api/attest, src/app/api/generate-proof) and must be excluded
  // from webpack bundling so their WASM asset resolution and Node `fs`
  // access keep working at runtime instead of being inlined/broken by the
  // bundler.
  serverExternalPackages: [
    "@midnight-ntwrk/compact-runtime",
    "@midnight-ntwrk/zkir-v2",
    "@midnightntwrk/onchain-runtime-v4",
  ],
};

export default nextConfig;
