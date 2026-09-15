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
  scriptUrl: string;
};

function substituteParameters(script: string, values: Record<string, string>) {
  return script.replace(/{{([A-Za-z][A-Za-z0-9_-]*)}}/g, (token, name) =>
    Object.hasOwn(values, name)
      ? values[name].replaceAll("'", "'\"'\"'")
      : token,
  );
}

function formatParameterFlag(name: string) {
  return `--${name.replaceAll("_", "-")}`;
}

function quoteShellArgument(value: string) {
  return `'${value.replaceAll("'", "'\"'\"'")}'`;
}

function createDownloadCommand(
  origin: string,
  scriptUrl: string,
  parameters: SystemScriptParameter[],
  values: Record<string, string>,
) {
  const argumentsToPass = parameters.flatMap((parameter) => {
    if (parameter.type === "password") return [];

    const value = values[parameter.name] ?? "";
    return value
      ? [formatParameterFlag(parameter.name), quoteShellArgument(value)]
      : [];
  });

  return `bash <(curl -fsSL ${origin}${scriptUrl})${argumentsToPass.length ? ` ${argumentsToPass.join(" ")}` : ""}`;
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
  scriptUrl,
}: SystemScriptProps) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      parameters.map((parameter) => [parameter.name, parameter.default]),
    ),
  );
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const [copied, setCopied] = useState(false);
  const [copiedDownload, setCopiedDownload] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [script, setScript] = useState<string>();
  const [scriptError, setScriptError] = useState(false);
  const [origin, setOrigin] = useState("https://hero4hire.com");
  const renderedScript = useMemo(() => {
    if (!script) return "";
    return substituteParameters(script, values);
  }, [script, values]);
  const downloadCommand = useMemo(
    () => createDownloadCommand(origin, scriptUrl, parameters, values),
    [origin, parameters, scriptUrl, values],
  );
  const canCopyScript = parameters.every(
    (parameter) => !parameter.required || values[parameter.name]?.trim(),
  );
  const canCopyDownload = parameters.every(
    (parameter) =>
      parameter.type === "password" ||
      !parameter.required ||
      values[parameter.name]?.trim(),
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

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadScript() {
      setScript(undefined);
      setScriptError(false);

      try {
        const response = await fetch(scriptUrl, { signal: controller.signal });
        if (!response.ok) throw new Error("Unable to load script");
        setScript(await response.text());
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setScriptError(true);
      }
    }

    void loadScript();
    return () => controller.abort();
  }, [scriptUrl]);

  function getCurrentValues() {
    return Object.fromEntries(
      parameters.map((parameter) => [
        parameter.name,
        inputs.current[parameter.name]?.value ?? values[parameter.name] ?? "",
      ]),
    );
  }

  function focusMissingRequiredValue(
    currentValues: Record<string, string>,
    allowPasswordPrompt = false,
  ) {
    const missing = parameters.find((parameter) => {
      const isPasswordPrompt =
        allowPasswordPrompt && parameter.type === "password";
      return (
        !isPasswordPrompt &&
        parameter.required &&
        !currentValues[parameter.name]?.trim()
      );
    });

    if (missing) inputs.current[missing.name]?.focus();
    return missing;
  }

  async function copyScript() {
    const currentValues = getCurrentValues();
    if (focusMissingRequiredValue(currentValues) || !script) return;

    try {
      await copyText(substituteParameters(script, currentValues));
      setCopyFailed(false);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      setCopyFailed(true);
    }
  }

  async function copyDownloadCommand() {
    const currentValues = getCurrentValues();
    if (focusMissingRequiredValue(currentValues, true)) return;

    try {
      await copyText(
        createDownloadCommand(origin, scriptUrl, parameters, currentValues),
      );
      setCopyFailed(false);
      setCopiedDownload(true);
      window.setTimeout(() => setCopiedDownload(false), 2_000);
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
      {parameters.length > 0 ? (
        <div className="space-y-3">
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
          {parameters.some((parameter) => parameter.type === "password") ? (
            <p className="text-xs text-muted-foreground">
              Download commands omit password values and prompt securely when
              run.
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="grid gap-3 rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">Download command</span>
          <Button
            disabled={!canCopyDownload}
            onClick={copyDownloadCommand}
            size="sm"
            type="button"
            variant="outline"
          >
            {copiedDownload ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
            {copiedDownload
              ? "Copied"
              : copyFailed
                ? "Copy failed"
                : "Copy command"}
          </Button>
        </div>
        <pre className="overflow-auto rounded-lg border bg-muted p-4 text-sm">
          <code>{downloadCommand}</code>
        </pre>
      </div>
      <details className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm">
        <summary className="cursor-pointer px-6 py-4 text-sm font-medium marker:text-muted-foreground">
          Show script
        </summary>
        <div className="grid gap-3 border-t p-6">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">Script</span>
            <Button
              disabled={!canCopyScript || !script}
              onClick={copyScript}
              size="sm"
              type="button"
            >
              {copied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
              {copied ? "Copied" : copyFailed ? "Copy failed" : "Copy script"}
            </Button>
          </div>
          <pre className="max-h-96 overflow-auto rounded-lg border bg-muted p-4 text-sm">
            <code>
              {scriptError
                ? "Unable to load the script. Refresh the page and try again."
                : script
                  ? renderedScript
                  : "Loading script…"}
            </code>
          </pre>
        </div>
      </details>
    </div>
  );
}
