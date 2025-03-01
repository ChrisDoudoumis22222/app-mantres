// mappers/caaarrssssssMapper.js

const extractMainModel = (fullModel) => {
    if (!fullModel || typeof fullModel !== 'string') return 'Unknown';
    const parts = fullModel.trim().split(' ');
    return parts.length > 0 ? parts[0] : 'Unknown';
  };
  
  function mapCaaarrssssssJson(car) {
    try {
      let price = 0;
      if (car.price && typeof car.price === 'string') {
        const priceMatch = car.price.replace(',', '.').match(/([\d.,]+)/);
        if (priceMatch) {
          price = parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.'));
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
        car.tags.some((tag) => typeof tag === 'string' && tag.toLowerCase().includes('door'))
      ) {
        const doorsTag = car.tags.find(
          (tag) => typeof tag === 'string' && tag.toLowerCase().includes('door')
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
        title: `${car.brand || 'Unknown'} ${car.model || 'Unknown'} ${car.engine || ''}`.trim() || 'Unknown',
        link: car.url || '#',
        price: price || 0,
        priceWithoutTax: null,
        power,
        year,
        mileage,
        transmission:
          car.transmission && typeof car.transmission === 'string'
            ? car.transmission.trim()
            : 'Unknown',
        fuelType:
          car.fuelType && typeof car.fuelType === 'string'
            ? car.fuelType.trim()
            : 'Unknown',
        condition,
        tags: Array.isArray(car.tags) ? car.tags : [],
        deliveryInfo:
          car.deliveryInfo && typeof car.deliveryInfo === 'object'
            ? { label: car.deliveryInfo.label || '', price: car.deliveryInfo.price || '' }
            : { label: '', price: '' },
        images,
        brand: car.brand || 'Unknown',
        model: model || 'Unknown',
        color:
          car.color && typeof car.color === 'string' ? car.color : 'Unknown',
        country:
          car.country && typeof car.country === 'string'
            ? car.country
            : 'Unknown',
        doors,
        bodyType,
        engineType,
        hasImage,
      };
    } catch (error) {
      console.error('Error mapping caaarrssssss.json entry:', car, error);
      return null;
    }
  }
  
  module.exports = mapCaaarrssssssJson;
  