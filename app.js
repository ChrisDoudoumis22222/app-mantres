// loadCars.js

const fs = require('fs');
const path = require('path');
const { chain } = require('stream-chain');
const { parser } = require('stream-json');
const { streamArray } = require('stream-json/streamers/StreamArray');

// 1) Import your various mapper functions here
const mapCarsJson = require('./mappers/carsMapper');
const mapCarsParkingJson = require('./mappers/carsParkingMapper');
const mapCaaarrssssssJson = require('./mappers/caaarrssssssMapper');
const mapOpenLaneJson = require('./mappers/openlaneMapper');
const mapHertzCarsJson = require('./mappers/hertzcarsMapper');
const mapCargrJson = require('./mappers/cargrMapper');
const mapAutoscoutCarsJson = require('./mappers/autoscoutcarsMapper');
const mapAClassJson = require('./mappers/aclassMapper');
const mapKleinanzegencarsJson = require('./mappers/kleinanzegencarsMapper');

// 2) Setup mapperLookup for each file
const mapperLookup = {
  'carsparking.json': mapCarsParkingJson,
  'caaarrssssss.json': mapCaaarrssssssJson,
  'openlane.json': mapOpenLaneJson,
  'hertzcars.json': mapHertzCarsJson,
  'cargr.json': mapCargrJson,
  'autoscoutcars.json': mapAutoscoutCarsJson,
  'aclass.json': mapAClassJson,
  'kleinanzegencars.json': mapKleinanzegencarsJson,
  'carsbg_part_1.json': mapCarsJson,
  'carsbg_part_2.json': mapCarsJson,
  'carsbg_part_3.json': mapCarsJson,
  'carsbg_part_4.json': mapCarsJson,
  'carvagocarsnew.json': mapCarsJson,
};

// Our file sequence (first -> last)
const fileNames = [
  'carsparking.json',
  'caaarrssssss.json',
  'openlane.json',
  'hertzcars.json',
  'cargr.json',
  'autoscoutcars.json',
  'aclass.json',
  'kleinanzegencars.json',
  'carsbg_part_1.json',
  'carsbg_part_2.json',
  'carsbg_part_3.json',
  'carsbg_part_4.json',
  'carvagocarsnew.json',
];

// OPTIONAL: Memory threshold (MB) to prevent huge usage
const MEMORY_THRESHOLD_MB = 2000; // ~2GB

/**
 * Checks if memory usage is above threshold, throws an error if so.
 */
function checkMemory() {
  const used = process.memoryUsage().heapUsed / 1024 / 1024; // in MB
  if (used > MEMORY_THRESHOLD_MB) {
    console.warn(
      `Memory usage ${Math.round(used)} MB exceeds threshold of ${MEMORY_THRESHOLD_MB} MB.`
    );
    throw new Error('Memory usage exceeded threshold - stopping streaming.');
  }
}

/**
 * loadSingleFileCars(fileIndex, filterCallback)
 *  - Loads one file (from fileNames[fileIndex]) using a streaming parser.
 *  - Applies the mapper and filter callback immediately on each record.
 *  - Uses a lower chunk size (highWaterMark) to reduce memory usage.
 *  - Returns an array of matching cars.
 */
async function loadSingleFileCars(fileIndex, filterCallback) {
  const dataDir = path.join(__dirname, 'data');

  if (fileIndex < 0 || fileIndex >= fileNames.length) {
    console.warn('Invalid file index or no more files left.');
    return [];
  }

  const fileName = fileNames[fileIndex];
  const filePath = path.join(dataDir, fileName);
  const mapperFn = mapperLookup[fileName] || mapCarsJson;

  // Temporary array for this file's results
  const singleFileCars = [];

  // Check memory before starting this file
  checkMemory();

  await new Promise((resolve, reject) => {
    fs.access(filePath, fs.constants.F_OK, (accessErr) => {
      if (accessErr) {
        console.warn(`File not found: ${filePath}. Skipping...`);
        return resolve();
      }

      const pipeline = chain([
        fs.createReadStream(filePath, {
          encoding: 'utf8',
          highWaterMark: 16 * 1024, // 16KB chunk size for lower memory footprint
        }),
        parser(),
        streamArray(),
      ]);

      pipeline.on('data', ({ value }) => {
        try {
          const mappedCar = mapperFn(value);
          if (mappedCar && filterCallback(mappedCar)) {
            singleFileCars.push(mappedCar);
          }
        } catch (mapError) {
          console.error(`Error mapping item in ${fileName}:`, mapError);
        }
      });

      pipeline.on('end', () => {
        console.log(`Finished reading ${fileName}, total matches: ${singleFileCars.length}`);
        resolve();
      });

      pipeline.on('error', (err) => {
        console.error(`Error parsing ${fileName}:`, err);
        reject(err);
      });
    });
  });

  return singleFileCars;
}

/**
 * loadAllCars(filterCallback)
 *  - Loads all files defined in fileNames serially.
 *  - Concatenates and returns all matching car records.
 */
async function loadAllCars(filterCallback = () => true) {
  let allCars = [];
  for (let i = 0; i < fileNames.length; i++) {
    try {
      const carsFromFile = await loadSingleFileCars(i, filterCallback);
      allCars = allCars.concat(carsFromFile);
      // Optionally log or free any temporary resources here
    } catch (error) {
      console.error(`Error loading file index ${i}:`, error);
    }
  }
  return allCars;
}

/**
 * loadParkingCars(filterCallback)
 *  - Loads only parking cars from the "carsparking.json" file.
 *  - Returns an array of matching parking cars.
 */
async function loadParkingCars(filterCallback = () => true) {
  const parkingFileName = 'carsparking.json';
  const index = fileNames.findIndex(name => name === parkingFileName);
  if (index === -1) {
    console.warn(`${parkingFileName} not found in fileNames.`);
    return [];
  }
  return await loadSingleFileCars(index, filterCallback);
}

/**
 * clearMemory() - Clears an array reference.
 */
function clearMemory(arrayRef) {
  arrayRef.length = 0;
}

module.exports = {
  loadAllCars,
  loadSingleFileCars,
  loadParkingCars,
  clearMemory,
  fileNames,
};
