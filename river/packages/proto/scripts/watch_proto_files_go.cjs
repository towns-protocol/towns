const fs = require("fs");
const { exec } = require("child_process");
const debounce = require("lodash.debounce");

const currentDirectory = process.cwd();
const toolsDirectory = process.cwd() + "/../node/protocol_extensions";
const protocolDirectory = process.cwd() + "/../../protocol";
const buildCommand = "cd ../node && go generate -v -x protocol/gen.go";

const handleFileChange = debounce((eventType, filename) => {
  console.log(`Detected ${eventType} in ${filename}, running build command...`);
  exec(buildCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
    } else if (stderr) {
      console.error(`stderr:\n${stderr}\nstdout:\n${stdout}`);
    } else if (stdout) {
      console.log(`Stdout: ${stdout}`);
    }
    console.log("Done.");
  });
}, 1000);

const watcher = fs.watch(currentDirectory, (eventType, filename) => {
  if (filename.endsWith(".proto")) {
    handleFileChange(eventType, filename);
  }
});

const watcher2 = fs.watch(toolsDirectory, (eventType, filename) => {
  if (filename.endsWith(".go")) {
    handleFileChange(eventType, filename);
  }
});

const watcher3 = fs.watch(protocolDirectory, (eventType, filename) => {
  if (filename.endsWith(".proto")) {
    handleFileChange(eventType, filename);
  }
});

console.log(
  `Watching ${currentDirectory} && ${toolsDirectory} && ${protocolDirectory} for changes...`,
);

// To close the watcher when you're done
// watcher.close();
