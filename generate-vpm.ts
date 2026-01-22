import { zip } from "jsr:@deno-library/compress@0.5.6";
import { compare, parse } from "jsr:@std/semver@1";
import { z } from "npm:zod@4.3.5";

const PackageVersionEntrySchema = z.looseObject({
  // UPM Required
  name: z.string(),
  version: z.string(),
  // UPM Recommended
  description: z.string().optional(),
  unity: z.string().optional(),
  displayName: z.string().optional(),
  // VPM Required
  url: z.string(),
  // VPM Recommended? (These are required by VPM spec but NDMF does not contain them)
  vpmDependencies: z.record(z.string(), z.string()).optional(),
});

type PackageVersionEntry = z.infer<typeof PackageVersionEntrySchema>;

type PackageEntry = {
  versions: Record<string, PackageVersionEntry>;
};

function sortPackageVersions(versions: Record<string, PackageVersionEntry>) {
  const sortedVersions: PackageVersionEntry[] = Object.values(versions).sort((a, b) => -compare(parse(b.version), parse(a.version)));

  return sortedVersions.reduce((acc, version) => {
    acc[version.version] = version;
    return acc;
  }, {} as Record<string, PackageVersionEntry>);
}

async function readFileFromZip(zipFile: string, filePath: string) {
  console.log("Processing zip file:", zipFile);

  const tempDir = `/tmp/${crypto.randomUUID()}`;
  try {
    // create directory
    await Deno.mkdir(tempDir, { recursive: true });

    await zip.uncompress(zipFile, tempDir);

    const fileData = await Deno.readFile(`${tempDir}/${filePath}`);

    return fileData;
  } finally {
    // clean up
    await Deno.remove(tempDir, { recursive: true });
  }
}

async function generatePackageVersionEntry(
  packageFile: string,
): Promise<PackageVersionEntry> {
  const fileInfo = await Deno.stat(packageFile);

  if (!fileInfo.isFile) {
    throw new Error(`Expected a file but found something else: ${packageFile}`);
  }

  const packageJsonText = await readFileFromZip(packageFile, "package.json");
  const packageJson = JSON.parse(new TextDecoder().decode(packageJsonText));

  return PackageVersionEntrySchema.parse(packageJson);
}

async function generatePackageEntry(
  packageDir: string,
  expectedName: string,
  hostBaseUrl: string,
  packagesOutDir: string,
): Promise<PackageEntry> {
  const fileEntries = Deno.readDir(packageDir);

  const versions: Record<string, PackageVersionEntry> = {};

  await Deno.mkdir(`${packagesOutDir}/${expectedName}`, { recursive: true });

  for await (const fileEntry of fileEntries) {
    if (!fileEntry.isFile || !fileEntry.name.endsWith(".zip")) {
      throw new Error(
        `Unexpected file found in package directory: ${fileEntry.name}`,
      );
    }

    const packageFile = `${packageDir}/${fileEntry.name}`;
    const packageVersionEntry = await generatePackageVersionEntry(packageFile);

    if (versions[packageVersionEntry.version]) {
      throw new Error(
        `Duplicate version found in package directory: ${packageVersionEntry.version}`,
      );
    }

    if (packageVersionEntry.name !== expectedName) {
      throw new Error(
        `Mismatched package name found in package directory: expected ${expectedName}, found ${packageVersionEntry.name}`,
      );
    }

    packageVersionEntry.url = `${hostBaseUrl}/packages/${expectedName}/${expectedName}-${packageVersionEntry.version}.zip`;

    // Copy package file to output directory
    await Deno.copyFile(
      packageFile,
      `${packagesOutDir}/${expectedName}/${expectedName}-${packageVersionEntry.version}.zip`,
    );

    versions[packageVersionEntry.version] = packageVersionEntry;
  }

  return {
    versions: sortPackageVersions(versions),
  };
}

async function generatePackagesList(
  packagesDir: string,
  hostBaseUrl: string,
  outDir: string,
): Promise<Record<string, PackageEntry>> {
  const entries: Record<string, PackageEntry> = {};

  for await (const dirEntry of Deno.readDir(packagesDir)) {
    if (!dirEntry.isDirectory) {
      if (dirEntry.name === ".gitkeep") {
        continue;
      }

      throw new Error(
        `Unexpected file found in packages directory: ${dirEntry.name}`,
      );
    }

    const packageName = dirEntry.name;

    const packageDir = `${packagesDir}/${packageName}`;
    const packageEntry = await generatePackageEntry(
      packageDir,
      packageName,
      hostBaseUrl,
      outDir,
    );

    if (Object.values(packageEntry.versions).length === 0) {
      console.warn(`Warning: No versions found for package: ${packageName}`);
      continue;
    }

    entries[packageName] = packageEntry;
  }

  return entries;
}

export async function generateVpmListing(rootDir: string, hostBaseUrl: string) {
  console.log("Generating content...");

  const outDir = `${rootDir}/out`;
  const packagesOutDir = `${rootDir}/out/packages`;
  const packagesDir = `${rootDir}/packages`;
  const baseJsonPath = `${rootDir}/base.json`;

  // ensure output directory exists
  await Deno.mkdir(outDir, { recursive: true });
  await Deno.mkdir(packagesOutDir, { recursive: true });

  const packagesList = await generatePackagesList(
    packagesDir,
    hostBaseUrl,
    packagesOutDir,
  );

  const baseJsonText = Deno.readFileSync(baseJsonPath);

  const baseJson = JSON.parse(new TextDecoder().decode(baseJsonText));

  baseJson["packages"] = packagesList;

  const outJsonPath = `${outDir}/vpm.json`;
  await Deno.writeFile(
    outJsonPath,
    new TextEncoder().encode(JSON.stringify(baseJson, null, 2)),
  );

  console.log(`Generated packages list at: ${outJsonPath}`);
}

async function main() {
  const rootDir = Deno.cwd();
  const hostBaseUrl = "https://vpm-listings.superneko.net";

  await generateVpmListing(rootDir, hostBaseUrl);
}

if (import.meta.main) {
  await main();
}
