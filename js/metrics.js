/** Shared 12oz-can proportions. Body radius is 1; height is about 3.7 radii. */
export const BODY_RADIUS = 1;
export const LABEL_Y0 = 0.46;
export const LABEL_Y1 = 2.92;
export const LID_Y = 3.682;

export function labelTextureSize(height = 1024) {
  const span = LABEL_Y1 - LABEL_Y0;
  const width = Math.round((height * (Math.PI * 2 * BODY_RADIUS)) / span);
  return { width, height };
}
