export const NEAR_BOTTOM_PX = 80;

export function isNearBottom(
  contentHeight: number,
  offsetY: number,
  layoutHeight: number,
  unmeasuredFallback: boolean,
  threshold: number = NEAR_BOTTOM_PX,
): boolean {
  if (layoutHeight === 0) return unmeasuredFallback;
  return contentHeight - (offsetY + layoutHeight) <= threshold;
}

export function shouldAutoScroll(input: {
  force: boolean;
  appended: boolean;
  contentGrew: boolean;
  nearBottom: boolean;
}): boolean {
  if (!input.appended && !input.contentGrew) return false;
  return input.force || input.nearBottom;
}
