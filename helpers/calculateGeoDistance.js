
function calculateDistance(lat1, lon1, lat2, lon2) {
    const RADIUS_OF_EARTH_KM = 6371;
    const lat1Rad = toRadians(lat1);
    const lat2Rad = toRadians(lat2);
    const latDiffRad = toRadians(lat2 - lat1);
    const lonDiffRad = toRadians(lon2 - lon1);

    const a = Math.sin(latDiffRad / 2) * Math.sin(latDiffRad / 2) +
        Math.cos(lat1Rad) * Math.cos(lat2Rad) *
        Math.sin(lonDiffRad / 2) * Math.sin(lonDiffRad / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = RADIUS_OF_EARTH_KM * c;

    return distanceKm * 1000; // Convert km to meters
}

function toRadians(degrees) {
    return degrees * Math.PI / 180;
}


// Example usage
// 33.60261778732975, 73.11750500638692
const point1 = [33.556974, 73.109044];
const point2 = [33.60261778732975, 73.11750500638692];

const distanceMeters = calculateDistance(point1[0], point1[1], point2[0], point2[1]);
console.log(`The distance between point 1 and point 2 is ${distanceMeters} meters.`);
