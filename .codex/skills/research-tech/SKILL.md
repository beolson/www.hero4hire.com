---
name: research-tech
description: Research technology topics through user-approved scoping, web investigation, runnable proof-of-concept code, and findings in this repository’s brain/ workspace. Use for hands-on technology evaluations, rather than brief technical lookups.
---

# Research Technology

Follow these four stages in order. Research artifacts belong in `brain/` at this repository’s root, not the filesystem-root `/brain`. Each topic has its own folder. Keep POC implementation and configuration inside the topic rather than changing the site's application or dependencies.

## 1. Agree on scope

Begin with a conversation, keeping this stage read-only until the user explicitly agrees to a scope summary. Inspect existing context as needed, then discuss unresolved choices:

- The research question, intended audience and use, and decisions the research should support.
- Included and excluded topics, technology stack, and relevant version or compatibility constraints.
- Questions to answer, what the POCs must demonstrate, and observable success criteria.
- Runtime and verification requirements, including any external services, credentials, costs, or resource constraints.

Present the proposed scope in the conversation and wait for explicit agreement before creating directories or writing any research files. Agreement must cover the summary; a request to research a topic alone does not satisfy this gate. If scope is already established and explicitly approved in the conversation, use that agreement without asking again.

After agreement, choose a descriptive lowercase, hyphenated topic name. Create `brain/<topic-name>/scope.md` recording the agreed scope and requirements above. If that topic folder already exists, clarify whether to continue it or create a distinct topic before altering its contents. For a resumed topic, inspect its scope and existing artifacts and continue from the appropriate stage. Confirm material scope changes before updating `scope.md` and proceeding with the changed work.

This stage is complete when the scope is explicitly agreed and recorded.

## 2. Research the web

Investigate the agreed questions and relevant implementation patterns. Prioritize current official documentation, primary technical sources, and implementation examples. Compare approaches and tradeoffs within the scoped stack; check source versions and dates where they affect applicability.

Preserve direct source links and enough context to support the final findings. Distinguish documented facts, inferences, and hypotheses to test. Identify an approach for each POC grounded in the research and the agreed success criteria.

This stage is complete when the research supports the scoped questions and provides a concrete approach for the POCs.

## 3. Build and verify POCs

Create each demonstration in `brain/<topic-name>/pocs/<poc-name>/` using the agreed technology stack. Keep it independently runnable with its own dependencies, relevant version information, configuration examples without secrets, and instructions for setup, execution, verification, and cleanup where needed. State expected results.

Install dependencies, execute the POC in the agreed runtime, and check its observable behavior against the scoped success criteria. Use meaningful tests or smoke checks appropriate to the demonstration. Record commands, environment, and actual outcomes so another person can reproduce the verification.

Resolve failures within the agreed scope. If credentials, services, network access, or another prerequisite blocks execution, explain the blocker and request what is needed. An emulator or mock only satisfies verification if the agreed scope permits it. Report partial results honestly; leave verification marked incomplete until the required behavior has actually been exercised successfully.

This stage is complete only when the required POCs run successfully and satisfy their verification criteria. If blocked, findings may document interim evidence but must identify the unfinished work.

## 4. Produce findings

Write `brain/<topic-name>/findings.md` for the agreed audience. Include:

- Answers to the scoped questions and whether the success criteria were met.
- Relevant patterns, alternatives, tradeoffs, and recommendations supported by evidence.
- Direct source links and relevant dates or versions.
- Relative links to the POCs, reproduction instructions, and actual verification results.
- Limitations, blockers, remaining questions, and next steps where applicable.

Separate conclusions based on source material from conclusions observed in POCs. Label interim findings and incomplete verification clearly. Finish by linking the scope, findings, and POCs in the user-facing response and stating the verification status.
