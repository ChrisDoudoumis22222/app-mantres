// app.js

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');
const JSONStream = require('JSONStream');
const { loadAllCars } = require('./loadCars'); // Ensure loadAllCars is exported from loadCars.js

const app = express();
const PORT = process.env.PORT || 3000;

// ----------------------
// Memory Usage Logger Function
// ----------------------
function logMemoryUsage() {
  const memUsage = process.memoryUsage();
  console.log('Memory Usage:');
  console.log('  RSS:', (memUsage.rss / (1024 * 1024)).toFixed(2) + ' MB');
  console.log('  Heap Total:', (memUsage.heapTotal / (1024 * 1024)).toFixed(2) + ' MB');
  console.log('  Heap Used:', (memUsage.heapUsed / (1024 * 1024)).toFixed(2) + ' MB');
  console.log('  External:', (memUsage.external / (1024 * 1024)).toFixed(2) + ' MB');
}

// ----------------------
// 1. View Engine & Middleware Setup
// ----------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));

// ----------------------
// 2. Global Helpers & Menu Items
// ----------------------
const buildQueryString = (filters) => {
  return Object.keys(filters)
    .filter((key) => {
      const val = filters[key];
      return val !== undefined && val !== '' && val.length !== 0;
    })
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
      { name: 'Επισκευές', href: '/services/repairs', icon: 'bi-tools' },
      { name: 'Συντήρηση', href: '/services/maintenance', icon: 'bi-wrench-adjustable' },
      { name: 'Εγκαταστάσεις', href: '/services/installations', icon: 'bi-gear' },
      { name: 'Μεταφορείς', href: '/transporters', icon: 'bi-truck-front-fill' },
    ],
  },
  {
    name: 'Τέλη Κυκλοφορίας',
    href: '/telhkykloforias',
    page: 'telhkykloforias',
    icon: 'bi-file-earmark-dollar-fill',
  },
  { name: 'Blog', href: '/blog', page: 'blog', icon: 'bi-journal-text' },
  {
    name: 'Σχετικά με Εμάς',
    href: '/about',
    page: 'about',
    icon: 'bi-info-circle-fill',
  },
  { name: 'Επικοινωνία', href: '/contact', page: 'contact', icon: 'bi-envelope-fill' },
];

app.use((req, res, next) => {
  res.locals.menuItems = menuItems;
  res.locals.activePage = '';
  next();
});

// ----------------------
// 3. Cache Car Data to Prevent Reloading on Every Request
// ----------------------
let allCarsCache = null;

async function getAllCars() {
  // If already cached, return it
  if (allCarsCache) {
    return allCarsCache;
  }

  // Otherwise, load from disk
  console.log('Loading car data into cache...');
  allCarsCache = await loadAllCars();
  // Log memory usage right after loading the cars into cache
  logMemoryUsage();
  return allCarsCache;
}

// ----------------------
// 4. Routes Definition
// ----------------------

// Home route (uses cached data for filtering/pagination)
app.get('/', async (req, res) => {
  // Get cached data (or load if not already cached)
  const allCars = await getAllCars();

  // Grab query parameters for filtering
  const {
    brand,
    model,
    fuelType,
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

  // Start with all cars, then filter out any without valid images
  let filteredCars = allCars.filter(
    (car) =>
      car.images &&
      Array.isArray(car.images) &&
      car.images.some((img) => typeof img === 'string' && img.trim() !== '')
  );

  // --- Filtering logic (case-insensitive) ---
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
  if (fuelType) {
    filteredCars = filteredCars.filter(
      (car) => car.fuelType && car.fuelType.toLowerCase() === fuelType.toLowerCase()
    );
  }
  if (transmission) {
    filteredCars = filteredCars.filter(
      (car) => car.transmission && car.transmission.toLowerCase() === transmission.toLowerCase()
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
      filteredCars = filteredCars.filter((car) => engineType.includes(car.engineType));
    } else {
      filteredCars = filteredCars.filter(
        (car) => car.engineType && car.engineType.toLowerCase() === engineType.toLowerCase()
      );
    }
  }
  if (bodyType) {
    if (Array.isArray(bodyType)) {
      filteredCars = filteredCars.filter((car) => bodyType.includes(car.bodyType));
    } else {
      filteredCars = filteredCars.filter(
        (car) => car.bodyType && car.bodyType.toLowerCase() === bodyType.toLowerCase()
      );
    }
  }
  if (condition) {
    if (Array.isArray(condition)) {
      filteredCars = filteredCars.filter((car) => condition.includes(car.condition));
    } else {
      filteredCars = filteredCars.filter(
        (car) => car.condition && car.condition.toLowerCase() === condition.toLowerCase()
      );
    }
  }
  if (features) {
    if (Array.isArray(features)) {
      filteredCars = filteredCars.filter((car) =>
        features.every((feature) =>
          car.tags.map((tag) => tag.toLowerCase()).includes(feature.toLowerCase())
        )
      );
    } else {
      filteredCars = filteredCars.filter((car) =>
        car.tags.map((tag) => tag.toLowerCase()).includes(features.toLowerCase())
      );
    }
  }

  // Pagination (12 items per page)
  const ITEMS_PER_PAGE = 12;
  const currentPage = parseInt(page, 10) || 1;
  const totalItems = filteredCars.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCars = filteredCars.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Build dropdown arrays from the full (unfiltered) car list
  const brandsMap = new Map();
  allCars.forEach((car) => {
    let carBrand = car.brand ? car.brand.trim() : 'Unknown';
    const lowerB = carBrand.toLowerCase();
    if (!brandsMap.has(lowerB)) {
      brandsMap.set(lowerB, carBrand);
    }
  });
  const brands = Array.from(brandsMap.values()).sort();

  let models = [];
  if (brand) {
    const modelsMap = new Map();
    allCars.forEach((car) => {
      if (
        car.brand &&
        car.model &&
        car.brand.trim().toLowerCase() === brand.trim().toLowerCase() &&
        car.model.trim().toLowerCase() !== 'unknown'
      ) {
        const modelKey = car.model.trim().toLowerCase();
        if (!modelsMap.has(modelKey)) {
          modelsMap.set(modelKey, car.model.trim());
        }
      }
    });
    models = Array.from(modelsMap.values()).sort();
  } else {
    const modelsSet = new Set();
    allCars.forEach((car) => {
      if (car.model && car.model.trim().toLowerCase() !== 'unknown') {
        modelsSet.add(car.model.trim());
      }
    });
    models = Array.from(modelsSet).sort();
  }

  const fuelTypes = [...new Set(allCars.map((car) => car.fuelType).filter(Boolean))].sort();
  const transmissions = [...new Set(allCars.map((car) => car.transmission).filter(Boolean))].sort();
  const colors = [...new Set(allCars.map((car) => car.color).filter(Boolean))].sort();
  const countries = [...new Set(allCars.map((car) => car.country).filter(Boolean))].sort();
  const engineTypes = [...new Set(allCars.map((car) => car.engineType).filter(Boolean))].sort();
  const bodyTypes = [...new Set(allCars.map((car) => car.bodyType).filter(Boolean))].sort();
  const conditions = [...new Set(allCars.map((car) => car.condition).filter(Boolean))].sort();
  const availableFeatures = [...new Set(allCars.flatMap((car) => car.tags))]
    .filter((feature) => feature)
    .sort();

  res.render('cars', {
    title: 'Διαθέσιμα Αυτοκίνητα',
    cars: paginatedCars,
    brands,
    models,
    fuelTypes,
    transmissions,
    colors,
    countries,
    engineTypes,
    bodyTypes,
    conditions,
    availableFeatures,
    selectedBrand: brand || '',
    selectedModel: model || '',
    selectedFuelType: fuelType || '',
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
      fuelType,
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

// --- New Route: Dynamic Streaming Pagination for Cars ---
app.get('/cars-dynamic', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = 20;
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const filterMake = req.query.make; // optional filter by make

  let results = [];
  let count = 0;

  const stream = fs
    .createReadStream(path.join(__dirname, 'data', 'cars.json'), { encoding: 'utf8' })
    .pipe(JSONStream.parse('*')); // Assumes top-level array

  stream.on('data', (item) => {
    if (filterMake && item.make !== filterMake) return;
    if (count < startIndex) {
      count++;
      return;
    }
    if (count >= endIndex) {
      stream.destroy(); // Stop reading further once pageSize is reached
      return;
    }
    results.push(item);
    count++;
  });

  stream.on('end', () => {
    res.json(results);
  });

  stream.on('error', (err) => {
    console.error('Error streaming JSON data:', err);
    res.status(500).json({ error: 'Error processing data.' });
  });
});

// --- New Route: Memory Usage ---
app.get('/memory', (req, res) => {
  const memUsage = process.memoryUsage();
  res.json({
    rss: (memUsage.rss / (1024 * 1024)).toFixed(2) + ' MB',
    heapTotal: (memUsage.heapTotal / (1024 * 1024)).toFixed(2) + ' MB',
    heapUsed: (memUsage.heapUsed / (1024 * 1024)).toFixed(2) + ' MB',
    external: (memUsage.external / (1024 * 1024)).toFixed(2) + ' MB',
  });
});

app.get('/api/models', async (req, res) => {
  const term = req.query.term ? req.query.term.toLowerCase() : '';
  const allCars = await getAllCars();
  const modelsSet = new Set();
  allCars.forEach((car) => {
    if (car.model) {
      const model = car.model.trim();
      if (model.toLowerCase().includes(term)) {
        modelsSet.add(model);
      }
    }
  });
  const models = Array.from(modelsSet).sort();
  res.json(models);
});

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
  const { value, engineCapacity, co2Emissions, year, distance, origin, insurance, customsService } =
    req.body;
  if (!value || !engineCapacity || !co2Emissions || !year || !distance || !origin || !insurance || !customsService) {
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
    customsDuty = vehicleValue * 0.1;
  }
  const transportCost = transportDistance * 1.0;
  let fuelTax = 0;
  if (engineCC <= 1200) {
    fuelTax = co2 <= 100 ? 500 : co2 <= 140 ? 700 : co2 <= 180 ? 900 : 1200;
  } else if (engineCC <= 1600) {
    fuelTax = co2 <= 100 ? 800 : co2 <= 140 ? 1000 : co2 <= 180 ? 1300 : 1600;
  } else if (engineCC <= 2000) {
    fuelTax = co2 <= 100 ? 1200 : co2 <= 140 ? 1500 : co2 <= 180 ? 1800 : 2100;
  } else {
    fuelTax = co2 <= 100 ? 1600 : co2 <= 140 ? 1900 : co2 <= 180 ? 2200 : 2500;
  }
  const vat = (vehicleValue + customsDuty + transportCost) * 0.24;
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

app.get('/contact', (req, res) => {
  res.render('contact', { title: 'Επικοινωνία', activePage: 'contact' });
});

app.get('/about', (req, res) => {
  res.render('about', { title: 'Σχετικά με Εμάς', activePage: 'about' });
});

app.get('/transporters', (req, res) => {
  res.render('transporters', { title: 'Μεταφορείς Αυτοκινήτων', activePage: 'services' });
});

app.get('/vin', (req, res) => {
  res.render('vin', { title: 'Έλεγχος VIN', activePage: 'vin' });
});

app.get('/telhkykloforias', (req, res) => {
  res.render('telhkykloforias', { title: 'Τέλη Κυκλοφορίας', activePage: 'telhkykloforias' });
});

app.get('/blog', (req, res) => {
  res.render('blog', { title: 'Blog', activePage: 'blog' });
});

app.get('/services/repairs', (req, res) => {
  res.render('services/repairs', { title: 'Επισκευές', activePage: 'services' });
});

app.get('/services/maintenance', (req, res) => {
  res.render('services/maintenance', { title: 'Συντήρηση', activePage: 'services' });
});

app.get('/services/installations', (req, res) => {
  res.render('services/installations', { title: 'Εγκαταστάσεις', activePage: 'services' });
});

// 404 Error Handler
app.use((req, res) => {
  res.status(404).render('404', { title: 'Σελίδα Δεν Βρέθηκε', activePage: '' });
});

// ----------------------
// 5. Preload Cars & Start the Server
// ----------------------
(async () => {
  try {
    // Load all cars before starting the server
    await getAllCars();
    console.log('All cars preloaded successfully.');

    // Now start listening
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Error preloading cars:', error);
    process.exit(1); // Exit if preload fails
  }
})();
