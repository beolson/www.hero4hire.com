import { InlineTOC } from "fumadocs-ui/components/inline-toc";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMDXComponents } from "@/components/mdx";
import { blog } from "@/lib/source";

export const dynamicParams = false;

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const page = blog.getPage([(await params).slug]);
  if (!page) notFound();
  const MDX = page.data.body;
  return (
    <article className="mx-auto min-h-screen max-w-3xl px-6 py-16 sm:py-24">
      <Link
        href="/blog"
        className="text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        ← All posts
      </Link>
      <header className="mt-12 border-b pb-10">
        <p className="text-sm text-muted-foreground">
          {new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(
            new Date(page.data.date),
          )}{" "}
          · {page.data.author}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          {page.data.title}
        </h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">
          {page.data.description}
        </p>
      </header>
      <InlineTOC items={page.data.toc} className="my-8" />
      <div className="prose prose-neutral max-w-none dark:prose-invert">
        <MDX components={getMDXComponents()} />
      </div>
    </article>
  );
}

export function generateStaticParams() {
  return blog.getPages().map((page) => ({ slug: page.slugs[0] }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const page = blog.getPage([(await params).slug]);
  if (!page) notFound();
  return { title: page.data.title, description: page.data.description };
}
