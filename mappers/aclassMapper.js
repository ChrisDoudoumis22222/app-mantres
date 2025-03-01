// mappers/aclassMapper.js

function mapAClassJson(car) {
    try {
      const title = car.title && typeof car.title === 'string' ? car.title : 'Δε Διατίθεται';
      const link = car.link && typeof car.link === 'string' ? car.link : '#';
  
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
          mileage = parseInt(mileageMatch[1].replace(/\./g, '').replace(',', ''), 10);
        }
      }
  
      const transmission = 'Δε Διατίθεται';
      const fuelType = 'Δε Διατίθεται';
      const condition = 'Used';
      const tags = Array.isArray(car.tags) ? car.tags : [];
      const deliveryInfo =
        car.deliveryInfo && typeof car.deliveryInfo === 'object'
          ? { label: car.deliveryInfo.label || '', price: car.deliveryInfo.price || '' }
          : { label: '', price: '' };
  
      let images = [];
      if (Array.isArray(car.images) && car.images.length > 0) {
        images = car.images;
      } else {
        images = ['https://via.placeholder.com/300x200?text=No+Image'];
      }
      const hasImage = images.length > 0 && !images[0].includes('https://via.placeholder.com');
  
      const titleParts = title.split(' ');
      const brand = titleParts[0] || 'Δε Διατίθεται';
      const model = titleParts.slice(1).join(' ') || 'Δε Διατίθεται';
      const color = 'Δε Διατίθεται';
      const country = 'Germany';
      const doors = 4;
      const bodyType = 'Δε Διατίθεται';
      const engineType = 'Δε Διατίθεται';
  
      return {
        title,
        link,
        price: price || 0,
        priceWithoutTax,
        power,
        year,
        mileage,
        transmission,
        fuelType,
        condition,
        tags,
        deliveryInfo,
        images,
        brand: brand || 'Δε Διατίθεται',
        model: model || 'Δε Διατίθεται',
        color,
        country,
        doors,
        bodyType,
        engineType,
        hasImage,
      };
    } catch (error) {
      console.error('Error mapping aclass.json entry:', car, error);
      return null;
    }
  }
  
  module.exports = mapAClassJson;
  