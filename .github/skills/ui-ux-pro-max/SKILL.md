---
name: ui-ux-pro-max
description: "Use when building, designing, creating, implementing, reviewing, fixing, or improving UI and UX for web and mobile products, including landing pages, SaaS pages, dashboards, and design systems."
---

# UI UX Pro Max Skill

Comprehensive UI and UX workflow with searchable datasets for style, product patterns, color systems, typography, UX rules, landing structures, chart recommendations, and stack-specific guidance.

## Assets

This skill reuses the installed package at:
- .github/prompts/ui-ux-pro-max/scripts/
- .github/prompts/ui-ux-pro-max/data/

## Prerequisites

Check Python:

```bash
python --version
```

If Python is missing on Windows:

```powershell
winget install Python.Python.3.12
```

## Workflow

### 1. Analyze the request

Extract:
- Product type (SaaS, e-commerce, dashboard, portfolio, etc.)
- Style intent (minimal, bold, elegant, playful, etc.)
- Industry (fintech, healthcare, gaming, education, etc.)
- Target stack (if missing, default to html-tailwind)

### 2. Generate design system (required)

Always start here:

```bash
python .github/prompts/ui-ux-pro-max/scripts/search.py "<product industry keywords>" --design-system -p "Project Name"
```

To persist master rules:

```bash
python .github/prompts/ui-ux-pro-max/scripts/search.py "<product industry keywords>" --design-system --persist -p "Project Name"
```

With page override:

```bash
python .github/prompts/ui-ux-pro-max/scripts/search.py "<product industry keywords>" --design-system --persist -p "Project Name" --page "dashboard"
```

### 3. Run focused searches (optional)

```bash
python .github/prompts/ui-ux-pro-max/scripts/search.py "<keyword>" --domain <domain> -n 10
```

Domains:
- product
- style
- typography
- color
- landing
- chart
- ux
- react
- web
- prompt

### 4. Pull stack guidance

Default stack is html-tailwind when unspecified.

```bash
python .github/prompts/ui-ux-pro-max/scripts/search.py "<keyword>" --stack html-tailwind
```

Stacks:
- html-tailwind
- react
- nextjs
- vue
- svelte
- swiftui
- react-native
- flutter
- shadcn
- jetpack-compose

## Response behavior

When this skill is used, produce:
1. A concise design direction summary
2. A practical component and layout plan
3. Color and typography decisions
4. UX and accessibility constraints
5. Implementation-ready guidance for the requested stack

Avoid generic visual output. Favor intentional visual direction and clear rationale.
