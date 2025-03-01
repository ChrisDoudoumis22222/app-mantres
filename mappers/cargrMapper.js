// mappers/cargrMapper.js

function mapCargrJson(car) {
    try {
      const title = car['Τίτλος'] || 'Δε Διατίθεται';
      const titleParts = title.split(' ');
      const brand = titleParts[0] || 'Δε Διατίθεται';
      const model = titleParts.slice(1).join(' ') || 'Δε Διατίθεται';
  
      let price = 0;
      if (car['Τιμή'] && typeof car['Τιμή'] === 'string') {
        const priceMatch = car['Τιμή'].match(/([\d.,]+)/);
        if (priceMatch) {
          price = parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.')) || 0;
        }
      }
      const priceWithoutTax = null;
  
      let year = 'Unknown';
      let mileage = null;
      let power = null;
      let fuelType = 'Δε Διατίθεται';
      if (car['ΕπιπλέονΠληροφορίες'] && typeof car['ΕπιπλέονΠληροφορίες'] === 'string') {
        const yearMatch = car['ΕπιπλέονΠληροφορίες'].match(/(\d{4})/);
        if (yearMatch) {
          year = parseInt(yearMatch[1], 10);
        }
        const mileageMatch = car['ΕπιπλέονΠληροφορίες'].match(/([\d.,]+)\s*χλμ/i);
        if (mileageMatch) {
          mileage = parseInt(mileageMatch[1].replace(/\./g, '').replace(',', ''), 10);
        }
        const powerMatch = car['ΕπιπλέονΠληροφορίες'].match(/(\d+)\s*bhp/i);
        if (powerMatch) {
          power = parseInt(powerMatch[1], 10);
        }
        const lowerInfo = car['ΕπιπλέονΠληροφορίες'].toLowerCase();
        if (lowerInfo.includes('βενζίνη')) {
          fuelType = 'Βενζίνη';
        } else if (lowerInfo.includes('πετρέλαιο')) {
          fuelType = 'Πετρέλαιο';
        }
      }
      const transmission = 'Δε Διατίθεται';
      let images = [];
      if (car['URLΕικόνας'] && typeof car['URLΕικόνας'] === 'string' && car['URLΕικόνας'].trim() !== '') {
        images = [car['URLΕικόνας']];
      } else {
        images = ['https://via.placeholder.com/300x200?text=No+Image'];
      }
      const hasImage = images.length > 0 && !images[0].includes('https://via.placeholder.com');
  
      const country = car['Τοποθεσία'] || 'Δε Διατίθεται';
      const color = 'Δε Διατίθεται';
      const doors = 4;
      const bodyType = 'Δε Διατίθεται';
      const engineType = 'Δε Διατίθεται';
      const tags = [];
      if (car['Περιγραφή'] && typeof car['Περιγραφή'] === 'string') {
        tags.push(car['Περιγραφή']);
      }
  
      return {
        title,
        link: car['Σύνδεσμος'] || '#',
        price,
        priceWithoutTax,
        power,
        year,
        mileage,
        transmission,
        fuelType,
        condition: 'Used',
        tags,
        deliveryInfo: { label: '', price: '' },
        images,
        brand,
        model,
        color,
        country,
        doors,
        bodyType,
        engineType,
        hasImage,
      };
    } catch (error) {
      console.error('Error mapping cargr.json entry:', car, error);
      return null;
    }
  }
  
  module.exports = mapCargrJson;
  