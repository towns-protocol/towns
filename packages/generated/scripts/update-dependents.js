const fs = require("fs");
const path = require("path");
const glob = require("glob");

/**
 * Resolves paths relative to the script's location.
 */
const monorepoRoot = path.resolve(__dirname, "../../.."); // Move up from packages/generated/scripts
const rootPackageJsonPath = path.join(monorepoRoot, "package.json");
const generatedPackageJsonPath = path.resolve(__dirname, "../package.json");

/**
 * Reads and returns the monorepo workspaces.
 */
function getWorkspacePaths() {
  const rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, "utf8"));
  if (!rootPackageJson.workspaces) {
    throw new Error("No workspaces found in monorepo root package.json");
  }

  // Expand workspaces globs
  const workspaces = rootPackageJson.workspaces.flatMap((pattern) =>
    glob.sync(path.join(monorepoRoot, pattern), { absolute: true })
  );

  // Filter out non-directory paths
  return workspaces.filter((dir) => fs.existsSync(dir) && fs.statSync(dir).isDirectory());
}

/**
 * Reads the version from ./packages/generated/package.json
 */
function getGeneratedVersion() {
  const packageJson = JSON.parse(fs.readFileSync(generatedPackageJsonPath, "utf8"));
  return packageJson.version;
}

/**
 * Updates package.json by replacing "workspace:^" with the actual version
 */
function updatePackageJson(packageJsonPath, generatedVersion) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  let updated = false;

  if (packageJson.dependencies && packageJson.dependencies["@river-build/generated"] === "workspace:^") {
    packageJson.dependencies["@river-build/generated"] = generatedVersion;
    updated = true;
  }

  if (packageJson.devDependencies && packageJson.devDependencies["@river-build/generated"] === "workspace:^") {
    packageJson.devDependencies["@river-build/generated"] = generatedVersion;
    updated = true;
  }

  if (updated) {
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n", "utf8");
    console.log(`Updated: ${packageJsonPath}`);
  }
}

/**
 * Main script execution
 */
(function main() {
  const generatedVersion = getGeneratedVersion();
  console.log(`Using version: ${generatedVersion}`);

  const workspacePaths = getWorkspacePaths();

  console.log("Updating package.json files in workspaces:");
  workspacePaths.forEach((workspacePath) => {
    const packageJsonPath = path.join(workspacePath, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      updatePackageJson(packageJsonPath, generatedVersion);
    }
  });
})();
