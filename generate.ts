import { generateVpmListing } from "./generate-vpm.ts";

if (import.meta.main) {
  const rootDir = Deno.cwd();
  const hostBaseUrl = "https://vpm-listing.superneko.net";

  await generateVpmListing(rootDir, hostBaseUrl);

  Deno.copyFile("website/index.html", "out/index.html");
  Deno.copyFile("website/index.js", "out/index.js");
  Deno.copyFile("website/index.css", "out/index.css");
  Deno.copyFile("website/icon.png", "out/icon.png");
}
