export type SectionShape = 'rectangle' | 'circle' | 'tube' | 'i';

export interface SectionDimensions {
  width?: number;
  height?: number;
  diameter?: number;
  thickness?: number;
  flangeThickness?: number;
  webThickness?: number;
}

export interface SectionProperties {
  area: number;
  inertiaX: number;
  inertiaY: number;
  sectionModulusX: number;
  sectionModulusY: number;
  radiusGyrationX: number;
  radiusGyrationY: number;
}

const positive = (value: number | undefined, name: string): number => {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} debe ser una dimensión positiva.`);
  }
  return value;
};

const propertiesFrom = (area: number, inertiaX: number, inertiaY: number, height: number, width: number): SectionProperties => ({
  area,
  inertiaX,
  inertiaY,
  sectionModulusX: inertiaX / (height / 2),
  sectionModulusY: inertiaY / (width / 2),
  radiusGyrationX: Math.sqrt(inertiaX / area),
  radiusGyrationY: Math.sqrt(inertiaY / area),
});

/**
 * Calculates elastic geometric properties in the app's internal base units:
 * metres, square metres, metres to the fourth power and metres cubed.
 *
 * The calculator is deliberately independent from the ProjectModel and solver:
 * it is a transparent study tool, not a second source of section data.
 */
export const calculateSectionProperties = (shape: SectionShape, dimensions: SectionDimensions): SectionProperties => {
  if (shape === 'rectangle') {
    const width = positive(dimensions.width, 'El ancho');
    const height = positive(dimensions.height, 'El alto');
    return propertiesFrom(
      width * height,
      (width * height ** 3) / 12,
      (height * width ** 3) / 12,
      height,
      width,
    );
  }

  if (shape === 'circle') {
    const diameter = positive(dimensions.diameter, 'El diámetro');
    const area = (Math.PI * diameter ** 2) / 4;
    const inertia = (Math.PI * diameter ** 4) / 64;
    return propertiesFrom(area, inertia, inertia, diameter, diameter);
  }

  if (shape === 'tube') {
    const width = positive(dimensions.width, 'El ancho exterior');
    const height = positive(dimensions.height, 'El alto exterior');
    const thickness = positive(dimensions.thickness, 'El espesor');
    const innerWidth = width - 2 * thickness;
    const innerHeight = height - 2 * thickness;
    if (innerWidth <= 0 || innerHeight <= 0) throw new Error('El espesor debe dejar un hueco interior positivo.');
    return propertiesFrom(
      width * height - innerWidth * innerHeight,
      (width * height ** 3 - innerWidth * innerHeight ** 3) / 12,
      (height * width ** 3 - innerHeight * innerWidth ** 3) / 12,
      height,
      width,
    );
  }

  const width = positive(dimensions.width, 'El ancho de ala');
  const height = positive(dimensions.height, 'El alto');
  const flangeThickness = positive(dimensions.flangeThickness, 'El espesor de ala');
  const webThickness = positive(dimensions.webThickness, 'El espesor del alma');
  const clearHeight = height - 2 * flangeThickness;
  if (clearHeight <= 0 || webThickness >= width) throw new Error('Las proporciones del perfil I no son válidas.');
  return propertiesFrom(
    2 * width * flangeThickness + webThickness * clearHeight,
    (width * height ** 3 - (width - webThickness) * clearHeight ** 3) / 12,
    (2 * flangeThickness * width ** 3 + clearHeight * webThickness ** 3) / 12,
    height,
    width,
  );
};
