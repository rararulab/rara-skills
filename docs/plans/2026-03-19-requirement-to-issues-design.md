# Requirement to Issues — Design Document

Date: 2026-03-19

## Problem

Users send development requirements through various channels (Telegram, Slack, direct
conversation). These requirements need to be converted into Linear issues that Symphony
can dispatch to ralph for implementation.

## Solution

A rara skill (`requirement-to-issues`) that:

1. Identifies the target repo from the user's message
2. Uses brainstorming to clarify ambiguous requirements
3. Creates a structured Linear issue via MCP
4. Lets Symphony + ralph handle the rest

## Architecture

```
User (TG/Slack/...) → Rara (requirement-to-issues skill)
  → Brainstorm with user (clarify intent)
  → Create Linear issue (label: repo:owner/repo, status: Todo)
  → Symphony polls Todo issues
  → Ralph round 1: deep analysis, sub-issue breakdown, implementation, writes acceptance criteria → ToVerify
  → Symphony polls ToVerify issues
  → Ralph round 2: verify against acceptance criteria → Done
```

## Rara's Responsibility Boundary

Rara does:
- Understand user intent
- Ask clarifying questions
- Create well-structured Linear issues

Rara does NOT:
- Read repo code or structure
- Design technical solutions
- Define acceptance criteria
- Break down into sub-tasks

## Linear Issue Format

```markdown
## 需求
{What and why}

## 背景
{Original context from user}

## 约束
{Constraints, if any}
```

Metadata:
- Label: `repo:<owner>/<repo>`
- Status: `Todo`

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Who breaks down requirements? | Ralph (not Rara) | Rara is a general agent without repo context |
| Who writes acceptance criteria? | Ralph round 1 | Needs technical understanding of the repo |
| Who verifies? | Ralph round 2 via Symphony | Automated verification against acceptance criteria |
| Issue format | Minimal (需求/背景/约束) | Ralph will enrich; Rara keeps it focused on intent |
| Brainstorming depth | Shallow — clarify intent only | Technical depth is ralph's job |
