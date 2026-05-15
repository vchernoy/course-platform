import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { CourseSidebar } from "@/components/course/CourseSidebar";
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

  return (
    <div className="min-h-screen bg-zinc-50 lg:flex">
      <CourseSidebar course={course} courseSlug={courseSlug} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
