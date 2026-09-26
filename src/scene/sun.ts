// Where the sun is over Los Angeles right now. Low-precision solar position
// (good to a fraction of a degree), which is plenty to drive sky colours.

export const LOS_ANGELES = { lat: 34.05, lon: -118.24, timeZone: "America/Los_Angeles" };

const RAD = Math.PI / 180;

export interface SunPosition {
  /** Degrees above the horizon (negative once it has set). */
  altitude: number;
  /** Degrees clockwise from north (90 = east, 270 = west). */
  azimuth: number;
}

export function sunPosition(date: Date, lat = LOS_ANGELES.lat, lon = LOS_ANGELES.lon): SunPosition {
  const n = date.getTime() / 86_400_000 + 2440587.5 - 2451545.0; // days since J2000
  const meanLongitude = (280.46 + 0.9856474 * n) % 360;
  const meanAnomaly = ((357.528 + 0.9856003 * n) % 360) * RAD;
  const eclipticLongitude =
    (meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * RAD;
  const obliquity = (23.439 - 0.0000004 * n) * RAD;

  const rightAscension = Math.atan2(Math.cos(obliquity) * Math.sin(eclipticLongitude), Math.cos(eclipticLongitude));
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude));

  const siderealTime = ((280.46061837 + 360.98564736629 * n + lon) % 360) * RAD;
  const hourAngle = siderealTime - rightAscension;
  const phi = lat * RAD;

  const altitude = Math.asin(
    Math.sin(phi) * Math.sin(declination) + Math.cos(phi) * Math.cos(declination) * Math.cos(hourAngle),
  );
  const azimuth = Math.atan2(
    -Math.sin(hourAngle),
    Math.tan(declination) * Math.cos(phi) - Math.sin(phi) * Math.cos(hourAngle),
  );
  return { altitude: altitude / RAD, azimuth: (azimuth / RAD + 360) % 360 };
}
