/** Dev-only console warnings for manual MDX anchor ids. */

export function warnInvalidManualAnchorId(componentName: string, id: string): void {
  if (process.env.NODE_ENV !== "development") return;
  console.warn(
    `[${componentName}] Invalid manual anchor id (must match safe fragment rules): ${JSON.stringify(id)}`
  );
}
