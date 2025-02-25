// app.js

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');
const { createReadStream } = require('fs');
const JSONStream = require('JSONStream');

const app = express();
const PORT = process.env.PORT || 3000;

// ----------------------
// 1. View Engine Setup
// ----------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ----------------------
// 2. Middleware Setup
// ----------------------
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));

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
          .map(
            (value) =>
              `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
          )
          .join('&');
      }
      return `${encodeURIComponent(key)}=${encodeURIComponent(filters[key])}`;
    })
    .join('&');
};

app.locals.buildQueryString = buildQueryString;

const extractMainModel = (fullModel) => {
  if (!fullModel || typeof fullModel !== 'string') return 'Unknown';
  const parts = fullModel.trim().split(' ');
  return parts.length > 0 ? parts[0] : 'Unknown';
};

// ----------------------
// 4. Mapping Functions for JSON Data
// ----------------------

// UPDATED mapping for cars.json (and also for kleinanzegencars.json) to match your JSON structure
function mapCarsJson(car) {
  try {
    // Use the "title" field and derive brand & model.
    const title = car.title || 'No Title';
    const brand = car.brand || title.split(' ')[0] || 'No Brand';
    const model = title.split(' ').slice(1).join(' ') || 'No Model';

    // Price: Use numeric "price" if available; otherwise parse "priceText"
    let price = 0;
    if (typeof car.price === 'number') {
      price = car.price;
    } else if (car.priceText && typeof car.priceText === 'string') {
      const priceStr = car.priceText.replace(/[^0-9,\.]/g, '').replace(',', '.');
      price = parseFloat(priceStr) || 0;
    }

    // Mileage: Extract digits from a string like "126.250 km"
    let mileage = null;
    if (car.mileage && typeof car.mileage === 'string') {
      const mileageMatch = car.mileage.match(/([\d.,]+)/);
      if (mileageMatch) {
        mileage = parseInt(mileageMatch[1].replace(/\./g, ''), 10);
      }
    }

    // Transmission: Use as given.
    const transmission = car.transmission || 'N/A';

    // Year: Extract a 4-digit year from a string such as "Juni 2004"
    let year = 'Unknown';
    if (car.year && typeof car.year === 'string') {
      const yearMatch = car.year.match(/(\d{4})/);
      if (yearMatch) {
        year = parseInt(yearMatch[1], 10);
      }
    }

    // Fuel: Use the "fuel" field (e.g., "Benzin")
    const fuelType = car.fuel || 'N/A';

    // Power: Extract the numeric value from "power" (supports kW or PS)
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

    // Images: Use the "images" array; if empty, provide a placeholder.
    let images = [];
    if (Array.isArray(car.images) && car.images.length > 0) {
      images = car.images;
    } else {
      images = ['https://via.placeholder.com/300x200?text=No+Image'];
    }
    const hasImage = images.length > 0 && !images[0].includes('https://via.placeholder.com');

    // Optionally, extract additional details from the "detailPageData" object.
    const location = car.detailPageData && car.detailPageData.location
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
    };
  } catch (error) {
    console.error('Error mapping car:', car, error);
    return null;
  }
}

// Mapping for carsparking.json
function mapCarsParkingJson(car) {
  try {
    let price = 0;
    if (car.price && typeof car.price === 'string') {
      const priceMatch = car.price.replace(',', '.').match(/([\d.,]+)/);
      if (priceMatch) {
        price = parseFloat(
          priceMatch[1].replace(/\./g, '').replace(',', '.')
        );
      }
    }

    let power = null;
    if (car.power && typeof car.power === 'string') {
      const powerMatch = car.power.match(/(\d+)\s*kW/i);
      if (powerMatch) {
        power = parseInt(powerMatch[1], 10);
      }
    }

    let year = 'Unknown';
    if (
      car.productionDate &&
      typeof car.productionDate === 'string' &&
      car.productionDate !== 'NC'
    ) {
      const parsedYear = parseInt(car.productionDate, 10);
      year = isNaN(parsedYear) ? 'Unknown' : parsedYear;
    }

    let mileage = null;
    if (
      car.mileage &&
      typeof car.mileage === 'string' &&
      car.mileage !== 'NC KM'
    ) {
      const mileageMatch = car.mileage.match(/([\d.,]+)\s*km/i);
      if (mileageMatch) {
        mileage = parseInt(
          mileageMatch[1].replace(/\./g, '').replace(',', ''),
          10
        );
      }
    }

    let doors = 4;
    if (car.numberOfDoors && typeof car.numberOfDoors === 'string') {
      const doorsMatch = car.numberOfDoors.match(/(\d+)/);
      if (doorsMatch) {
        doors = parseInt(doorsMatch[1], 10);
      }
    }

    let engineType = 'Unknown';
    if (car.engineType && typeof car.engineType === 'string') {
      engineType = car.engineType;
    }

    let bodyType = 'Unknown';
    if (car.bodyType && typeof car.bodyType === 'string') {
      bodyType = car.bodyType;
    }

    let condition = 'Used';
    if (car.condition && typeof car.condition === 'string') {
      condition = car.condition;
    }

    const model = extractMainModel(car.model);

    let images = [];
    if (Array.isArray(car.images) && car.images.length > 0) {
      images = car.images;
    } else if (car.imageUrl && typeof car.imageUrl === 'string') {
      images = [car.imageUrl];
    } else {
      images = ['https://via.placeholder.com/300x200?text=No+Image'];
    }
    const hasImage =
      images.length > 0 && !images[0].includes('https://via.placeholder.com');

    return {
      title: `${car.brand || 'Unknown'} ${car.model || 'Unknown'} ${
        car.engine || ''
      }`.trim() || 'Unknown',
      link: car.url || '#',
      price: price || 0,
      priceWithoutTax: null,
      power: power,
      year: year,
      mileage: mileage,
      transmission:
        car.transmission && typeof car.transmission === 'string'
          ? car.transmission.trim()
          : 'Unknown',
      fuelType:
        car.fuelType && typeof car.fuelType === 'string'
          ? car.fuelType.trim()
          : 'Unknown',
      condition: condition,
      tags:
        car.description && typeof car.description === 'string'
          ? car.description
              .split(' ')
              .filter((word) => !['Year', 'Kilometer', 'Fuel', 'type'].includes(word))
          : [],
      deliveryInfo:
        car.deliveryInfo && typeof car.deliveryInfo === 'object'
          ? {
              label: car.deliveryInfo.label || '',
              price: car.deliveryInfo.price || '',
            }
          : { label: '', price: '' },
      images: images,
      brand: car.brand || 'Unknown',
      model: model || 'Unknown',
      color:
        car.color && typeof car.color === 'string'
          ? car.color
          : 'Unknown',
      country:
        car.country && typeof car.country === 'string'
          ? car.country
          : 'Unknown',
      doors: doors,
      bodyType: bodyType,
      engineType: engineType,
      hasImage: hasImage,
    };
  } catch (error) {
    console.error('Error mapping carsparking.json entry:', car);
    console.error(error);
    return null;
  }
}

function mapCaaarrssssssJson(car) {
  try {
    let price = 0;
    if (car.price && typeof car.price === 'string') {
      const priceMatch = car.price.replace(',', '.').match(/([\d.,]+)/);
      if (priceMatch) {
        price = parseFloat(
          priceMatch[1].replace(/\./g, '').replace(',', '.')
        );
      }
    }

    let power = null;
    if (car.power && typeof car.power === 'string') {
      const powerMatch = car.power.match(/(\d+)\s*kW/i);
      if (powerMatch) {
        power = parseInt(powerMatch[1], 10);
      }
    }

    let year = 'Unknown';
    if (car.registrationDate && typeof car.registrationDate === 'string') {
      const dateParts = car.registrationDate.split('/');
      if (dateParts.length >= 3) {
        const parsedYear = parseInt(dateParts[2], 10);
        year = isNaN(parsedYear) ? 'Unknown' : parsedYear;
      }
    }

    let mileage = null;
    if (car.mileage && typeof car.mileage === 'string') {
      const mileageMatch = car.mileage.match(/([\d.,]+)\s*km/i);
      if (mileageMatch) {
        mileage = parseInt(
          mileageMatch[1].replace(/\./g, '').replace(',', ''),
          10
        );
      }
    }

    let doors = 4;
    if (
      car.tags &&
      Array.isArray(car.tags) &&
      car.tags.some(
        (tag) =>
          typeof tag === 'string' && tag.toLowerCase().includes('door')
      )
    ) {
      const doorsTag = car.tags.find(
        (tag) =>
          typeof tag === 'string' && tag.toLowerCase().includes('door')
      );
      const doorsMatch = doorsTag.match(/(\d+)/);
      if (doorsMatch) {
        doors = parseInt(doorsMatch[1], 10);
      }
    }

    let engineType = 'Unknown';
    if (car.engineType && typeof car.engineType === 'string') {
      engineType = car.engineType;
    }

    let bodyType = 'Unknown';
    if (car.bodyType && typeof car.bodyType === 'string') {
      bodyType = car.bodyType;
    }

    let condition = 'Used';
    if (car.condition && typeof car.condition === 'string') {
      condition = car.condition;
    }

    const model = extractMainModel(car.model);

    let images = [];
    if (Array.isArray(car.images) && car.images.length > 0) {
      images = car.images;
    } else if (car.imageUrl && typeof car.imageUrl === 'string') {
      images = [car.imageUrl];
    } else {
      images = ['https://via.placeholder.com/300x200?text=No+Image'];
    }
    const hasImage =
      images.length > 0 && !images[0].includes('https://via.placeholder.com');

    return {
      title: `${car.brand || 'Unknown'} ${car.model || 'Unknown'} ${car.engine || ''}`
        .trim() || 'Unknown',
      link: car.url || '#',
      price: price || 0,
      priceWithoutTax: null,
      power: power,
      year: year,
      mileage: mileage,
      transmission:
        car.transmission && typeof car.transmission === 'string'
          ? car.transmission.trim()
          : 'Unknown',
      fuelType:
        car.fuelType && typeof car.fuelType === 'string'
          ? car.fuelType.trim()
          : 'Unknown',
      condition: condition,
      tags: Array.isArray(car.tags) ? car.tags : [],
      deliveryInfo:
        car.deliveryInfo && typeof car.deliveryInfo === 'object'
          ? {
              label: car.deliveryInfo.label || '',
              price: car.deliveryInfo.price || '',
            }
          : { label: '', price: '' },
      images: images,
      brand: car.brand || 'Unknown',
      model: model || 'Unknown',
      color:
        car.color && typeof car.color === 'string'
          ? car.color
          : 'Unknown',
      country:
        car.country && typeof car.country === 'string'
          ? car.country
          : 'Unknown',
      doors: doors,
      bodyType: bodyType,
      engineType: engineType,
      hasImage: hasImage,
    };
  } catch (error) {
    console.error('Error mapping caaarrssssss.json entry:', car);
    console.error(error);
    return null;
  }
}

function mapOpenLaneJson(car) {
  try {
    const nameParts =
      car.name && typeof car.name === 'string' ? car.name.split(' ') : [];
    const brand = nameParts[0] || 'Unknown';
    const fullModel =
      nameParts.slice(1, nameParts.length - 1).join(' ') || 'Unknown';
    const model = extractMainModel(fullModel);

    let price = 0;
    if (car.price && typeof car.price === 'string') {
      price = parseFloat(car.price);
      if (isNaN(price)) price = 0;
    }

    let power = null;
    if (car.horsepower && typeof car.horsepower === 'string') {
      const powerMatch = car.horsepower.match(/(\d+)\s*kW/i);
      if (powerMatch) {
        power = parseInt(powerMatch[1], 10);
      }
    }

    let year = 'Unknown';
    if (car.dateFirstRegistration && typeof car.dateFirstRegistration === 'string') {
      const dateParts = car.dateFirstRegistration.split('/');
      if (dateParts.length >= 3) {
        const parsedYear = parseInt(dateParts[2], 10);
        year = isNaN(parsedYear) ? 'Unknown' : parsedYear;
      }
    }

    let fuelType = 'Unknown';
    if (car.emissions && typeof car.emissions === 'string') {
      if (car.emissions.toLowerCase().includes('eu6')) {
        fuelType = 'Diesel';
      } else {
        fuelType = 'Petrol';
      }
    }

    let mileage = null;
    let doors = 4;
    let bodyType =
      car.carType && typeof car.carType === 'string'
        ? car.carType
        : 'Unknown';
    let engineType = 'Unknown';
    if (fuelType.toLowerCase() === 'diesel') {
      engineType = 'Diesel';
    } else if (fuelType.toLowerCase() === 'petrol') {
      engineType = 'Petrol';
    }

    let condition = 'Used';
    if (car.originalPrice && typeof car.originalPrice === 'string' && car.originalPrice.trim() !== '') {
      condition = 'New';
    }

    let priceWithoutTax = null;
    if (car.originalPrice && typeof car.originalPrice === 'string' && car.originalPrice.trim() !== '') {
      priceWithoutTax = parseFloat(car.originalPrice.replace(/[^0-9.,]/g, '').replace(',', '.'));
      if (isNaN(priceWithoutTax)) priceWithoutTax = null;
    }

    let images = [];
    if (car.imageUrl && typeof car.imageUrl === 'string' && car.imageUrl.trim() !== '') {
      images = [car.imageUrl];
    } else {
      images = ['https://via.placeholder.com/300x200?text=No+Image'];
    }
    const hasImage =
      images.length > 0 && !images[0].includes('https://via.placeholder.com');

    return {
      title: car.name || 'Unknown',
      link: car.link || '#',
      price: price || 0,
      priceWithoutTax: priceWithoutTax,
      power: power,
      year: year,
      mileage: mileage,
      transmission: 'Unknown',
      fuelType: fuelType || 'Unknown',
      condition: condition,
      tags: Array.isArray(car.premiumOffers) ? car.premiumOffers : [],
      deliveryInfo: { label: '', price: '' },
      images: images,
      brand: brand || 'Unknown',
      model: model || 'Unknown',
      color: 'Unknown',
      country:
        car.location && typeof car.location === 'string'
          ? car.location
          : 'Unknown',
      doors: doors,
      bodyType: bodyType,
      engineType: engineType,
      hasImage: hasImage,
    };
  } catch (error) {
    console.error('Error mapping openlane.json entry:', car);
    console.error(error);
    return null;
  }
}

function mapHertzCarsJson(car) {
  try {
    const title =
      car['Μοντέλο'] && typeof car['Μοντέλο'] === 'string'
        ? car['Μοντέλο']
        : 'Δε Διατίθεται';
    const titleParts = title.split(' ');
    const brand = titleParts[0] || 'Δε Διατίθεται';
    const fullModel = titleParts.slice(1).join(' ') || 'Δε Διατίθεται';
    const model = extractMainModel(fullModel);

    let price = 0;
    if (car['Τιμή'] && typeof car['Τιμή'] === 'string') {
      const sanitizedPrice = car['Τιμή'].replace(/[^0-9.,]/g, '').trim();
      const priceMatch = sanitizedPrice.match(/([\d.,]+)/);
      if (priceMatch) {
        price = parseFloat(
          priceMatch[1].replace(/\./g, '').replace(',', '.')
        );
        if (isNaN(price)) price = 0;
      }
    }

    let year = 'Unknown';
    if (car['Έτος'] && typeof car['Έτος'] === 'string') {
      const parsedYear = parseInt(car['Έτος'], 10);
      year = isNaN(parsedYear) ? 'Unknown' : parsedYear;
    }

    const country =
      car['Τοποθεσία'] && typeof car['Τοποθεσία'] === 'string'
        ? car['Τοποθεσία']
        : 'Δε Διατίθεται';

    let images = [];
    if (car['URL_Εικόνας'] && typeof car['URL_Εικόνας'] === 'string') {
      images = [car['URL_Εικόνας']];
    } else {
      images = ['https://via.placeholder.com/300x200?text=No+Image'];
    }
    const hasImage =
      images.length > 0 && !images[0].includes('https://via.placeholder.com');

    const link =
      car['Link'] && typeof car['Link'] === 'string' ? car['Link'] : '#';

    return {
      title: title,
      link: link,
      price: price || 0,
      priceWithoutTax: null,
      power: null,
      year: year,
      mileage: null,
      transmission: 'Δε Διατίθεται',
      fuelType: 'Δε Διατίθεται',
      condition: 'Used',
      tags: [],
      deliveryInfo: { label: '', price: '' },
      images: images,
      brand: brand,
      model: model,
      color: 'Δε Διατίθεται',
      country: country,
      doors: 4,
      bodyType: 'Δε Διατίθεται',
      engineType: 'Δε Διατίθεται',
      hasImage: hasImage,
    };
  } catch (error) {
    console.error('Error mapping hertzcars.json entry:', car);
    console.error(error);
    return null;
  }
}

function mapAutoscoutCarsJson(car) {
  try {
    const rawTitle =
      car.title && typeof car.title === 'string'
        ? car.title
        : 'Δε Διατίθεται';
    const title = rawTitle.replace(/\n/g, ' ').trim();
    const link =
      car.link && typeof car.link === 'string' ? car.link : '#';

    let price = 0;
    if (car.price && typeof car.price === 'string') {
      const priceMatch = car.price.match(/€\s?([\d.,]+)/);
      if (priceMatch) {
        price = parseFloat(
          priceMatch[1].replace(/\./g, '').replace(',', '.')
        );
        if (isNaN(price)) price = 0;
      }
    }

    let mileage = null;
    if (car.mileage && typeof car.mileage === 'string') {
      const mileageMatch = car.mileage.match(/([\d.,]+)\s*km/i);
      if (mileageMatch) {
        mileage = parseInt(
          mileageMatch[1].replace(/\./g, '').replace(',', ''),
          10
        );
      }
    }

    let year = 'Unknown';
    if (car.year && typeof car.year === 'string' && car.year.trim() !== '') {
      const yearMatch = car.year.match(/(\d{4})/);
      if (yearMatch) {
        year = parseInt(yearMatch[1], 10);
      } else if (car.year.includes('First Registration')) {
        year = 'New';
      }
    }

    let power = null;
    if (car.power && typeof car.power === 'string') {
      const powerMatch = car.power.match(/([\d.]+)\s*kW/i);
      if (powerMatch) {
        power = parseInt(powerMatch[1].replace(/\./g, ''), 10);
      }
    }

    const fuelType =
      car.fuel && typeof car.fuel === 'string'
        ? car.fuel
        : 'Δε Διατίθεται';

    const transmission =
      car.transmission && typeof car.transmission === 'string'
        ? car.transmission
        : 'Δε Διατίθεται';

    const titleParts = title.split(' ');
    const brand = titleParts[0] || 'Δε Διατίθεται';
    const model = extractMainModel(titleParts.slice(1).join(' ')) || 'Δε Διατίθεται';

    let images = [];
    if (Array.isArray(car.images) && car.images.length > 0) {
      images = car.images;
    } else if (car.imageUrl && typeof car.imageUrl === 'string') {
      images = [car.imageUrl];
    } else {
      images = ['https://via.placeholder.com/300x200?text=No+Image'];
    }
    const hasImage =
      images.length > 0 && !images[0].includes('https://via.placeholder.com');

    let condition = 'Used';
    if (year === 'New') {
      condition = 'New';
    }

    return {
      title: title,
      link: link,
      price: price || 0,
      priceWithoutTax: null,
      power: power,
      year: year,
      mileage: mileage,
      transmission: transmission,
      fuelType: fuelType,
      condition: condition,
      tags: [],
      deliveryInfo: { label: '', price: '' },
      images: images,
      brand: brand || 'Δε Διατίθεται',
      model: model || 'Δε Διατίθεται',
      color: 'Δε Διατίθεται',
      country: 'Δε Διατίθεται',
      doors: 4,
      bodyType: 'Δε Διατίθεται',
      engineType: 'Δε Διατίθεται',
      hasImage: hasImage,
    };
  } catch (error) {
    console.error('Error mapping autoscoutcars.json entry:', car);
    console.error(error);
    return null;
  }
}

function mapAClassJson(car) {
  try {
    const title =
      car.title && typeof car.title === 'string'
        ? car.title
        : 'Δε Διατίθεται';
    const link =
      car.link && typeof car.link === 'string' ? car.link : '#';

    let price = 0;
    if (car.price && typeof car.price === 'string') {
      if (car.price.toLowerCase() === 'vb') {
        price = 0;
      } else {
        const priceMatch = car.price.match(/€\s?([\d.,]+)/);
        if (priceMatch) {
          price = parseFloat(
            priceMatch[1].replace(/\./g, '').replace(',', '.')
          );
          if (isNaN(price)) price = 0;
        }
      }
    }

    const priceWithoutTax = null;
    const power = null;

    let year = 'Unknown';
    if (car.registrationDate && typeof car.registrationDate === 'string') {
      const dateParts = car.registrationDate.split('/');
      if (dateParts.length === 2) {
        const parsedYear = parseInt(dateParts[1], 10);
        year = isNaN(parsedYear) ? 'Unknown' : parsedYear;
      }
    }

    let mileage = null;
    if (car.mileage && typeof car.mileage === 'string') {
      const mileageMatch = car.mileage.match(/([\d.,]+)\s*km/i);
      if (mileageMatch) {
        mileage = parseInt(
          mileageMatch[1].replace(/\./g, '').replace(',', ''),
          10
        );
      }
    }

    const transmission = 'Δε Διατίθεται';
    const fuelType = 'Δε Διατίθεται';
    const condition = 'Used';
    const tags = Array.isArray(car.tags) ? car.tags : [];
    const deliveryInfo =
      car.deliveryInfo && typeof car.deliveryInfo === 'object'
        ? {
            label: car.deliveryInfo.label || '',
            price: car.deliveryInfo.price || '',
          }
        : { label: '', price: '' };

    let images = [];
    if (Array.isArray(car.images) && car.images.length > 0) {
      images = car.images;
    } else {
      images = ['https://via.placeholder.com/300x200?text=No+Image'];
    }
    const hasImage =
      images.length > 0 && !images[0].includes('https://via.placeholder.com');

    const titleParts = title.split(' ');
    const brand = titleParts[0] || 'Δε Διατίθεται';
    const model = extractMainModel(titleParts.slice(1).join(' ')) || 'Δε Διατίθεται';
    const color = 'Δε Διατίθεται';
    const country = 'Germany';
    const doors = 4;
    const bodyType = 'Δε Διατίθεται';
    const engineType = 'Δε Διατίθεται';

    return {
      title: title,
      link: link,
      price: price || 0,
      priceWithoutTax: priceWithoutTax,
      power: power,
      year: year,
      mileage: mileage,
      transmission: transmission,
      fuelType: fuelType,
      condition: condition,
      tags: tags,
      deliveryInfo: deliveryInfo,
      images: images,
      brand: brand || 'Δε Διατίθεται',
      model: model || 'Δε Διατίθεται',
      color: color,
      country: country,
      doors: doors,
      bodyType: bodyType,
      engineType: engineType,
      hasImage: hasImage,
    };
  } catch (error) {
    console.error('Error mapping aclass.json entry:', car);
    console.error(error);
    return null;
  }
}

// ----------------------
// 5. JSON Streaming Helper Function
// ----------------------
function loadCarsFromFileInChunks(filePath, mapFn) {
  return new Promise((resolve, reject) => {
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        console.warn(`File not found: ${filePath}. Skipping...`);
        return resolve([]);
      }
      const results = [];
      const stream = createReadStream(filePath, { encoding: 'utf8' });
      const parser = JSONStream.parse('*'); // parse each item from the top-level array
      stream.pipe(parser);
      parser.on('data', (carItem) => {
        try {
          const mapped = mapFn(carItem);
          if (mapped) results.push(mapped);
        } catch (mapError) {
          console.error(`Error mapping item in ${filePath}:`, mapError);
        }
      });
      parser.on('end', () => resolve(results));
      parser.on('error', (parseErr) => reject(parseErr));
    });
  });
}

// ----------------------
// 6. Load and Normalize All Car Data (Streaming Version)
// ----------------------
async function loadAllCars() {
  const dataDir = path.join(__dirname, 'data');

  // Previous JSON files
  const carsJsonPath = path.join(dataDir, 'cars.json');
  const carsParkingJsonPath = path.join(dataDir, 'carsparking.json');
  const caaarrssssssJsonPath = path.join(dataDir, 'caaarrssssss.json');
  const openlaneJsonPath = path.join(dataDir, 'openlane.json');
  const hertzcarsJsonPath = path.join(dataDir, 'hertzcars.json');
  const cargrJsonPath = path.join(dataDir, 'cargr.json');
  const autoscoutcarsJsonPath = path.join(dataDir, 'autoscoutcars.json');
  const aclassJsonPath = path.join(dataDir, 'aclass.json');

  // New JSON file with updated structure
  const kleinanzeJsonPath = path.join(dataDir, 'kleinanzegencars.json');

  let carsJson = [];
  let carsParkingJson = [];
  let caaarrssssssJson = [];
  let openlaneJson = [];
  let hertzcarsJson = [];
  let cargrJson = [];
  let autoscoutcarsJson = [];
  let aclassJson = [];
  let kleinanzeJson = [];

  try {
    carsJson = await loadCarsFromFileInChunks(carsJsonPath, mapCarsJson);
    console.log(`cars.json entries mapped: ${carsJson.length}`);
  } catch (err) {
    console.error('Error reading/streaming cars.json:', err);
  }

  try {
    carsParkingJson = await loadCarsFromFileInChunks(carsParkingJsonPath, mapCarsParkingJson);
    console.log(`carsparking.json entries mapped: ${carsParkingJson.length}`);
  } catch (err) {
    console.error('Error reading/streaming carsparking.json:', err);
  }

  try {
    caaarrssssssJson = await loadCarsFromFileInChunks(caaarrssssssJsonPath, mapCaaarrssssssJson);
    console.log(`caaarrssssss.json entries mapped: ${caaarrssssssJson.length}`);
  } catch (err) {
    console.error('Error reading/streaming caaarrssssss.json:', err);
  }

  try {
    openlaneJson = await loadCarsFromFileInChunks(openlaneJsonPath, mapOpenLaneJson);
    console.log(`openlane.json entries mapped: ${openlaneJson.length}`);
  } catch (err) {
    console.error('Error reading/streaming openlane.json:', err);
  }

  try {
    hertzcarsJson = await loadCarsFromFileInChunks(hertzcarsJsonPath, mapHertzCarsJson);
    console.log(`hertzcars.json entries mapped: ${hertzcarsJson.length}`);
  } catch (err) {
    console.error('Error reading/streaming hertzcars.json:', err);
  }

  try {
    cargrJson = await loadCarsFromFileInChunks(cargrJsonPath, mapCargrJson);
    console.log(`cargr.json entries mapped: ${cargrJson.length}`);
  } catch (err) {
    console.error('Error reading/streaming cargr.json:', err);
  }

  try {
    autoscoutcarsJson = await loadCarsFromFileInChunks(autoscoutcarsJsonPath, mapAutoscoutCarsJson);
    console.log(`autoscoutcars.json entries mapped: ${autoscoutcarsJson.length}`);
  } catch (err) {
    console.error('Error reading/streaming autoscoutcars.json:', err);
  }

  try {
    aclassJson = await loadCarsFromFileInChunks(aclassJsonPath, mapAClassJson);
    console.log(`aclass.json entries mapped: ${aclassJson.length}`);
  } catch (err) {
    console.error('Error reading/streaming aclass.json:', err);
  }

  try {
    kleinanzeJson = await loadCarsFromFileInChunks(kleinanzeJsonPath, mapCarsJson);
    console.log(`kleinanzegencars.json entries mapped: ${kleinanzeJson.length}`);
  } catch (err) {
    console.error('Error reading/streaming kleinanzegencars.json:', err);
  }

  const allCars = [
    ...kleinanzeJson,
    ...carsJson,
    ...carsParkingJson,
    ...caaarrssssssJson,
    ...openlaneJson,
    ...hertzcarsJson,
    ...cargrJson,
    ...autoscoutcarsJson,
    ...aclassJson,
  ];

  allCars.sort((a, b) => {
    if (a.hasImage && !b.hasImage) return -1;
    if (!a.hasImage && b.hasImage) return 1;
    return 0;
  });

  const carsWithImages = allCars.filter((car) => car.hasImage).length;
  const carsWithoutImages = allCars.length - carsWithImages;

  console.log(`Total Cars Loaded: ${allCars.length}`);
  console.log(`Cars with Images: ${carsWithImages}`);
  console.log(`Cars without Images: ${carsWithoutImages}`);

  return allCars;
}

// ----------------------
// 7. Initialize and Store All Cars (Async)
// ----------------------
let allCars = [];
(async () => {
  allCars = await loadAllCars();
})().catch((err) => {
  console.error('Error during loadAllCars():', err);
});

// ----------------------
// 8. Menu Items Definition
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
// 9. Routes Definition
// ----------------------
app.get('/', (req, res) => {
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

  let filteredCars = allCars;
  if (brand) {
    filteredCars = filteredCars.filter(
      (car) => car.brand.toLowerCase() === brand.toLowerCase()
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
      (car) => car.fuelType.toLowerCase() === fuelType.toLowerCase()
    );
  }
  if (transmission) {
    filteredCars = filteredCars.filter(
      (car) => car.transmission.toLowerCase() === transmission.toLowerCase()
    );
  }
  if (color) {
    filteredCars = filteredCars.filter(
      (car) => car.color.toLowerCase() === color.toLowerCase()
    );
  }
  if (country) {
    filteredCars = filteredCars.filter(
      (car) => car.country.toLowerCase() === country.toLowerCase()
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
        (car) => car.engineType.toLowerCase() === engineType.toLowerCase()
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
        (car) => car.bodyType.toLowerCase() === bodyType.toLowerCase()
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
        (car) => car.condition.toLowerCase() === condition.toLowerCase()
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

  const ITEMS_PER_PAGE = 12;
  const currentPage = parseInt(page, 10) || 1;
  const totalItems = filteredCars.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedCars = filteredCars.slice(startIndex, endIndex);

  const brands = [...new Set(allCars.map((car) => car.brand).filter(Boolean))].sort();
  let models = [...new Set(
    allCars
      .filter((car) => car.model && car.model.toLowerCase() !== 'unknown')
      .map((car) => car.model)
      .filter(Boolean)
  )].sort();
  const fuelTypes = [...new Set(allCars.map((car) => car.fuelType).filter(Boolean))].sort();
  const transmissions = [...new Set(allCars.map((car) => car.transmission).filter(Boolean))].sort();
  const colors = [...new Set(allCars.map((car) => car.color).filter(Boolean))].sort();
  const countries = [...new Set(allCars.map((car) => car.country).filter(Boolean))].sort();
  const engineTypes = [...new Set(allCars.map((car) => car.engineType).filter(Boolean))].sort();
  const bodyTypes = [...new Set(allCars.map((car) => car.bodyType).filter(Boolean))].sort();
  const conditions = [...new Set(allCars.map((car) => car.condition).filter(Boolean))].sort();
  const availableFeatures = [...new Set(allCars.flatMap((car) => car.tags))].filter((feature) => feature).sort();

  if (brand) {
    models = [...new Set(
      allCars
        .filter((car) => car.brand.toLowerCase() === brand.toLowerCase() && car.model && car.model.toLowerCase() !== 'unknown')
        .map((car) => car.model)
        .filter(Boolean)
    )].sort();
  }

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
    selectedFeatures: Array.isArray(features) ? features : (features ? [features] : []),
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
      features: Array.isArray(features) ? features : (features ? [features] : []),
    },
    activePage: 'cars',
    success: req.query.success || '',
    error: req.query.error || '',
  });
});

// ----------------------
// 10. Customs Calculations Routes
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
    const customsRate = 0.10;
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
  const totalCustoms = vat + customsDuty + fuelTax + transportCost + insuranceCost + customsServiceCost;

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
    calculationResult: calculationResult,
  });
});

// ----------------------
// 11. Other Routes
// ----------------------
app.get('/contact', (req, res) => {
  res.render('contact', {
    title: 'Επικοινωνία',
    activePage: 'contact',
  });
});

app.get('/about', (req, res) => {
  res.render('about', {
    title: 'Σχετικά με Εμάς',
    activePage: 'about',
  });
});

app.get('/transporters', (req, res) => {
  res.render('transporters', {
    title: 'Μεταφορείς Αυτοκινήτων',
    activePage: 'services',
  });
});

app.get('/vin', (req, res) => {
  res.render('vin', {
    title: 'Έλεγχος VIN',
    activePage: 'vin',
  });
});

app.get('/telhkykloforias', (req, res) => {
  res.render('telhkykloforias', {
    title: 'Τέλη Κυκλοφορίας',
    activePage: 'telhkykloforias',
  });
});

app.get('/blog', (req, res) => {
  res.render('blog', {
    title: 'Blog',
    activePage: 'blog',
  });
});

// ----------------------
// 12. Services Routes
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
// 13. 404 Error Handler
// ----------------------
app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Σελίδα Δεν Βρέθηκε',
    activePage: '',
  });
});

// ----------------------
// 14. Start the Server
// ----------------------
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
