import { ArrowRight } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { blog } from "@/lib/source";

export const metadata = {
  title: "Blog",
  description: "Updates and insights from Hero4Hire.",
};

export default function BlogIndex() {
  const posts = blog
    .getPages()
    .sort(
      (a, b) =>
        new Date(b.data.date).getTime() - new Date(a.data.date).getTime(),
    );
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-16 sm:py-24">
      <Link
        href="/"
        className="text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        ← Hero4Hire
      </Link>
      <header className="mt-12">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          The blog
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Notes from Hero4Hire
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Product news, practical guidance, and the thinking behind our work.
        </p>
      </header>
      <div className="mt-12 grid gap-5">
        {posts.map((post) => (
          <Card key={post.url}>
            <CardHeader>
              <p className="text-sm text-muted-foreground">
                {new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(
                  new Date(post.data.date),
                )}
              </p>
              <CardTitle className="text-2xl">
                <Link className="hover:underline" href={post.url}>
                  {post.data.title}
                </Link>
              </CardTitle>
              <CardDescription>{post.data.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                className="inline-flex items-center gap-2 text-sm font-medium"
                href={post.url}
              >
                Read article <ArrowRight className="size-4" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
