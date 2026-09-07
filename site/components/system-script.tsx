"use client";

import { Check, Copy } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type SystemScriptParameter = {
  name: string;
  label: string;
  description: string;
  default: string;
  required?: boolean;
};

type SystemScriptProps = {
  os: string;
  version: string;
  arch: string;
  parameters?: SystemScriptParameter[];
  script: string;
};

function substituteParameters(script: string, values: Record<string, string>) {
  return script.replace(/{{([A-Za-z][A-Za-z0-9_-]*)}}/g, (token, name) =>
    Object.hasOwn(values, name) ? values[name] : token,
  );
}

function formatLabel(value: string | undefined) {
  if (!value) return "Not specified";

  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function SystemScript({
  os,
  version,
  arch,
  parameters = [],
  script,
}: SystemScriptProps) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      parameters.map((parameter) => [parameter.name, parameter.default]),
    ),
  );
  const [copied, setCopied] = useState(false);
  const renderedScript = useMemo(
    () => substituteParameters(script, values),
    [script, values],
  );
  const canCopy = parameters.every(
    (parameter) => !parameter.required || values[parameter.name]?.trim(),
  );

  async function copyScript() {
    await navigator.clipboard.writeText(renderedScript);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2_000);
  }

  return (
    <div className="my-6 space-y-3">
      <p className="text-sm text-muted-foreground">
        System:{" "}
        <span className="font-medium text-foreground">
          {formatLabel(os)} {version || "Not specified"}{" "}
          {arch || "Not specified"}
        </span>
      </p>
      <details className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm">
        <summary className="cursor-pointer px-6 py-4 text-sm font-medium marker:text-muted-foreground">
          Show script
        </summary>
        <div className="space-y-6 border-t p-6">
          {parameters.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {parameters.map((parameter) => (
                <label
                  className="grid gap-1.5"
                  htmlFor={`system-script-${parameter.name}`}
                  key={parameter.name}
                >
                  <span className="text-sm font-medium">{parameter.label}</span>
                  {parameter.required ? (
                    <span className="text-xs text-destructive">Required</span>
                  ) : null}
                  <Input
                    id={`system-script-${parameter.name}`}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [parameter.name]: event.target.value,
                      }))
                    }
                    required={parameter.required}
                    value={values[parameter.name] ?? ""}
                  />
                  <span className="text-xs text-muted-foreground">
                    {parameter.description}
                  </span>
                </label>
              ))}
            </div>
          ) : null}
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Script</span>
              <Button
                disabled={!canCopy}
                onClick={copyScript}
                size="sm"
                type="button"
              >
                {copied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
                {copied ? "Copied" : "Copy script"}
              </Button>
            </div>
            <pre className="max-h-96 overflow-auto rounded-lg border bg-muted p-4 text-sm">
              <code>{renderedScript}</code>
            </pre>
          </div>
        </div>
      </details>
    </div>
  );
}
