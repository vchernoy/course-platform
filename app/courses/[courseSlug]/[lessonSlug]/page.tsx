import { compileMDX } from "next-mdx-remote/rsc";
import type { Metadata } from "next";
import type { ImgHTMLAttributes } from "react";
import { notFound } from "next/navigation";
import { CompoundInterestCalculator } from "@/components/mdx/CompoundInterestCalculator";
import { CourseImage } from "@/components/mdx/CourseImage";
import { DownloadFile } from "@/components/mdx/DownloadFile";
import { ProtectedVideo } from "@/components/mdx/ProtectedVideo";
import { VideoPlayer } from "@/components/mdx/VideoPlayer";
import { LessonPager } from "@/components/course/LessonPager";
import { rewriteLessonAssetUrls } from "@/lib/course-assets";
import {
  findLessonMeta,
  getLessonNeighbors,
  loadCourse,
  loadLessonSource,
} from "@/lib/courses";

type Props = {
  params: Promise<{ courseSlug: string; lessonSlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { courseSlug, lessonSlug } = await params;
  try {
    const course = loadCourse(courseSlug);
    const hit = findLessonMeta(course, lessonSlug);
    if (!hit) return { title: "Lesson not found" };
    return { title: `${hit.title} · ${course.title}` };
  } catch {
    return { title: "Course not found" };
  }
}

export default async function LessonPage({ params }: Props) {
  const { courseSlug, lessonSlug } = await params;

  let course;
  try {
    course = loadCourse(courseSlug);
  } catch {
    notFound();
  }

  const hit = findLessonMeta(course, lessonSlug);
  if (!hit) notFound();

  let source: string;
  try {
    source = loadLessonSource(courseSlug, hit.moduleSlug, lessonSlug);
  } catch {
    notFound();
  }

  const mdxSource = rewriteLessonAssetUrls(source, courseSlug);

  const { content } = await compileMDX({
    source: mdxSource,
    components: {
      CompoundInterestCalculator,
      CourseImage: (props: { src?: string; alt?: string; className?: string }) => (
        <CourseImage
          courseSlug={courseSlug}
          src={props.src ?? ""}
          alt={props.alt ?? ""}
          className={props.className}
        />
      ),
      img: (props: ImgHTMLAttributes<HTMLImageElement>) => (
        <CourseImage
          courseSlug={courseSlug}
          src={typeof props.src === "string" ? props.src : ""}
          alt={props.alt ?? ""}
          className={props.className}
        />
      ),
      VideoPlayer,
      ProtectedVideo,
      DownloadFile,
    },
  });

  const { prev, next } = getLessonNeighbors(course, lessonSlug);

  return (
    <main className="mx-auto max-w-3xl px-6 py-8 lg:py-12">
      <p className="text-sm font-medium text-zinc-500">{course.title}</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900">
        {hit.title}
      </h1>
      <article className="lesson-mdx mt-10">{content}</article>
      <LessonPager courseSlug={courseSlug} prev={prev} next={next} />
    </main>
  );
}
