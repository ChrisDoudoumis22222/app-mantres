// mappers/carsMapper.js

function mapCarsJson(car) {
    try {
      const title = car.title || 'No Title';
      const brand = car.brand || title.split(' ')[0] || 'No Brand';
      const model = title.split(' ').slice(1).join(' ') || 'No Model';
  
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
  
  module.exports = mapCarsJson;
  