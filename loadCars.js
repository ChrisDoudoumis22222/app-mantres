// loadCars.js

const fs = require('fs');
const path = require('path');
const { chain } = require('stream-chain');
const { parser } = require('stream-json');
const { streamArray } = require('stream-json/streamers/StreamArray');

// Import mapper functions from the mappers folder
const mapCarsJson = require('./mappers/carsMapper');
const mapCarsParkingJson = require('./mappers/carsParkingMapper');
const mapCaaarrssssssJson = require('./mappers/caaarrssssssMapper');
const mapOpenLaneJson = require('./mappers/openlaneMapper');
const mapHertzCarsJson = require('./mappers/hertzcarsMapper');
const mapCargrJson = require('./mappers/cargrMapper');
const mapAutoscoutCarsJson = require('./mappers/autoscoutcarsMapper');
const mapAClassJson = require('./mappers/aclassMapper');
const mapKleinanzegencarsJson = require('./mappers/kleinanzegencarsMapper');

// Lookup table: file name → mapper function
const mapperLookup = {
  'cars.json': mapCarsJson,
  'carsparking.json': mapCarsParkingJson,
  'caaarrssssss.json': mapCaaarrssssssJson,
  'openlane.json': mapOpenLaneJson,
  'hertzcars.json': mapHertzCarsJson,
  'cargr.json': mapCargrJson,
  'autoscoutcars.json': mapAutoscoutCarsJson,
  'aclass.json': mapAClassJson,
  'kleinanzegencars.json': mapKleinanzegencarsJson,
  // For the carsbg parts, assuming they have the same structure as cars.json:
  'carsbg_part_1.json': mapCarsJson,
  'carsbg_part_2.json': mapCarsJson,
  'carsbg_part_3.json': mapCarsJson,
  'carsbg_part_4.json': mapCarsJson,
};

let dataCache = null;

function loadCarsFromFileInChunks(filePath, mapFn) {
  return new Promise((resolve, reject) => {
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        console.warn(`File not found: ${filePath}. Skipping...`);
        return resolve([]);
      }

      const results = [];
      let count = 0;
      const pipeline = chain([
        fs.createReadStream(filePath, { encoding: 'utf8' }),
        parser(),
        streamArray(),
      ]);

      pipeline.on('data', ({ value }) => {
        count++;
        try {
          const mapped = mapFn(value);
          if (mapped) results.push(mapped);
        } catch (mapError) {
          console.error(`Error mapping item in ${filePath}:`, mapError);
        }
      });

      pipeline.on('end', () => {
        console.log(`${path.basename(filePath)} => streamed ${count} items`);
        resolve(results);
      });

      pipeline.on('error', (parseErr) => {
        console.error(`Error reading ${filePath}:`, parseErr);
        reject(parseErr);
      });
    });
  });
}

async function loadAllCars() {
  // Use cache if available
  if (dataCache) return dataCache;

  const dataDir = path.join(__dirname, 'data');

  // List of JSON files to load
  const fileNames = [
    'cars.json',
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
  ];

  let allCars = [];

  // Process files sequentially to reduce simultaneous memory usage
  for (const fileName of fileNames) {
    const filePath = path.join(dataDir, fileName);
    const mapper = mapperLookup[fileName] || mapCarsJson; // use default mapper if none specified
    try {
      const cars = await loadCarsFromFileInChunks(filePath, mapper);
      console.log(`${fileName} entries mapped: ${cars.length}`);
      allCars = allCars.concat(cars);
      // Small delay to help GC (optional)
      await new Promise((resolve) => setTimeout(resolve, 10));
    } catch (err) {
      console.error(`Error reading ${filePath}:`, err);
    }
  }

  // Sort so that cars with images come first
  allCars.sort((a, b) => {
    if (a.hasImage && !b.hasImage) return -1;
    if (!a.hasImage && b.hasImage) return 1;
    return 0;
  });

  console.log(`Total Cars Loaded: ${allCars.length}`);
  console.log(`Cars with Images: ${allCars.filter((car) => car.hasImage).length}`);
  console.log(`Cars without Images: ${allCars.filter((car) => !car.hasImage).length}`);

  // Optional: unify brand names
  allCars.forEach((car) => {
    if (!car.brand) {
      car.brand = 'Unknown';
      return;
    }
    const lowerBrand = car.brand.trim().toLowerCase();
    if (lowerBrand.includes('mercedes')) {
      car.brand = 'Mercedes-Benz';
    }
    // More unification rules as needed...
  });

  dataCache = allCars; // Cache the result for future calls
  return allCars;
}

module.exports = {
  loadAllCars,
};
