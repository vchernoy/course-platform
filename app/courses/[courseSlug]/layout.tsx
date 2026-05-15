import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { AccessDenied } from "@/components/AccessDenied";
import { CourseSidebar } from "@/components/course/CourseSidebar";
import { canAccessCourse, getCurrentUserEmail } from "@/lib/authz";
import { loadCourse } from "@/lib/courses";

type Props = {
  children: ReactNode;
  params: Promise<{ courseSlug: string }>;
};

export default async function CourseLayout({ children, params }: Props) {
  const { courseSlug } = await params;

  let course;
  try {
    course = loadCourse(courseSlug);
  } catch {
    notFound();
  }

  const email = await getCurrentUserEmail();
  if (!canAccessCourse(email, courseSlug)) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <AccessDenied courseSlug={courseSlug} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 lg:flex">
      <CourseSidebar course={course} courseSlug={courseSlug} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
