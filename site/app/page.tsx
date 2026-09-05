import { ArrowRight, BookOpen, Newspaper } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-6">
      <header className="flex h-20 items-center justify-between border-b">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Hero4Hire
        </Link>
        <nav
          className="flex items-center gap-5 text-sm text-muted-foreground"
          aria-label="Main navigation"
        >
          <Link className="hover:text-foreground" href="/docs">
            Docs
          </Link>
          <Link className="hover:text-foreground" href="/blog">
            Blog
          </Link>
        </nav>
      </header>
      <section className="flex flex-1 flex-col justify-center py-20 sm:py-28">
        <p className="mb-5 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Hero4Hire documentation
        </p>
        <h1 className="max-w-3xl text-5xl font-semibold tracking-tight sm:text-7xl">
          A clearer path from work to impact.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
          Guides, product knowledge, and practical notes for teams building
          their next great thing with Hero4Hire.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/docs">
              Explore the docs <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/blog">Read the blog</Link>
          </Button>
        </div>
      </section>
      <section className="grid gap-5 pb-16 md:grid-cols-2">
        <Card>
          <CardHeader>
            <BookOpen className="mb-2 size-5" />
            <CardTitle>Documentation</CardTitle>
            <CardDescription>
              Start with the essentials and build from there.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              className="text-sm font-medium underline underline-offset-4"
              href="/docs/getting-started"
            >
              Get started
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Newspaper className="mb-2 size-5" />
            <CardTitle>From the team</CardTitle>
            <CardDescription>
              News, workflows, and the ideas behind Hero4Hire.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              className="text-sm font-medium underline underline-offset-4"
              href="/blog"
            >
              Visit the blog
            </Link>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
