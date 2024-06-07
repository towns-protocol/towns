const fs = require("fs");
const { exec } = require("child_process");
const debounce = require("lodash.debounce");

const currentDirectory = process.cwd();
const protocolDirectory = process.cwd() + "/../../protocol";
const buildCommand = "yarn build";

const handleFileChange = debounce((eventType, filename) => {
  console.log(`Detected ${eventType} in ${filename}, running build command...`);
  exec(buildCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
    } else if (stderr) {
      console.error(`Stderr: ${stderr}`);
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

const watcher2 = fs.watch(protocolDirectory, (eventType, filename) => {
  if (filename.endsWith(".proto")) {
    handleFileChange(eventType, filename);
  }
});

console.log(
  `Watching ${currentDirectory} and ${protocolDirectory} for changes...`,
);

// To close the watcher when you're done
// watcher.close();
