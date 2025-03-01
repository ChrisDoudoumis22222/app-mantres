// app.js

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');
const session = require('express-session');

// Stream-chain imports:
const { chain } = require('stream-chain');
const { parser } = require('stream-json');
const { streamArray } = require('stream-json/streamers/StreamArray');

const app = express();
const PORT = process.env.PORT || 3000;

// ----------------------
// 1. View Engine Setup
// ----------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ----------------------
// 2. Middleware Setup (Static, Body Parser, Session)
// ----------------------
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));

// Session Setup (use any secret you like; never commit real secrets)
app.use(
  session({
    secret: 'mySecretKey123',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // set 'secure: true' if behind HTTPS
  })
);

// ----------------------
// 2.1 Simple Auth Check Middleware
// ----------------------
app.use((req, res, next) => {
  // If user is not logged in AND not requesting login page (or posting login), redirect to /login
  if (
    !req.session.isAuthenticated &&
    req.path !== '/login' &&
    req.path !== '/login/' &&
    req.path !== '/favicon.ico'
  ) {
    return res.redirect('/login');
  }
  next();
});

// ----------------------
// 2.2 Hard-coded credentials (example)
// ----------------------
const HARD_CODED_USERNAME = 'guadelupe22';
const HARD_CODED_PASSWORD = 'Supercars777';

// ----------------------
// 2.3 Login Routes
// ----------------------
// GET /login => render login page
app.get('/login', (req, res) => {
  if (req.session.isAuthenticated) {
    return res.redirect('/');
  }
  res.render('login', { error: '' });
});

// POST /login => check credentials
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === HARD_CODED_USERNAME && password === HARD_CODED_PASSWORD) {
    req.session.isAuthenticated = true;
    return res.redirect('/');
  }
  res.render('login', { error: 'Invalid username or password' });
});

// ----------------------
// 3. Helper Functions
// ----------------------
const buildQueryString = (filters) => {
  return Object.keys(filters)
    .filter(
      (key) =>
        filters[key] !== undefined &&
        filters[key] !== '' &&
        filters[key].length !== 0
    )
    .map((key) => {
      if (Array.isArray(filters[key])) {
        return filters[key]
          .map((value) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
          .join('&');
      }
      return `${encodeURIComponent(key)}=${encodeURIComponent(filters[key])}`;
    })
    .join('&');
};

app.locals.buildQueryString = buildQueryString;

/**
 * Simplifies the model by returning the first token of the string.
 * Example: "A4 TFSI s tronic Avant 110 kW" -> "A4"
 */
const extractMainModel = (fullModel) => {
  if (!fullModel || typeof fullModel !== 'string') return 'Unknown';
  const parts = fullModel.trim().split(' ');
  return parts.length > 0 ? parts[0] : 'Unknown';
};

// ----------------------
// 4. Mapping Functions for JSON Data
// ----------------------
// Example mapping function for cars.json
function mapCarsJson(car) {
  try {
    const title = car.title || 'No Title';
    const brand = car.brand || title.split(' ')[0] || 'No Brand';
    const rawModel = title.split(' ').slice(1).join(' ') || 'No Model';
    const model = extractMainModel(rawModel);

    let price = 0;
    if (typeof car.price === 'number') {
      price = car.price;
    } else if (car.price && typeof car.price === 'string') {
      const priceStr = car.price.replace(/[^0-9,\.]/g, '').replace(',', '.');
      price = parseFloat(priceStr) || 0;
    }

    let mileage = null;
    if (car.mileage && typeof car.mileage === 'string') {
      const mileageMatch = car.mileage.match(/([\d.,]+)/);
      if (mileageMatch) {
        mileage = parseInt(mileageMatch[1].replace(/\./g, ''), 10);
      }
    }

    const transmission = car.transmission || 'N/A';

    let year = 'Unknown';
    if (car.year && typeof car.year === 'string') {
      const yearMatch = car.year.match(/(\d{4})/);
      if (yearMatch) {
        year = parseInt(yearMatch[1], 10);
      }
    }

    const fuelType = car.fuel || 'N/A';

    let power = null;
    if (car.power && typeof car.power === 'string') {
      let match = car.power.match(/(\d+)\s*kW/i);
      if (!match) {
        match = car.power.match(/(\d+)\s*PS/i);
      }
      if (match) {
        power = parseInt(match[1], 10);
      }
    }

    let images = [];
    if (Array.isArray(car.images) && car.images.length > 0) {
      images = car.images;
    } else {
      images = ['https://via.placeholder.com/300x200?text=No+Image'];
    }
    const hasImage =
      images.length > 0 && !images[0].includes('https://via.placeholder.com');

    const location =
      car.detailPageData && car.detailPageData.location
        ? car.detailPageData.location
        : 'Unknown';

    return {
      title,
      link: car.link || '#',
      price,
      mileage,
      transmission,
      year,
      fuelType,
      power,
      images,
      hasImage,
      brand,
      model,
      location,
      priceWithoutTax:
        typeof car.priceWithoutTax !== 'undefined' ? car.priceWithoutTax : null,
    };
  } catch (error) {
    console.error('Error mapping car:', car, error);
    return null;
  }
}

// (Other mapping functions for carsparking.json, caaarrssssss.json, etc. remain unchanged)
function mapCarsParkingJson() { /* ... */ }
function mapCaaarrssssssJson() { /* ... */ }
function mapOpenLaneJson() { /* ... */ }
function mapHertzCarsJson() { /* ... */ }
function mapCargrJson() { /* ... */ }
function mapAutoscoutCarsJson() { /* ... */ }
function mapAClassJson() { /* ... */ }

// ----------------------
// 7. Lazy-Loaded Data Cache & Sequential File Loading
// ----------------------
const dataDir = path.join(__dirname, 'data');

const filePaths = [
  path.join(dataDir, 'cars.json'),
  path.join(dataDir, 'carsparking.json'),
  path.join(dataDir, 'caaarrssssss.json'),
  path.join(dataDir, 'openlane.json'),
  path.join(dataDir, 'hertzcars.json'),
  path.join(dataDir, 'cargr.json'),
  path.join(dataDir, 'autoscoutcars.json'),
  path.join(dataDir, 'aclass.json'),
  path.join(dataDir, 'kleinanzegencars.json'),
  path.join(dataDir, 'mobiledecars.json'),
  path.join(dataDir, 'cars2.json'),
  path.join(dataDir, 'carsbg_part_1.json'),
  path.join(dataDir, 'carsbg_part_2.json'),
  path.join(dataDir, 'carsbg_part_3.json'),
  path.join(dataDir, 'carsbg_part_4.json'),
];

let dataCache = [];
let currentFileIndex = 0;

async function loadNextFile() {
  if (currentFileIndex >= filePaths.length) {
    console.log("All files loaded.");
    return [];
  }
  const filePath = filePaths[currentFileIndex];
  currentFileIndex++;
  const mapper = getMapperFor(filePath);
  try {
    const cars = await loadCarsFromFileInChunks(filePath, mapper);
    console.log(`${path.basename(filePath)} entries mapped: ${cars.length}`);
    dataCache = dataCache.concat(cars);
    await new Promise((resolve) => setTimeout(resolve, 10));
    return cars;
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return [];
  }
}

async function getAllCars() {
  if (dataCache.length === 0 && currentFileIndex === 0) {
    await loadNextFile();
  }
  return dataCache;
}

// NEW: Load ALL JSON files at startup
async function loadAllData() {
  while (currentFileIndex < filePaths.length) {
    await loadNextFile();
  }
}

// ----------------------
// 8. Filter Helper Function
// ----------------------
function applyFilters(cars, query) {
  let filteredCars = cars;
  const {
    brand,
    model,
    transmission,
    color,
    country,
    numberOfDoors,
    minYear,
    maxYear,
    minMileage,
    maxMileage,
    minPower,
    maxPower,
    minPrice,
    maxPrice,
    engineType,
    bodyType,
    condition,
    features,
  } = query;

  if (brand) {
    filteredCars = filteredCars.filter(
      (car) => car.brand && car.brand.toLowerCase() === brand.toLowerCase()
    );
  }
  if (model) {
    const lowerModel = model.toLowerCase();
    filteredCars = filteredCars.filter(
      (car) => car.model && car.model.toLowerCase().includes(lowerModel)
    );
  }
  if (transmission) {
    filteredCars = filteredCars.filter(
      (car) =>
        car.transmission &&
        car.transmission.toLowerCase() === transmission.toLowerCase()
    );
  }
  if (color) {
    filteredCars = filteredCars.filter(
      (car) => car.color && car.color.toLowerCase() === color.toLowerCase()
    );
  }
  if (country) {
    filteredCars = filteredCars.filter(
      (car) => car.country && car.country.toLowerCase() === country.toLowerCase()
    );
  }
  if (numberOfDoors) {
    const doors = parseInt(numberOfDoors, 10);
    if (!isNaN(doors)) {
      filteredCars = filteredCars.filter((car) => car.doors === doors);
    }
  }
  if (minYear) {
    const minY = parseInt(minYear, 10);
    if (!isNaN(minY)) {
      filteredCars = filteredCars.filter(
        (car) => car.year !== 'Unknown' && car.year >= minY
      );
    }
  }
  if (maxYear) {
    const maxY = parseInt(maxYear, 10);
    if (!isNaN(maxY)) {
      filteredCars = filteredCars.filter(
        (car) => car.year !== 'Unknown' && car.year <= maxY
      );
    }
  }
  if (minMileage) {
    const minM = parseInt(minMileage, 10);
    if (!isNaN(minM)) {
      filteredCars = filteredCars.filter(
        (car) => car.mileage !== null && car.mileage >= minM
      );
    }
  }
  if (maxMileage) {
    const maxM = parseInt(maxMileage, 10);
    if (!isNaN(maxM)) {
      filteredCars = filteredCars.filter(
        (car) => car.mileage !== null && car.mileage <= maxM
      );
    }
  }
  if (minPower) {
    const minP = parseInt(minPower, 10);
    if (!isNaN(minP)) {
      filteredCars = filteredCars.filter(
        (car) => car.power !== null && car.power >= minP
      );
    }
  }
  if (maxPower) {
    const maxP = parseInt(maxPower, 10);
    if (!isNaN(maxP)) {
      filteredCars = filteredCars.filter(
        (car) => car.power !== null && car.power <= maxP
      );
    }
  }
  if (minPrice) {
    const minPr = parseFloat(minPrice);
    if (!isNaN(minPr)) {
      filteredCars = filteredCars.filter(
        (car) => car.price && car.price >= minPr
      );
    }
  }
  if (maxPrice) {
    const maxPr = parseFloat(maxPrice);
    if (!isNaN(maxPr)) {
      filteredCars = filteredCars.filter(
        (car) => car.price && car.price <= maxPr
      );
    }
  }
  if (engineType) {
    if (Array.isArray(engineType)) {
      filteredCars = filteredCars.filter((car) =>
        engineType.includes(car.engineType)
      );
    } else {
      filteredCars = filteredCars.filter(
        (car) =>
          car.engineType &&
          car.engineType.toLowerCase() === engineType.toLowerCase()
      );
    }
  }
  if (bodyType) {
    if (Array.isArray(bodyType)) {
      filteredCars = filteredCars.filter((car) =>
        bodyType.includes(car.bodyType)
      );
    } else {
      filteredCars = filteredCars.filter(
        (car) =>
          car.bodyType &&
          car.bodyType.toLowerCase() === bodyType.toLowerCase()
      );
    }
  }
  if (condition) {
    if (Array.isArray(condition)) {
      filteredCars = filteredCars.filter((car) =>
        condition.includes(car.condition)
      );
    } else {
      filteredCars = filteredCars.filter(
        (car) =>
          car.condition &&
          car.condition.toLowerCase() === condition.toLowerCase()
      );
    }
  }
  if (features) {
    if (Array.isArray(features)) {
      filteredCars = filteredCars.filter((car) =>
        features.every((feature) =>
          car.tags &&
          car.tags.map((tag) => tag.toLowerCase()).includes(feature.toLowerCase())
        )
      );
    } else {
      filteredCars = filteredCars.filter((car) =>
        car.tags &&
        car.tags.map((tag) => tag.toLowerCase()).includes(features.toLowerCase())
      );
    }
  }
  return filteredCars;
}

// ----------------------
// 9. Menu Items
// ----------------------
const menuItems = [
  { name: 'Αυτοκίνητα', href: '/', page: 'cars', icon: 'bi-car-front-fill' },
  {
    name: 'Υπολογισμός Εκτελωνισμού',
    href: '/customs-calculations',
    page: 'customs-calculations',
    icon: 'bi-calculator-fill',
  },
  {
    name: 'Υπηρεσίες',
    href: '#',
    page: 'services',
    icon: 'bi-cone-striped',
    dropdown: [
      { name: 'Επισκευές', href: '/404', icon: 'bi-tools' },
      { name: 'Συντήρηση', href: '/404', icon: 'bi-wrench-adjustable' },
      { name: 'Εγκαταστάσεις', href: '/404', icon: 'bi-gear' },
      { name: 'Μεταφορείς', href: '/transporters', icon: 'bi-truck-front-fill' },
    ],
  },
  {
    name: 'Τέλη Κυκλοφορίας',
    href: '/telhkykloforias',
    page: 'telhkykloforias',
    icon: 'bi-file-earmark-dollar-fill',
  },
  
];

app.use((req, res, next) => {
  res.locals.menuItems = menuItems;
  res.locals.activePage = '';
  next();
});

// ----------------------
// 10. Routes Definition
// ----------------------
app.get('/', async (req, res) => {
  const {
    brand,
    model,
    transmission,
    color,
    country,
    numberOfDoors,
    minYear,
    maxYear,
    minMileage,
    maxMileage,
    minPower,
    maxPower,
    minPrice,
    maxPrice,
    engineType,
    bodyType,
    condition,
    features,
    page,
  } = req.query;

  const ITEMS_PER_PAGE = 12;
  let currentPage = parseInt(page, 10) || 1;
  let startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  let endIndex = startIndex + ITEMS_PER_PAGE;

  // Load all data is already loaded at startup
  let allCars = await getAllCars();
  let filteredCars = applyFilters(allCars, req.query);

  // If not enough cars for the requested page (should rarely happen now)
  while (filteredCars.length < endIndex && currentFileIndex < filePaths.length) {
    await loadNextFile();
    allCars = await getAllCars();
    filteredCars = applyFilters(allCars, req.query);
  }

  let totalItems = filteredCars.length;
  let totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;

  // Additional logic: If user on last page and more files are available, load them.
  if (currentPage === totalPages && currentFileIndex < filePaths.length) {
    console.log("User on last page; loading additional file...");
    await loadNextFile();
    allCars = await getAllCars();
    filteredCars = applyFilters(allCars, req.query);
    totalItems = filteredCars.length;
    totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  }

  // Sort so cars with images come first
  filteredCars.sort((a, b) => {
    if (a.hasImage && !b.hasImage) return -1;
    if (!a.hasImage && b.hasImage) return 1;
    return 0;
  });

  const paginatedCars = filteredCars.slice(startIndex, endIndex);

  // Build filter dropdown arrays from ALL cars
  const brands = [...new Set(allCars.map((car) => car.brand).filter(Boolean))].sort();
  let models = [
    ...new Set(
      allCars
        .filter((car) => car.model && car.model.toLowerCase() !== 'unknown')
        .map((car) => car.model)
        .filter(Boolean)
    ),
  ].sort();
  const transmissions = [...new Set(allCars.map((car) => car.transmission).filter(Boolean))].sort();
  const colors = [...new Set(allCars.map((car) => car.color).filter(Boolean))].sort();
  const countries = [...new Set(allCars.map((car) => car.country).filter(Boolean))].sort();
  const engineTypes = [...new Set(allCars.map((car) => car.engineType).filter(Boolean))].sort();
  const bodyTypes = [...new Set(allCars.map((car) => car.bodyType).filter(Boolean))].sort();
  const conditions = [...new Set(allCars.map((car) => car.condition).filter(Boolean))].sort();
  const availableFeatures = [...new Set(allCars.flatMap((car) => car.tags))].filter((f) => f).sort();

  if (brand) {
    models = [
      ...new Set(
        allCars
          .filter(
            (car) =>
              car.brand.toLowerCase() === brand.toLowerCase() &&
              car.model &&
              car.model.toLowerCase() !== 'unknown'
          )
          .map((car) => car.model)
          .filter(Boolean)
      ),
    ].sort();
  }

  res.render('cars', {
    title: 'Διαθέσιμα Αυτοκίνητα',
    cars: paginatedCars,
    brands,
    models,
    transmissions,
    colors,
    countries,
    engineTypes,
    bodyTypes,
    conditions,
    availableFeatures,
    selectedBrand: brand || '',
    selectedModel: model || '',
    selectedTransmission: transmission || '',
    selectedColor: color || '',
    selectedCountry: country || '',
    selectedNumberOfDoors: numberOfDoors || '',
    minYear: minYear || '',
    maxYear: maxYear || '',
    minMileage: minMileage || '',
    maxMileage: maxMileage || '',
    minPower: minPower || '',
    maxPower: maxPower || '',
    minPrice: minPrice || '',
    maxPrice: maxPrice || '',
    selectedEngineType: engineType || '',
    selectedBodyType: bodyType || '',
    selectedCondition: condition || '',
    selectedFeatures: Array.isArray(features) ? features : features ? [features] : [],
    currentPage,
    totalPages,
    filters: {
      brand,
      model,
      transmission,
      color,
      country,
      numberOfDoors,
      minYear,
      maxYear,
      minMileage,
      maxMileage,
      minPower,
      maxPower,
      minPrice,
      maxPrice,
      engineType,
      bodyType,
      condition,
      features: Array.isArray(features) ? features : features ? [features] : [],
    },
    activePage: 'cars',
    success: req.query.success || '',
    error: req.query.error || '',
  });
});

// ----------------------
// 11. Customs Calculations Routes
// ----------------------
app.get('/customs-calculations', (req, res) => {
  res.render('customs_calculator', {
    title: 'Υπολογιστής Εκτελωνισμού',
    activePage: 'customs-calculations',
    success: '',
    error: '',
    calculationResult: null,
  });
});

app.post('/customs-calculations', (req, res) => {
  const {
    value,
    engineCapacity,
    co2Emissions,
    year,
    distance,
    origin,
    insurance,
    customsService,
  } = req.body;
  if (
    !value ||
    !engineCapacity ||
    !co2Emissions ||
    !year ||
    !distance ||
    !origin ||
    !insurance ||
    !customsService
  ) {
    return res.render('customs_calculator', {
      title: 'Υπολογιστής Εκτελωνισμού',
      activePage: 'customs-calculations',
      success: '',
      error: 'Παρακαλώ συμπληρώστε όλα τα πεδία.',
      calculationResult: null,
    });
  }

  const vehicleValue = parseFloat(value);
  const engineCC = parseInt(engineCapacity, 10);
  const co2 = parseInt(co2Emissions, 10);
  const manufactureYear = parseInt(year, 10);
  const transportDistance = parseInt(distance, 10);
  const insuranceCost = parseFloat(insurance);
  const customsServiceCost = parseFloat(customsService);

  if (
    isNaN(vehicleValue) ||
    isNaN(engineCC) ||
    isNaN(co2) ||
    isNaN(manufactureYear) ||
    isNaN(transportDistance) ||
    isNaN(insuranceCost) ||
    isNaN(customsServiceCost)
  ) {
    return res.render('customs_calculator', {
      title: 'Υπολογιστής Εκτελωνισμού',
      activePage: 'customs-calculations',
      success: '',
      error: 'Παρακαλώ εισάγετε έγκυρες αριθμητικές τιμές.',
      calculationResult: null,
    });
  }

  let customsDuty = 0;
  if (origin.toLowerCase() === 'non-eu') {
    const customsRate = 0.1;
    customsDuty = vehicleValue * customsRate;
  }

  const transportCostPerKm = 1.0;
  const transportCost = transportDistance * transportCostPerKm;

  let fuelTax = 0;
  if (engineCC <= 1200) {
    if (co2 <= 100) {
      fuelTax = 500;
    } else if (co2 <= 140) {
      fuelTax = 700;
    } else if (co2 <= 180) {
      fuelTax = 900;
    } else {
      fuelTax = 1200;
    }
  } else if (engineCC <= 1600) {
    if (co2 <= 100) {
      fuelTax = 800;
    } else if (co2 <= 140) {
      fuelTax = 1000;
    } else if (co2 <= 180) {
      fuelTax = 1300;
    } else {
      fuelTax = 1600;
    }
  } else if (engineCC <= 2000) {
    if (co2 <= 100) {
      fuelTax = 1200;
    } else if (co2 <= 140) {
      fuelTax = 1500;
    } else if (co2 <= 180) {
      fuelTax = 1800;
    } else {
      fuelTax = 2100;
    }
  } else {
    if (co2 <= 100) {
      fuelTax = 1600;
    } else if (co2 <= 140) {
      fuelTax = 1900;
    } else if (co2 <= 180) {
      fuelTax = 2200;
    } else {
      fuelTax = 2500;
    }
  }

  const vatRate = 0.24;
  const vatBase = vehicleValue + customsDuty + transportCost;
  const vat = vatBase * vatRate;

  const totalCustoms =
    vat + customsDuty + fuelTax + transportCost + insuranceCost + customsServiceCost;

  const calculationResult = {
    vehicleValue: vehicleValue.toFixed(2),
    transportCost: transportCost.toFixed(2),
    customsDuty: customsDuty.toFixed(2),
    vat: vat.toFixed(2),
    fuelTax: fuelTax.toFixed(2),
    insuranceCost: insuranceCost.toFixed(2),
    customsServiceCost: customsServiceCost.toFixed(2),
    totalCustoms: totalCustoms.toFixed(2),
  };

  res.render('customs_calculator', {
    title: 'Υπολογιστής Εκτελωνισμού',
    activePage: 'customs-calculations',
    success: 'Ο υπολογισμός ολοκληρώθηκε με επιτυχία.',
    error: '',
    calculationResult,
  });
});

// ----------------------
// 12. Other Routes
// ----------------------
app.get('/contact', (req, res) => {
  res.render('contact', { title: 'Επικοινωνία', activePage: 'contact' });
});

app.get('/about', (req, res) => {
  res.render('about', { title: 'Σχετικά με Εμάς', activePage: 'about' });
});

app.get('/transporters', (req, res) => {
  res.render('transporters', {
    title: 'Μεταφορείς Αυτοκινήτων',
    activePage: 'services',
  });
});

app.get('/vin', (req, res) => {
  res.render('vin', { title: 'Έλεγχος VIN', activePage: 'vin' });
});

app.get('/telhkykloforias', (req, res) => {
  res.render('telhkykloforias', {
    title: 'Τέλη Κυκλοφορίας',
    activePage: 'telhkykloforias',
  });
});

app.get('/blog', (req, res) => {
  res.render('blog', { title: 'Blog', activePage: 'blog' });
});

// ----------------------
// 13. Services Routes
// ----------------------
app.get('/services/repairs', (req, res) => {
  res.render('services/repairs', {
    title: 'Επισκευές',
    activePage: 'services',
  });
});

app.get('/services/maintenance', (req, res) => {
  res.render('services/maintenance', {
    title: 'Συντήρηση',
    activePage: 'services',
  });
});

app.get('/services/installations', (req, res) => {
  res.render('services/installations', {
    title: 'Εγκαταστάσεις',
    activePage: 'services',
  });
});

// ----------------------
// 14. Test Route: Load ALL Data (for testing purposes)
// ----------------------
app.get('/load-all-data', async (req, res) => {
  try {
    while (currentFileIndex < filePaths.length) {
      await loadNextFile();
    }
    const allCars = await getAllCars();
    res.json({
      totalItems: allCars.length,
      data: allCars,
    });
  } catch (error) {
    console.error('Error loading all data:', error);
    res.status(500).json({ error: 'Failed to load all data' });
  }
});

// ----------------------
// 15. 404 Error Handler
// ----------------------
app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Σελίδα Δεν Βρέθηκε',
    activePage: '',
  });
});

// ----------------------
// 16. Start the Server after loading all JSON files
// ----------------------
async function startServer() {
  try {
    console.log("Loading all JSON data...");
    await loadAllData();
    console.log("All JSON data loaded. Starting server...");
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Error during startup:", error);
  }
}

startServer();

// ----------------------
// MAPPER FUNCTIONS (for completeness)
// ----------------------
function getMapperFor(filePath) {
  if (filePath.includes('carsparking')) return mapCarsParkingJson;
  if (filePath.includes('caaarrssssss')) return mapCaaarrssssssJson;
  if (filePath.includes('openlane')) return mapOpenLaneJson;
  if (filePath.includes('hertzcars')) return mapHertzCarsJson;
  if (filePath.includes('cargr')) return mapCargrJson;
  if (filePath.includes('autoscoutcars')) return mapAutoscoutCarsJson;
  if (filePath.includes('aclass')) return mapAClassJson;
  // Default mapper:
  return mapCarsJson;
}

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
        console.log(`${filePath} => streamed ${count} items`);
        resolve(results);
      });

      pipeline.on('error', (parseErr) => {
        console.error(`Error reading ${filePath}:`, parseErr);
        reject(parseErr);
      });
    });
  });
}


