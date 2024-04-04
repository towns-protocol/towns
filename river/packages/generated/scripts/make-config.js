const fs = require('fs');
const path = require('path');

const deploymentsOutputFile = 'config/deployments.json';
const deploymentsSourceDir = 'deployments';

function combineJson(dir) {
  const outputData = {};
  const files = fs.readdirSync(dir).filter(file => file.endsWith('.json'));
  const subdirs = fs.readdirSync(dir).filter(subdir => fs.statSync(path.join(dir, subdir)).isDirectory());

  const dirName = path.basename(dir);
  // console.log(`Processing ${dirName} of ${dir}`);
  
  for (const file of files) {
    if (!file.endsWith('.json')) {
      continue;
    }
    const filePath = path.join(dir, file);
    // console.log(`Reading ${filePath}`);
    const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const fileName = path.basename(file, '.json');
    // if the file only has one property, just use that property
    if (Object.keys(fileData).length === 1) {
      outputData[fileName] = fileData[Object.keys(fileData)[0]];
    } else {
      outputData[fileName] = fileData;
    }
  }

  for (const subdir of subdirs) {
    const subdirPath = path.join(dir, subdir);
    outputData[subdir] = combineJson(subdirPath); 
  }
  return outputData;
}

const outputData = combineJson(deploymentsSourceDir);

fs.mkdirSync(path.dirname(deploymentsOutputFile), { recursive: true });
fs.writeFileSync(deploymentsOutputFile, JSON.stringify(outputData, null, 2));

console.log(`Combined deployments config JSON written to ${deploymentsOutputFile}`);