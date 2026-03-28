# Product Vision

## One-Line Definition

Thingspire Flow is a data-driven organizational operations system for measuring, understanding, and improving the organization.

## Purpose

Thingspire Flow is not just a survey tool or a narrow evaluation product.

It exists to:

- understand the current state of the organization accurately
- support change management during organizational transition
- enable data-based decision-making for leadership
- help culture form collectively with employees, not only top-down

## Current Company Context

The system is being designed during an important transition period that includes:

- organizational structure change
- CTO onboarding
- prior leader departure
- ongoing culture change
- employee anxiety in parts of the organization
- financial pressure experience

This context is not optional background. It is part of the reason the system exists.

## Direction

### 1. Integrated System

Thingspire Flow must be treated as an all-in-one HR and organizational operations platform.

The long-term product structure includes separate modules such as:

- organizational culture survey
- 360 feedback
- goal management
- performance evaluation
- task management
- HRIS / people data

Survey is Phase 1, but survey is not the whole product.

### 2. Data-Driven Operation

The system should support decisions based on measurable data instead of intuition only.

Example analysis directions:

- organization A vs organization B comparison
- development vs non-development comparison
- leadership impact analysis
- time-series change tracking

### 3. Anonymity and Trust

The system must preserve trust.

Core rules:

- no individual identification in survey analysis
- organization-level interpretation only
- statistical reporting only
- the purpose is improvement, not punishment

### 4. Change Management Focus

The system should be treated as a change-management system, not merely an evaluation system.

It should help:

- verify whether change direction is working
- detect side effects early
- identify improvement points quickly

## Modules

### Phase 1

- organizational culture survey

### Planned Modules

- 360 feedback
- MBO / OKR goal management
- performance evaluation
- task / project management
- HRIS / personnel records

## Design and Product Implications

These product rules must shape the codebase:

- information architecture must separate modules clearly
- labels and navigation must not imply survey is the whole system
- dashboard should read as the base system home, not as a survey-only landing page
- module-specific screens should identify themselves as one functional area within a larger platform
- future data models should assume cross-module integration, not isolated feature silos

## Non-Negotiable Principles

1. 100% anonymity protection for survey analysis
2. No data distortion or misleading interpretation
3. Results must connect to visible improvement action
4. Survey must connect to follow-up action and re-measurement
5. Product structure must remain modular

## Current Product Positioning Rule

Until more modules are implemented, the UI may expose survey-first functionality.

However, all new naming, IA, navigation, and documentation should treat survey as one module inside an integrated system.
