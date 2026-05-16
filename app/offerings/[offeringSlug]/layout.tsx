import type { ReactNode } from "react";
import { forbidden, notFound } from "next/navigation";
import { CourseSidebar } from "@/components/course/CourseSidebar";
import { DevStudentsYamlNote } from "@/components/DevStudentsYamlNote";
import { canAccessOffering, getCurrentUserEmail } from "@/lib/authz";
import { loadOffering } from "@/lib/offerings";
import { isSafeSlug } from "@/lib/slug";

type Props = {
  children: ReactNode;
  params: Promise<{ offeringSlug: string }>;
};

export default async function OfferingLayout({ children, params }: Props) {
  const { offeringSlug } = await params;

  if (!isSafeSlug(offeringSlug)) {
    notFound();
  }

  let offering;
  try {
    offering = loadOffering(offeringSlug);
  } catch {
    notFound();
  }

  const email = await getCurrentUserEmail();
  if (!canAccessOffering(email, offeringSlug)) {
    forbidden();
  }

  return (
    <div className="min-h-screen bg-zinc-50 lg:flex">
      <CourseSidebar course={offering} courseSlug={offeringSlug} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1">{children}</div>
        <DevStudentsYamlNote />
      </div>
    </div>
  );
}
