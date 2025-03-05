// mappers/carsMapper.js ayto einai kai gia to carvago

function mapCarsJson(car) {
  try {
    const title = car.title || 'No Title';

    // Brand
    const brand =
      car.brand ||
      (car.detailPageData && car.detailPageData.Make) ||
      title.split(' ')[0] ||
      'No Brand';

    // Model
    let model = title.split(' ').slice(1).join(' ') || 'No Model';
    if (car.detailPageData && car.detailPageData.Model) {
      model = car.detailPageData.Model;
    }

    // Price
    let price = 0;
    if (typeof car.price === 'number') {
      price = car.price;
    } else if (car.price && typeof car.price === 'string') {
      const priceStr = car.price.replace(/[^0-9,\.]/g, '').replace(',', '.');
      price = parseFloat(priceStr) || 0;
    }

    // Mileage
    let mileage = null;
    let mileageString = car.mileage;
    if (!mileageString && car.detailPageData && car.detailPageData.MILEAGE) {
      mileageString = car.detailPageData.MILEAGE;
    }
    if (mileageString && typeof mileageString === 'string') {
      const mileageDigits = mileageString.replace(/\D/g, '');
      mileage = mileageDigits ? parseInt(mileageDigits, 10) : null;
    }

    // Transmission classification (Automatic / Manual / Semi-Automatic)
    let rawTransmission = car.transmission;
    if (
      (!rawTransmission || rawTransmission === 'null') &&
      car.detailPageData &&
      car.detailPageData.TRANSMISSION
    ) {
      rawTransmission = car.detailPageData.TRANSMISSION;
    }
    let transmission = 'N/A';
    if (rawTransmission && typeof rawTransmission === 'string') {
      const lowered = rawTransmission.trim().toLowerCase();
      if (lowered.includes('manual')) {
        transmission = 'Manual';
      } else if (lowered.includes('semi')) {
        transmission = 'Semi-Automatic';
      } else if (lowered.includes('auto')) {
        transmission = 'Automatic';
      }
    }

    // Year
    let year = 'Unknown';
    if (car.year && typeof car.year === 'string') {
      const yearMatch = car.year.match(/(\d{4})/);
      if (yearMatch) {
        year = parseInt(yearMatch[1], 10);
      }
    } else if (car.detailPageData && car.detailPageData['FIRST REGISTRATION']) {
      const yrMatch = car.detailPageData['FIRST REGISTRATION'].match(/(\d{4})/);
      if (yrMatch) {
        year = parseInt(yrMatch[1], 10);
      }
    }

    // --------------------------
    // FUEL TYPE LOGIC
    // --------------------------
    // 1) Try top-level "car.fuel".
    // 2) If missing, try detailPageData.FUEL or detailPageData.fuelDetail if that’s what your JSON uses.
    // 3) Fallback to 'N/A'.
    let fuelType = car.fuel || 'N/A';
    // If top-level was null, check detailPageData
    // Sometimes "fuel" is stored like `detailPageData.FUEL` or `detailPageData.fuelDetail`. Adjust to your actual key.
    if (
      (!fuelType || fuelType === 'N/A') &&
      car.detailPageData &&
      car.detailPageData.fuelDetail
    ) {
      fuelType = car.detailPageData.fuelDetail;
    }
    // Now "fuelType" should hold Gasoline, Diesel, Electric, etc. or remain 'N/A'.

    // Power
    let power = null;
    if (car.power && typeof car.power === 'string') {
      let match = car.power.match(/(\d+)\s*kW/i);
      if (!match) {
        match = car.power.match(/(\d+)\s*PS/i);
      }
      if (match) {
        power = parseInt(match[1], 10);
      }
    } else if (car.detailPageData && car.detailPageData.POWER) {
      const match = car.detailPageData.POWER.match(/(\d+)/);
      if (match) {
        power = parseInt(match[1], 10);
      }
    }

    // Powertrain
    let powertrain = 'N/A';
    if (car.detailPageData && car.detailPageData['DRIVE TYPE']) {
      powertrain = car.detailPageData['DRIVE TYPE'];
    }

    // Doors
    let doors = 'N/A';
    if (car.detailPageData && car.detailPageData.Doors) {
      doors = car.detailPageData.Doors;
    }

    // Body Type
    let bodyType = 'N/A';
    if (car.detailPageData && car.detailPageData.Body) {
      bodyType = car.detailPageData.Body;
    }

    // Images
    let images = [];
    if (Array.isArray(car.images) && car.images.length > 0) {
      images = car.images
        .filter((url) => !url.toLowerCase().includes('carvago.com/cars?'))
        .map((imgUrl) => {
          const cleaned = imgUrl.split(' ')[0];
          return cleaned.replace(/&amp;/g, '&');
        });
      if (images.length === 0) {
        images = ['https://via.placeholder.com/300x200?text=No+Image'];
      }
    } else {
      images = ['https://via.placeholder.com/300x200?text=No+Image'];
    }
    const hasImage = images.length > 0 && !images[0].includes('placeholder');

    // Location
    let location = 'Unknown';
    if (car.detailPageData && (car.detailPageData.LOCATION || car.detailPageData.location)) {
      location = car.detailPageData.LOCATION || car.detailPageData.location;
    } else if (car.address) {
      location = car.address;
    }

    return {
      title,
      link: car.link || '#',
      price,
      mileage,
      transmission,
      year,
      fuelType,  // Now we have a better fallback logic
      power,
      powertrain,
      doors,
      bodyType,
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

module.exports = mapCarsJson;
