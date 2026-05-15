/** Dev-only hint; stripped in production (`NODE_ENV`). */
export function DevStudentsYamlNote() {
  if (process.env.NODE_ENV !== "development") return null;
  return (
    <p className="border-t border-zinc-200 bg-zinc-50 px-6 py-2 text-center text-xs text-zinc-400 lg:text-left">
      Access controlled by config/students.yaml
    </p>
  );
}
