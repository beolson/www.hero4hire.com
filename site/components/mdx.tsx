import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { SystemScript } from "@/components/system-script";

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    SystemScript,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
