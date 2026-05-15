import { AccessDeniedSignOut } from "@/components/AccessDeniedSignOut";

type Props = { courseSlug: string };

export function AccessDenied({ courseSlug }: Props) {
  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-2xl font-semibold text-zinc-900">Access denied</h1>
      <p className="mt-3 text-zinc-600">
        Your account is not allowed to view the course{" "}
        <span className="font-mono text-zinc-800">{courseSlug}</span>. Ask an
        administrator to add your email to{" "}
        <span className="font-mono text-zinc-800">config/students.yaml</span>.
      </p>
      <AccessDeniedSignOut />
    </main>
  );
}
