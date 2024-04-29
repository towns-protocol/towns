// custom-loader.mjs
import { readFile } from "fs/promises";
import { pathToFileURL, fileURLToPath } from "url";
import { promises as fs } from "fs";

// This function attempts to append '.js' to module specifiers if the specified module cannot be found.
async function resolve(specifier, context, defaultResolve) {
  const { parentURL = null } = context;

  // Try the default resolve function first.
  //console.log("Resolving:", specifier);

  try {
    return await defaultResolve(specifier, context, defaultResolve);
  } catch (error) {
    if (error.code === "ERR_MODULE_NOT_FOUND") {
      if (specifier.endsWith(".abi")) {
        let newSpecifier = specifier + ".ts";
        const resolved = await defaultResolve(
          newSpecifier,
          context,
          defaultResolve,
        );
        return {
          url: resolved.url,
          format: "module",
        };
      }

      // Only modify the specifier if it doesn't already end in '.js'
      if (!specifier.endsWith(".js")) {
        const newSpecifier = `${specifier}.js`;
        //console.log("Retrying with new specifier:", newSpecifier);
        return await defaultResolve(newSpecifier, context, defaultResolve);
      }
    } else if (error.code === "ERR_UNSUPPORTED_DIR_IMPORT") {
      // If the error is due to a directory import, try appending '/index.js'
      const newSpecifier = `${specifier}/index.js`;
      return await defaultResolve(newSpecifier, context, defaultResolve);
    }
    //console.log("Failed to resolve:", specifier, error);
    throw error;
  }
}

export async function load(url, context, defaultLoad) {
  //console.log("Loading:", url);
  if (url.endsWith(".wasm") || url.endsWith(".wasm?url")) {
    url = url.replace(".wasm?url", ".wasm");
    // Read the WebAssembly file as a binary buffer
    const source = await fs.readFile(new URL(url));

    return {
      format: "module",
      source: `export default (async () => {
        const wasmBytes = new Uint8Array(${JSON.stringify([...source])});
        const wasmImports = {
            // Example imports needed by the WebAssembly module
            env: {
              memory: new WebAssembly.Memory({initial: 256, maximum: 512}),
              table: new WebAssembly.Table({initial: 0, element: "anyfunc"}),
              imported_func: function(arg) {
                console.log(arg);
              }
            },
            a: {
                memory: new WebAssembly.Memory({initial: 256, maximum: 512}),
                table: new WebAssembly.Table({initial: 0, element: "anyfunc"}),
                imported_func: function(arg) {
                    console.log(arg);
                },
                a: () => true,
                b: () => true,
            }
          };
        const wasmModule = await WebAssembly.compile(wasmBytes);
        return new WebAssembly.Instance(wasmModule, wasmImports);
      })();`,
      shortCircuit: true,
    };
  }

  if (url.endsWith(".ts")) {
    // Read the TypeScript file
    const source = await readFile(new URL(url), "utf8");

    // Transform TypeScript to mimic JSON structure; Here you might need to adapt the transformation based on your file structure
    let transformedSource = `export default ${source.replace(
      /export default /,
      "",
    )};`;

    transformedSource = transformedSource.replace("] as const", "]");

    return {
      format: "module",
      source: transformedSource,
      shortCircuit: true,
    };
  }

  return defaultLoad(url, context, defaultLoad);
}

export { resolve };
