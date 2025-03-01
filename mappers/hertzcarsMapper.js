// mappers/hertzcarsMapper.js

function mapHertzCarsJson(car) {
    try {
      const title = car['Μοντέλο'] && typeof car['Μοντέλο'] === 'string' ? car['Μοντέλο'] : 'Δε Διατίθεται';
      const titleParts = title.split(' ');
      const brand = titleParts[0] || 'Δε Διατίθεται';
      const fullModel = titleParts.slice(1).join(' ') || 'Δε Διατίθεται';
      const model = fullModel; // You can use a helper like extractMainModel if needed
  
      let price = 0;
      if (car['Τιμή'] && typeof car['Τιμή'] === 'string') {
        const sanitizedPrice = car['Τιμή'].replace(/[^0-9.,]/g, '').trim();
        const priceMatch = sanitizedPrice.match(/([\d.,]+)/);
        if (priceMatch) {
          price = parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.'));
          if (isNaN(price)) price = 0;
        }
      }
  
      let year = 'Unknown';
      if (car['Έτος'] && typeof car['Έτος'] === 'string') {
        const parsedYear = parseInt(car['Έτος'], 10);
        year = isNaN(parsedYear) ? 'Unknown' : parsedYear;
      }
  
      const country = car['Τοποθεσία'] && typeof car['Τοποθεσία'] === 'string' ? car['Τοποθεσία'] : 'Δε Διατίθεται';
  
      let images = [];
      if (car['URLΕικόνας'] && typeof car['URLΕικόνας'] === 'string') {
        images = [car['URLΕικόνας']];
      } else {
        images = ['https://via.placeholder.com/300x200?text=No+Image'];
      }
      const hasImage =
        images.length > 0 && !images[0].includes('https://via.placeholder.com');
  
      const link = car['Link'] && typeof car['Link'] === 'string' ? car['Link'] : '#';
  
      return {
        title,
        link,
        price: price || 0,
        priceWithoutTax: null,
        power: null,
        year,
        mileage: null,
        transmission: 'Δε Διατίθεται',
        fuelType: 'Δε Διατίθεται',
        condition: 'Used',
        tags: [],
        deliveryInfo: { label: '', price: '' },
        images,
        brand,
        model,
        color: 'Δε Διατίθεται',
        country,
        doors: 4,
        bodyType: 'Δε Διατίθεται',
        engineType: 'Δε Διατίθεται',
        hasImage,
      };
    } catch (error) {
      console.error('Error mapping hertzcars.json entry:', car, error);
      return null;
    }
  }
  
  module.exports = mapHertzCarsJson;
  