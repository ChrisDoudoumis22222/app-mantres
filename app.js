// app.js

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ----------------------
// 1. View Engine Setup
// ----------------------

// Set EJS as the templating engine
app.set('view engine', 'ejs');

// Set the views directory relative to the project root
app.set('views', path.join(__dirname, 'views'));

// ----------------------
// 2. Middleware Setup
// ----------------------

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to parse URL-encoded bodies (for form submissions)
app.use(bodyParser.urlencoded({ extended: false }));

// ----------------------
// 3. Helper Functions
// ----------------------

// Helper function to build query strings
const buildQueryString = (filters) => {
    return Object.keys(filters)
        .filter(key => filters[key] !== undefined && filters[key] !== '' && filters[key].length !== 0)
        .map(key => {
            if (Array.isArray(filters[key])) {
                return filters[key]
                    .map(value => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
                    .join('&');
            }
            return `${encodeURIComponent(key)}=${encodeURIComponent(filters[key])}`;
        })
        .join('&');
};

// Make buildQueryString available in EJS templates
app.locals.buildQueryString = buildQueryString;

// Helper function to extract the main model from a full model name
const extractMainModel = (fullModel) => {
    if (!fullModel || typeof fullModel !== 'string') return "Unknown";
    // Assuming main model is the first part, e.g., "A200" from "Mercedes A200"
    const parts = fullModel.trim().split(' ');
    return parts.length > 0 ? parts[0] : "Unknown";
};

// ----------------------
// 4. Mapping Functions for JSON Data
// ----------------------

// Mapping for cars.json
function mapCarsJson(car) {
    try {
        // Extract brand and model from title (Assuming format: "Brand Model ...")
        const titleParts = car.title.split(' ');
        const brand = titleParts[0] || "Unknown";
        const fullModel = titleParts.slice(1).join(' ') || "Unknown";
        const model = extractMainModel(fullModel);

        // Parse price
        let price = 0;
        if (car.price && typeof car.price === 'string') {
            // Remove all non-digit characters except for '.' and ','
            const sanitizedPrice = car.price.replace(/[^0-9.,]/g, '').replace(',', '.');
            price = parseFloat(sanitizedPrice);
            if (isNaN(price)) price = 0;
        }

        // Parse priceWithoutTax
        let priceWithoutTax = null;
        if (car.priceWithoutTax && typeof car.priceWithoutTax === 'string' && !["not deductible", "δε διατίθεται"].includes(car.priceWithoutTax.toLowerCase())) {
            const sanitizedPriceWithoutTax = car.priceWithoutTax.replace(/[^0-9.,]/g, '').replace(',', '.');
            priceWithoutTax = parseFloat(sanitizedPriceWithoutTax);
            if (isNaN(priceWithoutTax)) priceWithoutTax = null;
        }

        // Parse power
        let power = null;
        if (car.power && typeof car.power === 'string') {
            const powerMatch = car.power.match(/(\d+)\s*kW/i);
            if (powerMatch) {
                power = parseInt(powerMatch[1], 10);
            }
        }

        // Parse year from registrationDate (format "MM/YYYY" or similar)
        let year = "Unknown";
        if (car.registrationDate && typeof car.registrationDate === 'string') {
            const dateParts = car.registrationDate.split('/');
            if (dateParts.length === 2) {
                const parsedYear = parseInt(dateParts[1], 10);
                year = isNaN(parsedYear) ? "Unknown" : parsedYear;
            } else if (dateParts.length === 1) { // In case only year is provided
                const parsedYear = parseInt(dateParts[0], 10);
                year = isNaN(parsedYear) ? "Unknown" : parsedYear;
            }
        }

        // Parse mileage (e.g., "20 310 km")
        let mileage = null;
        if (car.mileage && typeof car.mileage === 'string') {
            const mileageMatch = car.mileage.match(/([\d.,]+)\s*km/i);
            if (mileageMatch) {
                mileage = parseInt(mileageMatch[1].replace(/[^0-9]/g, ''), 10);
            }
        }

        // Parse transmission
        const transmission = car.transmission && typeof car.transmission === 'string'
            ? car.transmission
            : "Δε Διατίθεται";

        // Parse fuelType
        const fuelType = car.fuelType && typeof car.fuelType === 'string'
            ? car.fuelType
            : "Δε Διατίθεται";

        // Parse tags and additionalTags
        const tags = Array.isArray(car.tags) ? car.tags : [];
        const additionalTags = Array.isArray(car.additionalTags) ? car.additionalTags : [];
        const allTags = [...tags, ...additionalTags];

        // Delivery Info
        const deliveryInfo = car.deliveryInfo && typeof car.deliveryInfo === 'object'
            ? {
                label: car.deliveryInfo.label || "",
                price: car.deliveryInfo.price || ""
            }
            : { label: "", price: "" };

        // Images
        let images = [];
        if (Array.isArray(car.images) && car.images.length > 0) {
            images = car.images.map(img => typeof img === 'string' ? img.split(' ')[0] : 'https://via.placeholder.com/300x200?text=No+Image');
        } else if (car.imageUrl && typeof car.imageUrl === 'string') {
            images = [car.imageUrl];
        } else {
            images = ['https://via.placeholder.com/300x200?text=No+Image'];
        }

        // Determine if the car has a valid image
        const hasImage = images.length > 0 && !images[0].includes('https://via.placeholder.com');

        // Parse additional fields if necessary
        const color = car.color && typeof car.color === 'string'
            ? car.color
            : "Δε Διατίθεται";

        const country = car.country && typeof car.country === 'string'
            ? car.country
            : "Δε Διατίθεται"; // Assuming 'country' field exists separately

        // Number of doors (assuming 4 if not specified in tags)
        let doors = 4;
        const doorTag = allTags.find(tag => typeof tag === 'string' && (tag.toLowerCase().includes('door') || tag.toLowerCase().includes('πόρτα')));
        if (doorTag) {
            const doorsMatch = doorTag.match(/(\d+)/);
            if (doorsMatch) {
                doors = parseInt(doorsMatch[1], 10);
            }
        }

        // Body Type (Assuming it's part of tags or set as "Δε Διατίθεται")
        let bodyType = "Δε Διατίθεται";
        const possibleBodyTypes = ['Sedan', 'Hatchback', 'SUV', 'Coupe', 'Convertible', 'Van', 'Wagon', 'Truck'];
        for (const type of possibleBodyTypes) {
            if (allTags.includes(type)) {
                bodyType = type;
                break;
            }
        }

        // Engine Type
        let engineType = "Δε Διατίθεται";
        const possibleEngineTypes = ['Petrol', 'Diesel', 'Electric', 'Hybrid'];
        for (const type of possibleEngineTypes) {
            if (fuelType.toLowerCase().includes(type.toLowerCase())) {
                engineType = type;
                break;
            }
        }

        // Condition
        let condition = "Used"; // Default
        if (car.condition && typeof car.condition === 'string') {
            condition = car.condition;
        }

        return {
            title: car.title || "Δε Διατίθεται",
            link: car.link || "#",
            price: price || 0,
            priceWithoutTax: priceWithoutTax,
            power: power,
            year: year,
            mileage: mileage,
            transmission: transmission,
            fuelType: fuelType,
            condition: condition,
            tags: allTags,
            deliveryInfo: deliveryInfo,
            images: images,
            brand: brand || "Δε Διατίθεται",
            model: model || "Δε Διατίθεται",
            color: color,
            country: country,
            doors: doors,
            bodyType: bodyType,
            engineType: engineType,
            hasImage: hasImage
        };
    } catch (error) {
        console.error("Error mapping cars.json entry:", car);
        console.error(error);
        return null;
    }
}

// Mapping for carsparking.json
function mapCarsParkingJson(car) {
    try {
        // Parse price
        let price = 0;
        if (car.price && typeof car.price === 'string') {
            const priceMatch = car.price.replace(',', '.').match(/([\d.,]+)/);
            if (priceMatch) {
                price = parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.'));
            }
        }

        // Parse power from engine or description
        let power = null;
        if (car.power && typeof car.power === 'string') {
            const powerMatch = car.power.match(/(\d+)\s*kW/i);
            if (powerMatch) {
                power = parseInt(powerMatch[1], 10);
            }
        }

        // Parse year from productionDate
        let year = "Unknown";
        if (car.productionDate && typeof car.productionDate === 'string' && car.productionDate !== "NC") {
            const parsedYear = parseInt(car.productionDate, 10);
            year = isNaN(parsedYear) ? "Unknown" : parsedYear;
        }

        // Parse mileage
        let mileage = null;
        if (car.mileage && typeof car.mileage === 'string' && car.mileage !== "NC KM") {
            const mileageMatch = car.mileage.match(/([\d.,]+)\s*km/i);
            if (mileageMatch) {
                mileage = parseInt(mileageMatch[1].replace(/\./g, '').replace(',', ''), 10);
            }
        }

        // Number of doors
        let doors = 4;
        if (car.numberOfDoors && typeof car.numberOfDoors === 'string') {
            const doorsMatch = car.numberOfDoors.match(/(\d+)/);
            if (doorsMatch) {
                doors = parseInt(doorsMatch[1], 10);
            }
        }

        // Engine Type
        let engineType = "Unknown";
        if (car.engineType && typeof car.engineType === 'string') {
            engineType = car.engineType;
        }

        // Body Type
        let bodyType = "Unknown";
        if (car.bodyType && typeof car.bodyType === 'string') {
            bodyType = car.bodyType;
        }

        // Condition
        let condition = "Used";
        if (car.condition && typeof car.condition === 'string') {
            condition = car.condition;
        }

        // Extract main model
        const model = extractMainModel(car.model);

        // Determine if the car has a valid image
        let images = [];
        if (Array.isArray(car.images) && car.images.length > 0) {
            images = car.images;
        } else if (car.imageUrl && typeof car.imageUrl === 'string') {
            images = [car.imageUrl];
        } else {
            images = ['https://via.placeholder.com/300x200?text=No+Image'];
        }
        const hasImage = images.length > 0 && !images[0].includes('https://via.placeholder.com');

        return {
            title: `${car.brand || "Unknown"} ${car.model || "Unknown"} ${car.engine || ""}`.trim() || "Unknown",
            link: car.url || "#",
            price: price || 0,
            priceWithoutTax: null, // Not available
            power: power,
            year: year,
            mileage: mileage,
            transmission: car.transmission && typeof car.transmission === 'string'
                ? car.transmission.trim()
                : "Unknown",
            fuelType: car.fuelType && typeof car.fuelType === 'string'
                ? car.fuelType.trim()
                : "Unknown",
            condition: condition,
            tags: car.description && typeof car.description === 'string'
                ? car.description.split(' ').filter(word => !['Year', 'Kilometer', 'Fuel', 'type'].includes(word))
                : [],
            deliveryInfo: car.deliveryInfo && typeof car.deliveryInfo === 'object'
                ? {
                    label: car.deliveryInfo.label || "",
                    price: car.deliveryInfo.price || ""
                }
                : { label: "", price: "" },
            images: images,
            brand: car.brand || "Unknown",
            model: model || "Unknown",
            color: car.color && typeof car.color === 'string'
                ? car.color
                : "Unknown",
            country: car.country && typeof car.country === 'string'
                ? car.country
                : "Unknown",
            doors: doors,
            bodyType: bodyType,
            engineType: engineType,
            hasImage: hasImage
        };
    } catch (error) {
        console.error("Error mapping carsparking.json entry:", car);
        console.error(error);
        return null;
    }
}

// Mapping for caaarrssssss.json
function mapCaaarrssssssJson(car) {
    try {
        // Parse price
        let price = 0;
        if (car.price && typeof car.price === 'string') {
            const priceMatch = car.price.replace(',', '.').match(/([\d.,]+)/);
            if (priceMatch) {
                price = parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.'));
            }
        }

        // Parse power
        let power = null;
        if (car.power && typeof car.power === 'string') {
            const powerMatch = car.power.match(/(\d+)\s*kW/i);
            if (powerMatch) {
                power = parseInt(powerMatch[1], 10);
            }
        }

        // Parse year from registrationDate
        let year = "Unknown";
        if (car.registrationDate && typeof car.registrationDate === 'string') {
            const dateParts = car.registrationDate.split('/');
            if (dateParts.length >= 3) {
                const parsedYear = parseInt(dateParts[2], 10); // Assuming format "DD/MM/YYYY"
                year = isNaN(parsedYear) ? "Unknown" : parsedYear;
            }
        }

        // Parse mileage
        let mileage = null;
        if (car.mileage && typeof car.mileage === 'string') {
            const mileageMatch = car.mileage.match(/([\d.,]+)\s*km/i);
            if (mileageMatch) {
                mileage = parseInt(mileageMatch[1].replace(/\./g, '').replace(',', ''), 10);
            }
        }

        // Number of doors (assuming 4 if not specified)
        let doors = 4;
        if (car.tags && Array.isArray(car.tags) && car.tags.some(tag => typeof tag === 'string' && tag.toLowerCase().includes('door'))) {
            const doorsTag = car.tags.find(tag => typeof tag === 'string' && tag.toLowerCase().includes('door'));
            const doorsMatch = doorsTag.match(/(\d+)/);
            if (doorsMatch) {
                doors = parseInt(doorsMatch[1], 10);
            }
        }

        // Engine Type
        let engineType = "Unknown";
        if (car.engineType && typeof car.engineType === 'string') {
            engineType = car.engineType;
        }

        // Body Type
        let bodyType = "Unknown";
        if (car.bodyType && typeof car.bodyType === 'string') {
            bodyType = car.bodyType;
        }

        // Condition
        let condition = "Used";
        if (car.condition && typeof car.condition === 'string') {
            condition = car.condition;
        }

        // Extract main model
        const model = extractMainModel(car.model);

        // Determine if the car has a valid image
        let images = [];
        if (Array.isArray(car.images) && car.images.length > 0) {
            images = car.images;
        } else if (car.imageUrl && typeof car.imageUrl === 'string') {
            images = [car.imageUrl];
        } else {
            images = ['https://via.placeholder.com/300x200?text=No+Image'];
        }
        const hasImage = images.length > 0 && !images[0].includes('https://via.placeholder.com');

        return {
            title: `${car.brand || "Unknown"} ${car.model || "Unknown"} ${car.engine || ""}`.trim() || "Unknown",
            link: car.url || "#",
            price: price || 0,
            priceWithoutTax: null, // Not available
            power: power,
            year: year,
            mileage: mileage,
            transmission: car.transmission && typeof car.transmission === 'string'
                ? car.transmission.trim()
                : "Unknown",
            fuelType: car.fuelType && typeof car.fuelType === 'string'
                ? car.fuelType.trim()
                : "Unknown",
            condition: condition,
            tags: Array.isArray(car.tags) ? car.tags : [],
            deliveryInfo: car.deliveryInfo && typeof car.deliveryInfo === 'object'
                ? {
                    label: car.deliveryInfo.label || "",
                    price: car.deliveryInfo.price || ""
                }
                : { label: "", price: "" },
            images: images,
            brand: car.brand || "Unknown",
            model: model || "Unknown",
            color: car.color && typeof car.color === 'string'
                ? car.color
                : "Unknown",
            country: car.country && typeof car.country === 'string'
                ? car.country
                : "Unknown",
            doors: doors,
            bodyType: bodyType,
            engineType: engineType,
            hasImage: hasImage
        };
    } catch (error) {
        console.error("Error mapping caaarrssssss.json entry:", car);
        console.error(error);
        return null;
    }
}

// Mapping for openlane.json
function mapOpenLaneJson(car) {
    try {
        // Extract brand and model from name (Assuming format: "Brand Model ...")
        const nameParts = car.name && typeof car.name === 'string' ? car.name.split(' ') : [];
        const brand = nameParts[0] || "Unknown";
        const fullModel = nameParts.slice(1, nameParts.length - 1).join(' ') || "Unknown";
        const model = extractMainModel(fullModel);

        // Parse price
        let price = 0;
        if (car.price && typeof car.price === 'string') {
            price = parseFloat(car.price);
            if (isNaN(price)) price = 0;
        }

        // Parse power from horsepower field
        let power = null;
        if (car.horsepower && typeof car.horsepower === 'string') {
            const powerMatch = car.horsepower.match(/(\d+)\s*kW/i);
            if (powerMatch) {
                power = parseInt(powerMatch[1], 10);
            }
        }

        // Parse year from dateFirstRegistration
        let year = "Unknown";
        if (car.dateFirstRegistration && typeof car.dateFirstRegistration === 'string') {
            const dateParts = car.dateFirstRegistration.split('/');
            if (dateParts.length >= 3) {
                const parsedYear = parseInt(dateParts[2], 10); // Assuming format "DD/MM/YYYY"
                year = isNaN(parsedYear) ? "Unknown" : parsedYear;
            }
        }

        // Emissions parsing (assuming it contains g/km)
        let fuelType = "Unknown";
        if (car.emissions && typeof car.emissions === 'string') {
            if (car.emissions.toLowerCase().includes('eu6')) {
                fuelType = "Diesel"; // Assuming based on emissions format
            } else {
                fuelType = "Petrol"; // Default assumption
            }
        }

        // Parse mileage if available (openlane.json doesn't have mileage, so set to null or a default value)
        let mileage = null; // Not provided in openlane.json

        // Number of doors (assuming 4 if not specified)
        let doors = 4; // openlane.json doesn't specify number of doors

        // Body Type
        let bodyType = car.carType && typeof car.carType === 'string'
            ? car.carType
            : "Unknown";

        // Engine Type (Assuming based on emissions or horsepower, set as "Diesel" or "Petrol")
        let engineType = "Unknown";
        if (fuelType.toLowerCase() === 'diesel') {
            engineType = "Diesel";
        } else if (fuelType.toLowerCase() === 'petrol') {
            engineType = "Petrol";
        }

        // Condition (Assuming all cars are used since originalPrice is null)
        let condition = "Used";
        if (car.originalPrice && typeof car.originalPrice === 'string' && car.originalPrice.trim() !== "") {
            condition = "New";
        }

        // Parse priceWithoutTax (originalPrice)
        let priceWithoutTax = null;
        if (car.originalPrice && typeof car.originalPrice === 'string' && car.originalPrice.trim() !== "") {
            priceWithoutTax = parseFloat(car.originalPrice.replace(/[^0-9.,]/g, '').replace(',', '.'));
            if (isNaN(priceWithoutTax)) priceWithoutTax = null;
        }

        // Determine if the car has a valid image
        let images = [];
        if (car.imageUrl && typeof car.imageUrl === 'string' && car.imageUrl.trim() !== "") {
            images = [car.imageUrl];
        } else {
            images = ['https://via.placeholder.com/300x200?text=No+Image'];
        }
        const hasImage = images.length > 0 && !images[0].includes('https://via.placeholder.com');

        return {
            title: car.name || "Unknown",
            link: car.link || "#",
            price: price || 0,
            priceWithoutTax: priceWithoutTax,
            power: power,
            year: year,
            mileage: mileage,
            transmission: "Unknown", // openlane.json doesn't provide transmission information
            fuelType: fuelType || "Unknown",
            condition: condition,
            tags: Array.isArray(car.premiumOffers) ? car.premiumOffers : [],
            deliveryInfo: { label: "", price: "" }, // openlane.json doesn't provide delivery info
            images: images,
            brand: brand || "Unknown",
            model: model || "Unknown",
            color: "Unknown", // openlane.json doesn't provide color information
            country: car.location && typeof car.location === 'string'
                ? car.location
                : "Unknown",
            doors: doors,
            bodyType: bodyType,
            engineType: engineType,
            hasImage: hasImage
        };
    } catch (error) {
        console.error("Error mapping openlane.json entry:", car);
        console.error(error);
        return null;
    }
}

// Mapping for hertzcars.json
function mapHertzCarsJson(car) {
    try {
        // Extract brand and model from "Μοντέλο"
        const title = car["Μοντέλο"] && typeof car["Μοντέλο"] === 'string'
            ? car["Μοντέλο"]
            : "Δε Διατίθεται";
        const titleParts = title.split(' ');
        const brand = titleParts[0] || "Δε Διατίθεται";
        const fullModel = titleParts.slice(1).join(' ') || "Δε Διατίθεται";
        const model = extractMainModel(fullModel);

        // Parse price
        let price = 0;
        if (car["Τιμή"] && typeof car["Τιμή"] === 'string') {
            const sanitizedPrice = car["Τιμή"].replace(/[^0-9.,]/g, '').replace(',', '.');
            price = parseFloat(sanitizedPrice);
            if (isNaN(price)) price = 0;
        }

        // Parse year
        let year = "Unknown";
        if (car["Έτος"] && typeof car["Έτος"] === 'string') {
            const parsedYear = parseInt(car["Έτος"], 10);
            year = isNaN(parsedYear) ? "Unknown" : parsedYear;
        }

        // Location
        const country = car["Τοποθεσία"] && typeof car["Τοποθεσία"] === 'string'
            ? car["Τοποθεσία"]
            : "Δε Διατίθεται";

        // Image URL
        let images = [];
        if (car["URL_Εικόνας"] && typeof car["URL_Εικόνας"] === 'string') {
            images = [car["URL_Εικόνας"]];
        } else {
            images = ['https://via.placeholder.com/300x200?text=No+Image'];
        }
        const hasImage = images.length > 0 && !images[0].includes('https://via.placeholder.com');

        // Link
        const link = car["Link"] && typeof car["Link"] === 'string'
            ? car["Link"]
            : "#";

        return {
            title: title,
            link: link,
            price: price || 0,
            priceWithoutTax: null, // Not available
            power: null, // Not available
            year: year,
            mileage: null, // Not available
            transmission: "Δε Διατίθεται",
            fuelType: "Δε Διατίθεται",
            condition: "Used",
            tags: [],
            deliveryInfo: { label: "", price: "" },
            images: images,
            brand: brand,
            model: model,
            color: "Δε Διατίθεται",
            country: country,
            doors: 4, // Default value
            bodyType: "Δε Διατίθεται",
            engineType: "Δε Διατίθεται",
            hasImage: hasImage
        };
    } catch (error) {
        console.error("Error mapping hertzcars.json entry:", car);
        console.error(error);
        return null;
    }
}

// Mapping for autoscoutcars.json
function mapAutoscoutCarsJson(car) {
    try {
        // Extract and map fields from autoscoutcars.json
        const rawTitle = car.title && typeof car.title === 'string'
            ? car.title
            : "Δε Διατίθεται";
        const title = rawTitle.replace(/\n/g, ' ').trim(); // Remove newline characters
        const link = car.link && typeof car.link === 'string'
            ? car.link
            : "#";

        // Parse price (e.g., "€ 309,900.-" => 309900)
        let price = 0;
        if (car.price && typeof car.price === 'string') {
            const priceMatch = car.price.match(/€\s?([\d.,]+)/);
            if (priceMatch) {
                price = parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.'));
                if (isNaN(price)) price = 0;
            }
        }

        // Parse mileage (e.g., "398 km" => 398)
        let mileage = null;
        if (car.mileage && typeof car.mileage === 'string') {
            const mileageMatch = car.mileage.match(/([\d.,]+)\s*km/i);
            if (mileageMatch) {
                mileage = parseInt(mileageMatch[1].replace(/\./g, '').replace(',', ''), 10);
            }
        }

        // Parse year
        let year = "Unknown";
        if (car.year && typeof car.year === 'string' && car.year.trim() !== "") {
            const yearMatch = car.year.match(/(\d{4})/);
            if (yearMatch) {
                year = parseInt(yearMatch[1], 10);
            } else if (car.year.includes('First Registration')) {
                year = "New";
            }
        }

        // Parse power (e.g., "490 kW (666 hp)" => 490)
        let power = null;
        if (car.power && typeof car.power === 'string') {
            const powerMatch = car.power.match(/([\d.]+)\s*kW/i);
            if (powerMatch) {
                power = parseInt(powerMatch[1].replace(/\./g, ''), 10);
            }
        }

        // Fuel Type
        const fuelType = car.fuel && typeof car.fuel === 'string'
            ? car.fuel
            : "Δε Διατίθεται";

        // Transmission
        const transmission = car.transmission && typeof car.transmission === 'string'
            ? car.transmission
            : "Δε Διατίθεται";

        // Brand and Model extraction from title
        const titleParts = title.split(' ');
        const brand = titleParts[0] || "Δε Διατίθεται";
        const model = extractMainModel(titleParts.slice(1).join(' ')) || "Δε Διατίθεται";

        // Determine if the car has a valid image
        let images = [];
        if (Array.isArray(car.images) && car.images.length > 0) {
            images = car.images;
        } else if (car.imageUrl && typeof car.imageUrl === 'string') {
            images = [car.imageUrl];
        } else {
            images = ['https://via.placeholder.com/300x200?text=No+Image'];
        }
        const hasImage = images.length > 0 && !images[0].includes('https://via.placeholder.com');

        // Condition
        let condition = "Used";
        if (year === "New") {
            condition = "New";
        }

        return {
            title: title,
            link: link,
            price: price || 0,
            priceWithoutTax: null, // Not available
            power: power,
            year: year,
            mileage: mileage,
            transmission: transmission,
            fuelType: fuelType,
            condition: condition,
            tags: [], // Not available
            deliveryInfo: { label: "", price: "" }, // Not available
            images: images,
            brand: brand || "Δε Διατίθεται",
            model: model || "Δε Διατίθεται",
            color: "Δε Διατίθεται", // Not available
            country: "Δε Διατίθεται", // Not available (since address is "No Dealer Address")
            doors: 4, // Default value
            bodyType: "Δε Διατίθεται", // Not available
            engineType: "Δε Διατίθεται", // Not available
            hasImage: hasImage
        };
    } catch (error) {
        console.error("Error mapping autoscoutcars.json entry:", car);
        console.error(error);
        return null;
    }
}

// Mapping for cargr.json
function mapCargrJson(car) {
    try {
        // Extract and map fields from cargr.json
        const title = car["Τίτλος"] && typeof car["Τίτλος"] === 'string'
            ? car["Τίτλος"]
            : "Δε Διατίθεται";
        const link = car["Σύνδεσμος"] && typeof car["Σύνδεσμος"] === 'string'
            ? car["Σύνδεσμος"]
            : "#";

        // Parse price (e.g., "€ 309,900.-" => 309900)
        let price = 0;
        if (car["Τιμή"] && typeof car["Τιμή"] === 'string') {
            // Handle duplicated '€' signs and other anomalies
            const sanitizedPrice = car["Τιμή"].replace(/€/g, '').trim();
            const priceMatch = sanitizedPrice.match(/([\d.,]+)/);
            if (priceMatch) {
                price = parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.'));
                if (isNaN(price)) price = 0;
            }
        }

        // Parse mileage (e.g., "398 km" => 398)
        let mileage = null;
        if (car["mileage"] && typeof car["mileage"] === 'string') {
            const mileageMatch = car["mileage"].match(/([\d.,]+)\s*km/i);
            if (mileageMatch) {
                mileage = parseInt(mileageMatch[1].replace(/\./g, '').replace(',', ''), 10);
            }
        }

        // Parse year and other details from "ΕπιπλέονΠληροφορίες" (e.g., "3/2004, 214.550 χλμ, 1.364 cc, 90 bhp, Βενζίνη")
        let year = "Unknown";
        let engineCapacity = null;
        let power = null;
        let fuelType = "Unknown";

        if (car["ΕπιπλέονΠληροφορίες"] && typeof car["ΕπιπλέονΠληροφορίες"] === 'string') {
            const infoParts = car["ΕπιπλέονΠληροφορίες"].split(',').map(part => part.trim());
            
            // Extract Year
            if (infoParts.length >= 1) {
                const dateMatch = infoParts[0].match(/(\d{1,2})\/(\d{4})/);
                if (dateMatch) {
                    year = parseInt(dateMatch[2], 10) || "Unknown";
                }
            }

            // Extract Mileage (if not already extracted)
            if (!mileage && infoParts.length >= 2) {
                const mileageMatch = infoParts[1].match(/([\d.]+)\s*χλμ/i);
                if (mileageMatch) {
                    mileage = parseInt(mileageMatch[1].replace(/\./g, ''), 10) || null;
                }
            }

            // Extract Engine Capacity
            if (infoParts.length >= 3) {
                const engineMatch = infoParts[2].match(/([\d.]+)\s*cc/i);
                if (engineMatch) {
                    engineCapacity = parseInt(engineMatch[1].replace(/\./g, ''), 10) || null;
                }
            }

            // Extract Power
            if (infoParts.length >= 4) {
                const powerMatch = infoParts[3].match(/([\d.]+)\s*bhp/i);
                if (powerMatch) {
                    power = parseInt(powerMatch[1].replace(/\./g, ''), 10) || null;
                }
            }

            // Extract Fuel Type
            if (infoParts.length >= 5) {
                fuelType = infoParts[4] || "Unknown";
            }
        }

        // Extract brand and model from title
        const titleParts = title.split(' ');
        const brand = titleParts[0] || "Δε Διατίθεται";
        const model = extractMainModel(titleParts.slice(1).join(' ')) || "Δε Διατίθεται";

        // Determine if the car has a valid image
        let images = [];
        if (car["URLΕικόνας"] && typeof car["URLΕικόνας"] === 'string') {
            images = [car["URLΕικόνας"]];
        } else {
            images = ['https://via.placeholder.com/300x200?text=No+Image'];
        }
        const hasImage = images.length > 0 && !images[0].includes('https://via.placeholder.com');

        // Location
        const country = car["Τοποθεσία"] && typeof car["Τοποθεσία"] === 'string'
            ? car["Τοποθεσία"]
            : "Δε Διατίθεται";

        return {
            title: title,
            link: link,
            price: price || 0,
            priceWithoutTax: null, // Not available
            power: power,
            year: year,
            mileage: mileage,
            transmission: "Δε Διατίθεται", // Not available
            fuelType: fuelType,
            condition: "Used", // Assuming all cars are used
            tags: [], // Not available
            deliveryInfo: { label: "", price: "" }, // Not available
            images: images,
            brand: brand || "Δε Διατίθεται",
            model: model || "Δε Διατίθεται",
            color: "Δε Διατίθεται", // Not available
            country: country,
            doors: 4, // Default value
            bodyType: "Δε Διατίθεται", // Not available
            engineType: "Δε Διατίθεται", // Not available
            hasImage: hasImage
        };
    } catch (error) {
        console.error("Error mapping cargr.json entry:", car);
        console.error(error);
        return null;
    }
}

// Mapping for aclass.json
function mapAClassJson(car) {
    try {
        // Extract and map fields from aclass.json
        const title = car.title && typeof car.title === 'string'
            ? car.title
            : "Δε Διατίθεται";
        const link = car.link && typeof car.link === 'string'
            ? car.link
            : "#";

        // Parse price, handle "VB" as 0
        let price = 0;
        if (car.price && typeof car.price === 'string') {
            if (car.price.toLowerCase() === 'vb') {
                price = 0;
            } else {
                const priceMatch = car.price.match(/€\s?([\d.,]+)/);
                if (priceMatch) {
                    price = parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.'));
                    if (isNaN(price)) price = 0;
                }
            }
        }

        // priceWithoutTax is "Not deductible" -> set to null
        const priceWithoutTax = null;

        // power is null in data
        const power = null;

        // Parse year from registrationDate (format "MM/YYYY")
        let year = "Unknown";
        if (car.registrationDate && typeof car.registrationDate === 'string') {
            const dateParts = car.registrationDate.split('/');
            if (dateParts.length === 2) {
                const parsedYear = parseInt(dateParts[1], 10);
                year = isNaN(parsedYear) ? "Unknown" : parsedYear;
            }
        }

        // Parse mileage (e.g., "184 000 km")
        let mileage = null;
        if (car.mileage && typeof car.mileage === 'string') {
            const mileageMatch = car.mileage.match(/([\d.,]+)\s*km/i);
            if (mileageMatch) {
                mileage = parseInt(mileageMatch[1].replace(/\./g, '').replace(',', ''), 10);
            }
        }

        // transmission is null in data
        const transmission = "Δε Διατίθεται";

        // fuelType is null in data
        const fuelType = "Δε Διατίθεται";

        // condition is "Used"
        const condition = "Used";

        // tags as is
        const tags = Array.isArray(car.tags) ? car.tags : [];

        // deliveryInfo as is
        const deliveryInfo = car.deliveryInfo && typeof car.deliveryInfo === 'object'
            ? {
                label: car.deliveryInfo.label || "",
                price: car.deliveryInfo.price || ""
            }
            : { label: "", price: "" };

        // images: empty array -> use placeholder
        let images = [];
        if (Array.isArray(car.images) && car.images.length > 0) {
            images = car.images;
        } else {
            images = ['https://via.placeholder.com/300x200?text=No+Image'];
        }

        // Determine if the car has a valid image
        const hasImage = images.length > 0 && !images[0].includes('https://via.placeholder.com');

        // brand and model extraction from title
        const titleParts = title.split(' ');
        const brand = titleParts[0] || "Δε Διατίθεται";
        const model = extractMainModel(titleParts.slice(1).join(' ')) || "Δε Διατίθεται";

        // color is "Δε Διατίθεται"
        const color = "Δε Διατίθεται";

        // country: "Germany", based on 'deliveryInfo.label'
        const country = "Germany";

        // doors: default to 4
        const doors = 4;

        // bodyType: "Δε Διατίθεται"
        const bodyType = "Δε Διατίθεται";

        // engineType: "Δε Διατίθεται"
        const engineType = "Δε Διατίθεται";

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
            brand: brand || "Δε Διατίθεται",
            model: model || "Δε Διατίθεται",
            color: color,
            country: country,
            doors: doors,
            bodyType: bodyType,
            engineType: engineType,
            hasImage: hasImage
        };
    } catch (error) {
        console.error("Error mapping aclass.json entry:", car);
        console.error(error);
        return null;
    }
}

// ----------------------
// 5. Load and Normalize All Car Data
// ----------------------
function loadAllCars() {
    const dataDir = path.join(__dirname, 'data'); // Ensure your JSON files are in the 'data' directory
    const carsJsonPath = path.join(dataDir, 'cars.json');
    const carsParkingJsonPath = path.join(dataDir, 'carsparking.json');
    const caaarrssssssJsonPath = path.join(dataDir, 'caaarrssssss.json');
    const openlaneJsonPath = path.join(dataDir, 'openlane.json'); // Path to openlane.json
    const hertzcarsJsonPath = path.join(dataDir, 'hertzcars.json'); // Path to hertzcars.json
    const cargrJsonPath = path.join(dataDir, 'cargr.json'); // Path to cargr.json
    const autoscoutcarsJsonPath = path.join(dataDir, 'autoscoutcars.json'); // Path to autoscoutcars.json
    const aclassJsonPath = path.join(dataDir, 'aclass.json'); // Path to aclass.json

    let carsJson = [];
    let carsParkingJson = [];
    let caaarrssssssJson = [];
    let openlaneJson = []; // Array to hold openlane.json data
    let hertzcarsJson = []; // Array to hold hertzcars.json data
    let cargrJson = []; // Array to hold cargr.json data
    let autoscoutcarsJson = []; // Array to hold autoscoutcars.json data
    let aclassJson = []; // Array to hold aclass.json data

    // Load cars.json
    try {
        const carsData = fs.readFileSync(carsJsonPath, 'utf-8');
        const parsedCars = JSON.parse(carsData);
        carsJson = parsedCars.map(mapCarsJson).filter(car => car !== null);
        console.log(`cars.json entries mapped: ${carsJson.length}`);
    } catch (err) {
        console.error("Error reading or parsing cars.json:", err);
    }

    // Load carsparking.json
    try {
        const carsParkingData = fs.readFileSync(carsParkingJsonPath, 'utf-8');
        const parsedCarsParking = JSON.parse(carsParkingData);
        carsParkingJson = parsedCarsParking.map(mapCarsParkingJson).filter(car => car !== null);
        console.log(`carsparking.json entries mapped: ${carsParkingJson.length}`);
    } catch (err) {
        console.error("Error reading or parsing carsparking.json:", err);
    }

    // Load caaarrssssss.json
    try {
        const caaarrssssssData = fs.readFileSync(caaarrssssssJsonPath, 'utf-8');
        const parsedCaaarrssssss = JSON.parse(caaarrssssssData);
        caaarrssssssJson = parsedCaaarrssssss.map(mapCaaarrssssssJson).filter(car => car !== null);
        console.log(`caaarrssssss.json entries mapped: ${caaarrssssssJson.length}`);
    } catch (err) {
        console.error("Error reading or parsing caaarrssssss.json:", err);
    }

    // Load openlane.json
    try {
        const openlaneData = fs.readFileSync(openlaneJsonPath, 'utf-8');
        // Remove trailing comma if present to ensure valid JSON
        const sanitizedOpenlaneData = openlaneData.trim().endsWith(',') ? openlaneData.trim().slice(0, -1) : openlaneData;
        const parsedOpenlane = JSON.parse(sanitizedOpenlaneData);
        openlaneJson = parsedOpenlane.map(mapOpenLaneJson).filter(car => car !== null);
        console.log(`openlane.json entries mapped: ${openlaneJson.length}`);
    } catch (err) {
        console.error("Error reading or parsing openlane.json:", err);
    }

    // Load hertzcars.json
    try {
        const hertzcarsData = fs.readFileSync(hertzcarsJsonPath, 'utf-8');
        console.log("hertzcars.json successfully read.");
        const parsedHertzcars = JSON.parse(hertzcarsData);
        hertzcarsJson = parsedHertzcars.map(mapHertzCarsJson).filter(car => car !== null);
        console.log(`hertzcars.json entries mapped: ${hertzcarsJson.length}`);
    } catch (err) {
        console.error("Error reading or parsing hertzcars.json:", err);
        // Continue without hertzcarsJson
        hertzcarsJson = [];
    }

    // Load cargr.json
    try {
        const cargrData = fs.readFileSync(cargrJsonPath, 'utf-8');
        console.log("cargr.json successfully read.");
        const parsedCargr = JSON.parse(cargrData);
        cargrJson = parsedCargr.map(mapCargrJson).filter(car => car !== null);
        console.log(`cargr.json entries mapped: ${cargrJson.length}`);
    } catch (err) {
        console.error("Error reading or parsing cargr.json:", err);
        // Continue without cargrJson
        cargrJson = [];
    }

    // Load autoscoutcars.json
    try {
        const autoscoutcarsData = fs.readFileSync(autoscoutcarsJsonPath, 'utf-8');
        console.log("autoscoutcars.json successfully read.");
        const parsedAutoscoutcars = JSON.parse(autoscoutcarsData);
        autoscoutcarsJson = parsedAutoscoutcars.map(mapAutoscoutCarsJson).filter(car => car !== null);
        console.log(`autoscoutcars.json entries mapped: ${autoscoutcarsJson.length}`);
    } catch (err) {
        console.error("Error reading or parsing autoscoutcars.json:", err);
        // Continue without autoscoutcarsJson
        autoscoutcarsJson = [];
    }

    // Load aclass.json
    try {
        const aclassData = fs.readFileSync(aclassJsonPath, 'utf-8');
        console.log("aclass.json successfully read.");
        const parsedAClass = JSON.parse(aclassData);
        aclassJson = parsedAClass.map(mapAClassJson).filter(car => car !== null);
        console.log(`aclass.json entries mapped: ${aclassJson.length}`);
    } catch (err) {
        console.error("Error reading or parsing aclass.json:", err);
        // Continue without aclassJson
        aclassJson = [];
    }

    // Merge all cars into a single array
    const allCars = [...carsJson, ...carsParkingJson, ...caaarrssssssJson, ...openlaneJson, ...hertzcarsJson, ...cargrJson, ...autoscoutcarsJson, ...aclassJson];

    // Sort cars so that those with images appear first
    allCars.sort((a, b) => {
        if (a.hasImage && !b.hasImage) return -1;
        if (!a.hasImage && b.hasImage) return 1;
        return 0;
    });

    // Optional: Log the number of cars with and without images
    const carsWithImages = allCars.filter(car => car.hasImage).length;
    const carsWithoutImages = allCars.length - carsWithImages;
    console.log(`Total Cars Loaded: ${allCars.length}`);
    console.log(`Cars with Images: ${carsWithImages}`);
    console.log(`Cars without Images: ${carsWithoutImages}`);

    return allCars;
}

// Load all cars at startup
const allCars = loadAllCars();

// ----------------------
// 6. Menu Items Definition
// ----------------------

// Define the menuItems array for the navbar
const menuItems = [
    { 
        name: 'Αυτοκίνητα', 
        href: '/', 
        page: 'cars', 
        icon: 'bi-car-front-fill' 
    },
    { 
        name: 'Υπολογισμός Εκτελωνισμού', 
        href: '/customs-calculations', 
        page: 'customs-calculations',
        icon: 'bi-calculator-fill' 
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
        ]
    },
    { 
        name: 'Τέλη Κυκλοφορίας', 
        href: '/telhkykloforias', 
        page: 'telhkykloforias',
        icon: 'bi-file-earmark-dollar-fill' 
    },
    { 
        name: 'Blog', 
        href: '/blog', 
        page: 'blog',
        icon: 'bi-journal-text' 
    },
    { 
        name: 'Σχετικά με Εμάς', 
        href: '/about', 
        page: 'about',
        icon: 'bi-info-circle-fill'
    },
    { 
        name: 'Επικοινωνία', 
        href: '/contact', 
        page: 'contact',
        icon: 'bi-envelope-fill'
    },
    // Add more items as needed
];

// ----------------------
// 7. Middleware to Inject menuItems and buildQueryString
// ----------------------

// Middleware to make menuItems available in all templates
app.use((req, res, next) => {
    res.locals.menuItems = menuItems;
    res.locals.activePage = ''; // Default value; will be set in routes
    next();
});

// ----------------------
// 8. Routes Definition
// ----------------------

// Route: Home Page - Display Cars with Filters and Pagination
app.get('/', (req, res) => {
    // Extract query parameters for filtering
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
        page
    } = req.query;

    // Define filters based on query parameters
    let filteredCars = allCars;

    if (brand) {
        filteredCars = filteredCars.filter(car => car.brand.toLowerCase() === brand.toLowerCase());
    }

    if (model) {
        const lowerModel = model.toLowerCase();
        filteredCars = filteredCars.filter(car => car.model && car.model.toLowerCase().includes(lowerModel));
    }

    if (fuelType) {
        filteredCars = filteredCars.filter(car => car.fuelType.toLowerCase() === fuelType.toLowerCase());
    }

    if (transmission) {
        filteredCars = filteredCars.filter(car => car.transmission.toLowerCase() === transmission.toLowerCase());
    }

    if (color) {
        filteredCars = filteredCars.filter(car => car.color.toLowerCase() === color.toLowerCase());
    }

    if (country) {
        filteredCars = filteredCars.filter(car => car.country.toLowerCase() === country.toLowerCase());
    }

    if (numberOfDoors) {
        const doors = parseInt(numberOfDoors, 10);
        if (!isNaN(doors)) {
            filteredCars = filteredCars.filter(car => car.doors === doors);
        }
    }

    if (minYear) {
        const minY = parseInt(minYear, 10);
        if (!isNaN(minY)) {
            filteredCars = filteredCars.filter(car => car.year !== "Unknown" && car.year >= minY);
        }
    }

    if (maxYear) {
        const maxY = parseInt(maxYear, 10);
        if (!isNaN(maxY)) {
            filteredCars = filteredCars.filter(car => car.year !== "Unknown" && car.year <= maxY);
        }
    }

    if (minMileage) {
        const minM = parseInt(minMileage, 10);
        if (!isNaN(minM)) {
            filteredCars = filteredCars.filter(car => car.mileage !== null && car.mileage >= minM);
        }
    }

    if (maxMileage) {
        const maxM = parseInt(maxMileage, 10);
        if (!isNaN(maxM)) {
            filteredCars = filteredCars.filter(car => car.mileage !== null && car.mileage <= maxM);
        }
    }

    if (minPower) {
        const minP = parseInt(minPower, 10);
        if (!isNaN(minP)) {
            filteredCars = filteredCars.filter(car => car.power !== null && car.power >= minP);
        }
    }

    if (maxPower) {
        const maxP = parseInt(maxPower, 10);
        if (!isNaN(maxP)) {
            filteredCars = filteredCars.filter(car => car.power !== null && car.power <= maxP);
        }
    }

    if (minPrice) {
        const minPr = parseFloat(minPrice);
        if (!isNaN(minPr)) {
            filteredCars = filteredCars.filter(car => car.price && car.price >= minPr);
        }
    }

    if (maxPrice) {
        const maxPr = parseFloat(maxPrice);
        if (!isNaN(maxPr)) {
            filteredCars = filteredCars.filter(car => car.price && car.price <= maxPr);
        }
    }

    // Additional Filters

    if (engineType) {
        if (Array.isArray(engineType)) {
            filteredCars = filteredCars.filter(car => engineType.includes(car.engineType));
        } else {
            filteredCars = filteredCars.filter(car => car.engineType.toLowerCase() === engineType.toLowerCase());
        }
    }

    if (bodyType) {
        if (Array.isArray(bodyType)) {
            filteredCars = filteredCars.filter(car => bodyType.includes(car.bodyType));
        } else {
            filteredCars = filteredCars.filter(car => car.bodyType.toLowerCase() === bodyType.toLowerCase());
        }
    }

    if (condition) {
        if (Array.isArray(condition)) {
            filteredCars = filteredCars.filter(car => condition.includes(car.condition));
        } else {
            filteredCars = filteredCars.filter(car => car.condition.toLowerCase() === condition.toLowerCase());
        }
    }

    if (features) {
        if (Array.isArray(features)) {
            filteredCars = filteredCars.filter(car => {
                return features.every(feature => car.tags.map(tag => tag.toLowerCase()).includes(feature.toLowerCase()));
            });
        } else {
            filteredCars = filteredCars.filter(car => car.tags.map(tag => tag.toLowerCase()).includes(features.toLowerCase()));
        }
    }

    // Pagination settings
    const ITEMS_PER_PAGE = 12; // Adjust as needed
    const currentPage = parseInt(page, 10) || 1;
    const totalItems = filteredCars.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedCars = filteredCars.slice(startIndex, endIndex);

    // Extract unique filter options from allCars
    const brands = [...new Set(allCars.map(car => car.brand).filter(Boolean))].sort();
    let models = [...new Set(allCars
        .filter(car => car.model && car.model.toLowerCase() !== "unknown")
        .map(car => car.model)
        .filter(Boolean))].sort();
    const fuelTypes = [...new Set(allCars.map(car => car.fuelType).filter(Boolean))].sort();
    const transmissions = [...new Set(allCars.map(car => car.transmission).filter(Boolean))].sort();
    const colors = [...new Set(allCars.map(car => car.color).filter(Boolean))].sort();
    const countries = [...new Set(allCars.map(car => car.country).filter(Boolean))].sort();
    const engineTypes = [...new Set(allCars.map(car => car.engineType).filter(Boolean))].sort();
    const bodyTypes = [...new Set(allCars.map(car => car.bodyType).filter(Boolean))].sort();
    const conditions = [...new Set(allCars.map(car => car.condition).filter(Boolean))].sort();
    const availableFeatures = [...new Set(allCars.flatMap(car => car.tags))].filter(feature => feature).sort();

    // If a brand is selected, filter models based on the selected brand
    if (brand) {
        models = [...new Set(allCars
            .filter(car => car.brand.toLowerCase() === brand.toLowerCase() && car.model && car.model.toLowerCase() !== "unknown")
            .map(car => car.model)
            .filter(Boolean))].sort();
    }

    // Render the cars.ejs template with the necessary data
    res.render('cars', {
        title: 'Διαθέσιμα Αυτοκίνητα',
        cars: paginatedCars,
        brands,
        models, // Use filtered models based on brand
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
            features: Array.isArray(features) ? features : (features ? [features] : [])
        },
        activePage: 'cars', // For navigation active link
        success: req.query.success || '',
        error: req.query.error || ''
    });
});

// ----------------------
// 9. Customs Calculations Routes
// ----------------------

// GET route to display the Customs Calculator form
app.get('/customs-calculations', (req, res) => {
    res.render('customs_calculator', {
        title: 'Υπολογιστής Εκτελωνισμού',
        activePage: 'customs-calculations',
        success: '',
        error: '',
        calculationResult: null
    });
});

// POST route to handle form submission and perform calculations
app.post('/customs-calculations', (req, res) => {
    const {
        value,
        engineCapacity,
        co2Emissions,
        year,
        distance,
        origin,
        insurance,
        customsService
    } = req.body;

    // ----------------------
    // Input Validation
    // ----------------------

    // Check if all fields are filled
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
            calculationResult: null
        });
    }

    // Convert input values to appropriate types
    const vehicleValue = parseFloat(value);
    const engineCC = parseInt(engineCapacity, 10);
    const co2 = parseInt(co2Emissions, 10);
    const manufactureYear = parseInt(year, 10);
    const transportDistance = parseInt(distance, 10);
    const insuranceCost = parseFloat(insurance);
    const customsServiceCost = parseFloat(customsService);

    // Validate numeric values
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
            calculationResult: null
        });
    }

    // ----------------------
    // Calculations
    // ----------------------

    // 1. Τελωνειακός Δασμός (Customs Duty)
    let customsDuty = 0;
    if (origin.toLowerCase() === 'non-eu') {
        const customsRate = 0.10; // 10%
        customsDuty = vehicleValue * customsRate;
    }

    // 2. Κόστος Μεταφοράς (Transport Cost)
    const transportCostPerKm = 1.0; // Example cost per kilometer
    const transportCost = transportDistance * transportCostPerKm;

    // 3. Τελωνειακός Φόρος Καυσίμου (Fuel Tax)
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

    // 4. ΦΠΑ (24%) επί της αξίας του οχήματος + δασμοί + κόστος μεταφοράς (VAT)
    const vatRate = 0.24; // 24%
    const vatBase = vehicleValue + customsDuty + transportCost;
    const vat = vatBase * vatRate;

    // 5. Συνολικό Κόστος Εκτελωνισμού (Total Customs Cost)
    const totalCustoms = vat + customsDuty + fuelTax + transportCost + insuranceCost + customsServiceCost;

    // ----------------------
    // Prepare Calculation Results
    // ----------------------
    const calculationResult = {
        vehicleValue: vehicleValue.toFixed(2),
        transportCost: transportCost.toFixed(2),
        customsDuty: customsDuty.toFixed(2),
        vat: vat.toFixed(2),
        fuelTax: fuelTax.toFixed(2),
        insuranceCost: insuranceCost.toFixed(2),
        customsServiceCost: customsServiceCost.toFixed(2),
        totalCustoms: totalCustoms.toFixed(2)
    };

    // ----------------------
    // Render the Template with Results
    // ----------------------
    res.render('customs_calculator', {
        title: 'Υπολογιστής Εκτελωνισμού',
        activePage: 'customs-calculations',
        success: 'Ο υπολογισμός ολοκληρώθηκε με επιτυχία.',
        error: '',
        calculationResult: calculationResult
    });
});

// ----------------------
// 10. Other Routes
// ----------------------

// Contact Page
app.get('/contact', (req, res) => {
    res.render('contact', {
        title: 'Επικοινωνία',
        activePage: 'contact',
        // Add other variables as needed for 'contact.ejs'
    });
});

// About Page
app.get('/about', (req, res) => {
    res.render('about', {
        title: 'Σχετικά με Εμάς',
        activePage: 'about',
        // Add other variables as needed for 'about.ejs'
    });
});

// Route: Μεταφορείς (Transporters)
app.get('/transporters', (req, res) => {
    res.render('transporters', {
        title: 'Μεταφορείς Αυτοκινήτων',
        activePage: 'services', // Since 'Μεταφορείς' is under 'Υπηρεσίες'
        // You can pass additional variables if needed
    });
});

// VIN Check Page
app.get('/vin', (req, res) => {
    res.render('vin', {
        title: 'Έλεγχος VIN',
        activePage: 'vin',
        // Add other variables as needed for 'vin.ejs'
    });
});

// Route: Τέλη Κυκλοφορίας (Customs)
app.get('/telhkykloforias', (req, res) => {
    res.render('telhkykloforias', {
        title: 'Τέλη Κυκλοφορίας',
        activePage: 'telhkykloforias',
        // Add other variables as needed for 'telhkykloforias.ejs'
    });
});

// Blog Page
app.get('/blog', (req, res) => {
    res.render('blog', {
        title: 'Blog',
        activePage: 'blog',
        // Add other variables as needed for 'blog.ejs'
    });
});

// ----------------------
// 11. Services Routes
// ----------------------

// Example: Repairs Service
app.get('/services/repairs', (req, res) => {
    res.render('services/repairs', {
        title: 'Επισκευές',
        activePage: 'services',
        // Add other variables as needed for 'services/repairs.ejs'
    });
});

// Example: Maintenance Service
app.get('/services/maintenance', (req, res) => {
    res.render('services/maintenance', {
        title: 'Συντήρηση',
        activePage: 'services',
        // Add other variables as needed for 'services/maintenance.ejs'
    });
});

// Example: Installations Service
app.get('/services/installations', (req, res) => {
    res.render('services/installations', {
        title: 'Εγκαταστάσεις',
        activePage: 'services',
        // Add other variables as needed for 'services/installations.ejs'
    });
});

// ----------------------
// 12. 404 Error Handler
// ----------------------

// Handle 404 errors by rendering '404.ejs'
app.use((req, res) => {
    res.status(404).render('404', {
        title: 'Σελίδα Δεν Βρέθηκε',
        activePage: '',
        // Uncomment the line below to pass a custom error message
        // errorMessage: 'Η σελίδα που αναζητάτε δεν βρέθηκε. Παρακαλώ επιστρέψτε στην αρχική σελίδα.',
    });
});

// ----------------------
// 13. Start the Server
// ----------------------
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
