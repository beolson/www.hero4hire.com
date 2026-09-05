import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: "Hero4Hire",
    },
    links: [
      { text: "Home", url: "/" },
      { text: "Docs", url: "/docs" },
      { text: "Blog", url: "/blog" },
    ],
  };
}
