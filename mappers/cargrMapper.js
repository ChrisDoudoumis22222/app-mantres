// mappers/cargrMapper.js

function mapCargrJson(car) {
  try {
    // Use the English keys provided in the JSON structure
    const title = car.title || 'Δε Διατίθεται';
    const titleParts = title.split(' ');
    // Use the provided brand if available, else derive from title
    const brand = car.brand || (titleParts[0] || 'Δε Διατίθεται');
    const model = titleParts.slice(1).join(' ') || 'Δε Διατίθεται';

    let price = 0;
    if (car.price && typeof car.price === 'string') {
      // Match a number pattern, e.g., "2.000" or "16.500"
      const priceMatch = car.price.match(/([\d.,]+)/);
      if (priceMatch) {
        // Remove thousand separators (dots) and convert comma to dot if needed
        const priceStr = priceMatch[1].replace(/\./g, '').replace(',', '.');
        price = parseFloat(priceStr) || 0;
      }
    }
    const priceWithoutTax = null;

    let year = 'Unknown';
    if (car.year && typeof car.year === 'string') {
      // Extract a 4-digit year, e.g., from "1/2001" or "10/2019"
      const yearMatch = car.year.match(/(\d{4})/);
      if (yearMatch) {
        year = parseInt(yearMatch[1], 10);
      }
    }

    let mileage = null;
    if (car.mileage && typeof car.mileage === 'string') {
      // Remove all non-digit characters. For example, "210.000 χλμ" becomes "210000"
      const mileageDigits = car.mileage.replace(/\D/g, '');
      mileage = mileageDigits ? parseInt(mileageDigits, 10) : null;
    }

    let power = null;
    if (car.power && typeof car.power === 'string') {
      // Extract the numeric part from strings like "75 bhp"
      const powerMatch = car.power.match(/(\d+)/);
      if (powerMatch) {
        power = parseInt(powerMatch[1], 10);
      }
    }

    const transmission = car.transmission || 'Δε Διατίθεται';
    const fuelType = car.fuel || 'Δε Διατίθεται';

    let images = [];
    if (Array.isArray(car.images) && car.images.length > 0) {
      images = car.images;
    } else {
      images = ['https://via.placeholder.com/300x200?text=No+Image'];
    }
    const hasImage = images.length > 0 && !images[0].includes('placeholder');

    // Try to get location from detailPageData if available, otherwise fall back to address
    const location =
      (car.detailPageData && car.detailPageData.location && car.detailPageData.location.trim() !== '')
        ? car.detailPageData.location
        : (car.address || 'Δε Διατίθεται');

    // Use dealer as a tag if provided (could be extended with more details)
    const tags = [];
    if (car.dealer) {
      tags.push(car.dealer);
    }

    // Get the color from detailPageData if provided
    const color =
      (car.detailPageData && car.detailPageData.colorDetail) ? car.detailPageData.colorDetail : 'Δε Διατίθεται';

    // For country, use address information as a fallback
    const country = car.address || 'Δε Διατίθεται';
    // Set default values for doors, bodyType, and engineType (adjust as needed)
    const doors = 4;
    const bodyType = 'Δε Διατίθεται';
    const engineType = 'Δε Διατίθεται';

    return {
      title,
      link: car.link || '#',
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
