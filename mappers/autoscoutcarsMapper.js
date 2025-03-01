// mappers/autoscoutcarsMapper.js

const extractMainModel = (fullModel) => {
    if (!fullModel || typeof fullModel !== 'string') return 'Δε Διατίθεται';
    const parts = fullModel.trim().split(' ');
    return parts.length > 0 ? parts[0] : 'Δε Διατίθεται';
  };
  
  function mapAutoscoutCarsJson(car) {
    try {
      const rawTitle = car.title && typeof car.title === 'string' ? car.title : 'Δε Διατίθεται';
      const title = rawTitle.replace(/\n/g, ' ').trim();
      const link = car.link && typeof car.link === 'string' ? car.link : '#';
  
      let price = 0;
      if (car.price && typeof car.price === 'string') {
        const priceMatch = car.price.match(/€\s?([\d.,]+)/);
        if (priceMatch) {
          price = parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.'));
          if (isNaN(price)) price = 0;
        }
      }
  
      let mileage = null;
      if (car.mileage && typeof car.mileage === 'string') {
        const mileageMatch = car.mileage.match(/([\d.,]+)\s*km/i);
        if (mileageMatch) {
          mileage = parseInt(mileageMatch[1].replace(/\./g, '').replace(',', ''), 10);
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
  
      const fuelType = car.fuel && typeof car.fuel === 'string' ? car.fuel : 'Δε Διατίθεται';
      const transmission = car.transmission && typeof car.transmission === 'string' ? car.transmission : 'Δε Διατίθεται';
  
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
      const hasImage = images.length > 0 && !images[0].includes('https://via.placeholder.com');
  
      let condition = 'Used';
      if (year === 'New') {
        condition = 'New';
      }
  
      return {
        title,
        link,
        price: price || 0,
        priceWithoutTax: null,
        power,
        year,
        mileage,
        transmission,
        fuelType,
        condition,
        tags: [],
        deliveryInfo: { label: '', price: '' },
        images,
        brand: brand || 'Δε Διατίθεται',
        model: model || 'Δε Διατίθεται',
        color: 'Δε Διατίθεται',
        country: 'Δε Διατίθεται',
        doors: 4,
        bodyType: 'Δε Διατίθεται',
        engineType: 'Δε Διατίθεται',
        hasImage,
      };
    } catch (error) {
      console.error('Error mapping autoscoutcars.json entry:', car, error);
      return null;
    }
  }
  
  module.exports = mapAutoscoutCarsJson;
  