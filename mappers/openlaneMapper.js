// mappers/openlaneMapper.js

const extractMainModel = (fullModel) => {
    if (!fullModel || typeof fullModel !== 'string') return 'Unknown';
    const parts = fullModel.trim().split(' ');
    return parts.length > 0 ? parts[0] : 'Unknown';
  };
  
  function mapOpenLaneJson(car) {
    try {
      const nameParts = car.name && typeof car.name === 'string' ? car.name.split(' ') : [];
      const brand = nameParts[0] || 'Unknown';
      const fullModel = nameParts.slice(1, nameParts.length - 1).join(' ') || 'Unknown';
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
        fuelType = car.emissions.toLowerCase().includes('eu6') ? 'Diesel' : 'Petrol';
      }
  
      let mileage = null;
      let doors = 4;
      let bodyType = car.carType && typeof car.carType === 'string' ? car.carType : 'Unknown';
      let engineType = fuelType.toLowerCase() === 'diesel' ? 'Diesel' : 'Petrol';
  
      let condition = 'Used';
      if (car.originalPrice && typeof car.originalPrice === 'string' && car.originalPrice.trim() !== '') {
        condition = 'New';
      }
  
      let priceWithoutTax = null;
      if (car.originalPrice && typeof car.originalPrice === 'string' && car.originalPrice.trim() !== '') {
        priceWithoutTax = parseFloat(
          car.originalPrice.replace(/[^0-9.,]/g, '').replace(',', '.')
        );
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
        priceWithoutTax,
        power,
        year,
        mileage,
        transmission: 'Unknown',
        fuelType,
        condition,
        tags: Array.isArray(car.premiumOffers) ? car.premiumOffers : [],
        deliveryInfo: { label: '', price: '' },
        images,
        brand: brand || 'Unknown',
        model: model || 'Unknown',
        color: 'Unknown',
        country: car.location && typeof car.location === 'string' ? car.location : 'Unknown',
        doors,
        bodyType,
        engineType,
        hasImage,
      };
    } catch (error) {
      console.error('Error mapping openlane.json entry:', car, error);
      return null;
    }
  }
  
  module.exports = mapOpenLaneJson;
  