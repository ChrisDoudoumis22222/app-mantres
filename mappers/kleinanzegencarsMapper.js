// mappers/kleinanzegencarsMapper.js

function mapKleinanzegencarsJson(car) {
    try {
      // Title & Link
      const title = car.title || 'No Title';
      const link = car.link || '#';
  
      // Price: Prefer the numeric "price" field if available;
      // otherwise parse the "priceText" (removing currency symbols)
      let price = 0;
      if (typeof car.price === 'number') {
        price = car.price;
      } else if (car.priceText && typeof car.priceText === 'string') {
        const priceStr = car.priceText.replace(/[^\d,\.]/g, '').replace(',', '.');
        price = parseFloat(priceStr) || 0;
      }
  
      // Mileage: Extract number from a string like "126.250 km"
      let mileage = null;
      if (car.mileage && typeof car.mileage === 'string') {
        const mileageMatch = car.mileage.match(/([\d.,]+)/);
        if (mileageMatch) {
          // Remove dots/commas and convert to integer
          mileage = parseInt(mileageMatch[1].replace(/[.,]/g, ''), 10);
        }
      }
  
      // Transmission
      const transmission = car.transmission || 'N/A';
  
      // Year: Extract a 4-digit year from the "year" field (e.g., "Juni 2004")
      let year = 'Unknown';
      if (car.year && typeof car.year === 'string') {
        const yearMatch = car.year.match(/(\d{4})/);
        if (yearMatch) {
          year = parseInt(yearMatch[1], 10);
        }
      }
  
      // Fuel type
      const fuelType = car.fuel || 'N/A';
  
      // Power: Extract number from strings like "166 PS"
      let power = null;
      if (car.power && typeof car.power === 'string') {
        const powerMatch = car.power.match(/(\d+)/);
        if (powerMatch) {
          power = parseInt(powerMatch[1], 10);
        }
      }
  
      // Images: Use provided array or fallback to a placeholder image.
      let images = [];
      if (Array.isArray(car.images) && car.images.length > 0) {
        images = car.images;
      } else {
        images = ['https://via.placeholder.com/300x200?text=No+Image'];
      }
      const hasImage = images.length > 0 && !images[0].includes('https://via.placeholder.com');
  
      // Brand is provided.
      const brand = car.brand || 'Unknown';
  
      // Model: derive by removing the brand from the title if possible.
      let model = 'Unknown';
      if (title.startsWith(brand)) {
        model = title.substring(brand.length).trim();
      } else {
        const parts = title.split(' ');
        model = parts.slice(1).join(' ') || 'Unknown';
      }
  
      // Location: from detailPageData
      let location = 'Unknown';
      if (car.detailPageData && typeof car.detailPageData.location === 'string') {
        location = car.detailPageData.location;
      }
  
      return {
        title,
        link,
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
        priceWithoutTax: null, // not provided in this dataset
      };
    } catch (error) {
      console.error('Error mapping kleinanzegencars.json entry:', car, error);
      return null;
    }
  }
  
  module.exports = mapKleinanzegencarsJson;
  