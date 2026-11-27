/**
 * Learner-chosen look for the whole platform: the portal, the course sidebar and lesson content.
 * The ids match ActiveMD's ACTIVE_STYLES (@vchernoy/active-runtime/styles.css) so documents and
 * apps share one vocabulary. Plain sets no attribute. Unknown values are plain.
 */
export const STYLE_KEY = "course-platform.style.v1";

export const STYLES = [
  { id: "plain", label: "Plain" },
  { id: "sketch", label: "Hand-drawn" },
  { id: "brutal", label: "Bold (neo-brutalism)" },
  { id: "notebook", label: "Notebook" },
  { id: "chalkboard", label: "Chalkboard" },
] as const;

export type StyleId = (typeof STYLES)[number]["id"];

export function styleChoice(value: unknown): StyleId {
  return STYLES.some((style) => style.id === value) ? (value as StyleId) : "plain";
}

export function applyStyle(root: HTMLElement, style: StyleId): void {
  if (style === "plain") delete root.dataset.activeStyle;
  else root.dataset.activeStyle = style;
}

/**
 * Runs in <head> before the first paint, so a saved style never flashes the plain look. Only
 * known ids reach the attribute; blocked storage keeps the plain look.
 */
export const STYLE_BOOT_SCRIPT = `(() => { try { const s = localStorage.getItem(${JSON.stringify(STYLE_KEY)}); if (${JSON.stringify(STYLES.map((style) => style.id).filter((id) => id !== "plain"))}.includes(s)) document.documentElement.dataset.activeStyle = s; } catch {} })();`;
