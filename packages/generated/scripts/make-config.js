import fs from 'node:fs';
import path from 'node:path';

const deploymentsOutputFile = 'config/deployments.json';
const deploymentsSourceDir = 'deployments';

// parse deployment folder jsons into a single json object
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

// helper for env var readability
function keyToEnvKey(key) {
  // convert camelCase to snake_case, handling acronyms properly
  return key
    .replace(/([a-z])([A-Z])/g, '$1_$2')  // insert _ between lowercase and uppercase
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')  // insert _ between acronym and next word
    .toUpperCase();
}

// convert a json object to a .env file content string
function convertToEnv(data, prefix = '') {
  // recursively walk nested objects, convert all keys to UPPER SNAKE CASE  and values set equal to value,
  let envContent = ''
  for (const key of Object.keys(data)) {
    const value = data[key];
    const envKey = `${prefix}${keyToEnvKey(key)}`;
    if (typeof value === 'object') {
      envContent += convertToEnv(value, `${envKey}_`);
    } else {
      envContent += `${envKey}=${String(value)}\n`;
    }
  }
  return envContent;
}



const outputData = combineJson(deploymentsSourceDir);


// for each top level key in outputData, write a .env file in the deployments/<key> folder
// with all keys in the json converted to UPPER SNAKE CASE
for (const key of Object.keys(outputData)) {
  const envFile = path.join(deploymentsSourceDir, key, '.env');
  const data = outputData[key];
  const envData = convertToEnv(data);
  fs.writeFileSync(envFile, `RIVER_ENV=${key}\n${envData}`);
}

// write a config.json file
fs.mkdirSync(path.dirname(deploymentsOutputFile), { recursive: true });
fs.writeFileSync(deploymentsOutputFile, JSON.stringify(outputData, null, 2));

console.log(`Combined deployments config JSON written to ${deploymentsOutputFile}`);