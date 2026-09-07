"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type SystemScriptParameter = {
  name: string;
  label: string;
  description: string;
  default: string;
  required?: boolean;
  type?: "password" | "text";
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
    Object.hasOwn(values, name)
      ? values[name].replaceAll("'", "'\"'\"'")
      : token,
  );
}

function formatLabel(value: string | undefined) {
  if (!value) return "Not specified";

  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();

    if (!copied) throw new Error("Clipboard access was denied");
  }
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
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const renderedScript = useMemo(
    () => substituteParameters(script, values),
    [script, values],
  );
  const canCopy = parameters.every(
    (parameter) => !parameter.required || values[parameter.name]?.trim(),
  );

  useEffect(() => {
    function syncAutofilledValues() {
      setValues((current) => ({
        ...current,
        ...Object.fromEntries(
          parameters.map((parameter) => [
            parameter.name,
            inputs.current[parameter.name]?.value ?? "",
          ]),
        ),
      }));
    }

    const firstCheck = window.setTimeout(syncAutofilledValues, 50);
    const secondCheck = window.setTimeout(syncAutofilledValues, 500);
    return () => {
      window.clearTimeout(firstCheck);
      window.clearTimeout(secondCheck);
    };
  }, [parameters]);

  async function copyScript() {
    const currentValues = Object.fromEntries(
      parameters.map((parameter) => [
        parameter.name,
        inputs.current[parameter.name]?.value ?? values[parameter.name] ?? "",
      ]),
    );
    const missing = parameters.find(
      (parameter) =>
        parameter.required && !currentValues[parameter.name]?.trim(),
    );

    if (missing) {
      inputs.current[missing.name]?.focus();
      return;
    }

    try {
      await copyText(substituteParameters(script, currentValues));
      setCopyFailed(false);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      setCopyFailed(true);
    }
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
                    defaultValue={parameter.default}
                    id={`system-script-${parameter.name}`}
                    onInput={(event) => {
                      const value = event.currentTarget.value;
                      setValues((current) => ({
                        ...current,
                        [parameter.name]: value,
                      }));
                    }}
                    ref={(element) => {
                      inputs.current[parameter.name] = element;
                    }}
                    required={parameter.required}
                    type={parameter.type ?? "text"}
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
                {copied
                  ? "Copied"
                  : copyFailed
                    ? "Copy failed"
                    : "Copy script"}
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
