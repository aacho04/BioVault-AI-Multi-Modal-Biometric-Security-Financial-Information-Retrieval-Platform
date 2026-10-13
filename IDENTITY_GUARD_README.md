# 🛡️ IdentityGuard: Session Risk & Account-Takeover (ATO) Detection Platform

[![Domain](https://img.shields.io/badge/Domain-2%20AI%20Systems%20%26%20Infrastructure-blue.svg)](https://shields.io/)
[![Architecture](https://img.shields.io/badge/Architecture-Event--Driven%20State%20Machine-brightgreen.svg)](https://shields.io/)
[![Policy-Engine](https://img.shields.io/badge/Policy-Deterministic%20Rule%20Tracer-orange.svg)](https://shields.io/)
[![AI-Safety](https://img.shields.io/badge/AI%20Safety-Hybrid%20Rule--Gated%20Inference-purple.svg)](https://shields.io/)

> **IdentityGuard** is an enterprise-grade session monitoring and Account Takeover (ATO) detection engine. It continuously ingests user event streams, incrementally learns habitual behavioral baselines (devices, geo-locations, circadian temporal distributions, and action trajectories), flags interpretable risk signals with mathematical reasoning, handles sparse and out-of-order data, and triggers traceable policy responses—with human-in-the-loop analyst replay and strict session revocation guarantees.

---

## 📑 Table of Contents
1. [Executive Summary & Problem Statement](#-executive-summary--problem-statement)
2. [End-to-End System Architecture](#-end-to-end-system-architecture)
3. [Event Ingestion Schema & Data Contract](#-event-ingestion-schema--data-contract)
4. [Habitual Baseline Learning & Behavioral Profiling](#-habitual-baseline-learning--behavioral-profiling)
5. [Risk Signal Detection Engine & Mathematical Formulations](#-risk-signal-detection-engine--mathematical-formulations)
   - [Signal 1: Unfamiliar Device](#signal-1-unfamiliar-device-signal_unfamiliar_device)
   - [Signal 2: Implausible Location Change (Impossible Travel)](#signal-2-implausible-location-change-signal_impossible_travel)
   - [Signal 3: Circadian Hour Deviation](#signal-3-circadian-hour-deviation-signal_unusual_hours)
   - [Signal 4: Rapid Sensitive Action Post-Novel-Login](#signal-4-rapid-sensitive-action-signal_sensitive_velocity)
6. [Resilience & Edge-Case Handling](#-resilience--edge-case-handling)
   - [Sparse History & Cold-Start Users](#1-sparse-history--cold-start-accounts)
   - [Unknown & Missing Location Labels](#2-unknown-or-unresolved-location-labels)
   - [Out-of-Order Timestamps & Sliding Monotonic Buffers](#3-out-of-order-timestamps--retroactive-reconciliation)
7. [Configurable Rule Engine & Traceable Policy Responses](#-configurable-rule-engine--traceable-policy-responses)
8. [AI Guardrails: Hybrid Sequence Anomaly Scoring](#-ai-guardrails-hybrid-sequence-anomaly-scoring)
9. [Analyst Replay Studio & Session Revocation Lifecycle](#-analyst-replay-studio--session-revocation-lifecycle)
10. [RESTful & Streaming API Reference](#-restful--streaming-api-reference)
11. [Project Structure & Implementation Blueprint](#-project-structure--implementation-blueprint)

---

## 🎯 Executive Summary & Problem Statement

### The Threat Model: Account Takeover (ATO)
Account Takeover typically follows a stealthy reconnaissance and privilege escalation lifecycle:
1. **Initial Vector**: Credential stuffing, SIM swap, or session hijacking exposes valid user credentials.
2. **First Anomalous Hop**: The adversary authenticates from an unfamiliar hardware device, cloud provider IP, or foreign location.
3. **High-Risk Payload**: Within minutes of access, the attacker executes sensitive actions: changing the notification email, rotating credentials, enrolling unauthorized MFA factors, or requesting an immediate balance drain.

### Why Traditional Defenses Fail
* **Blanket Static Rules**: Flagging any new city or new device leads to severe alert fatigue and false positives (e.g., legitimate corporate travelers, smartphone upgrades).
* **Known-Bad IP Blocklists**: Attackers utilize residential proxy networks, easily bypassing IP reputation filters.
* **Black-Box AI Alerting**: Alerts that simply state `"Risk Score: 0.89"` or `"Suspicious Login"` cannot be audited or acted upon by security analysts under regulatory scrutiny (GDPR, PCI-DSS, SOC-2).

### IdentityGuard's Solution
IdentityGuard solves this with **hybrid, explainable detection**:
* Learns individual behavioral patterns incrementally without cold-start failures.
* Breaks down every decision into atomic, human-readable risk signals with quantitative values and rationale.
* Couples sequence AI with strict deterministic rules—guaranteeing that **AI never triggers an irreversible response alone**.
* Provides a time-travel **Analyst Replay Engine** that simulates historical logs and mathematically proves session revocation enforcement.

---

## 🌐 End-to-End System Architecture

```mermaid
flowchart TD
    subgraph INGESTION ["1. Ingestion & Event Ordering Layer"]
        EV[Raw Event Stream: JSON / Kafka / Webhook] --> BUF[Sliding Monotonic Buffer<br/>• Out-of-Order Re-sequencer<br/>• Timestamp Window: 10 min]
        BUF --> VAL{Schema & Data Hygiene Validator}
        VAL -->|Valid Event| DISPATCH[Event Dispatcher]
        VAL -->|Corrupt / Malformed| DLQ[Dead Letter Queue]
    end

    subgraph PROFILER ["2. Behavioral Profiling & Habitual Memory"]
        DISPATCH --> USER_STATE[User State Store<br/>• Device Fingerprint Registry<br/>• Circadian Hour Histograms<br/>• Geo-Centroid Clusters<br/>• Historical Action Sequences]
        USER_STATE --> SPARSE_CHECK{History Size < N?}
        SPARSE_CHECK -->|Yes| SPARSE_FLAG[Mark: Limited Information State]
        SPARSE_CHECK -->|No| BASELINE_READY[Profile Loaded]
    end

    subgraph DETECTOR ["3. Signal Extraction & Mathematical Scoring"]
        BASELINE_READY & SPARSE_FLAG --> SIG_DEV[Signal 1: Unfamiliar Device<br/>Jaccard Distance + Hardware Hash]
        BASELINE_READY & SPARSE_FLAG --> SIG_GEO[Signal 2: Impossible Travel<br/>Haversine Great-Circle / Δt Speed]
        BASELINE_READY & SPARSE_FLAG --> SIG_TIME[Signal 3: Circadian Hour Anomaly<br/>von Mises / KDE Distribution]
        BASELINE_READY & SPARSE_FLAG --> SIG_SEQ[Signal 4: Sensitive Velocity Spike<br/>Δt(Login_New_Device → Sensitive_Action)]
        
        subgraph AI_SUBSYSTEM ["AI Sequence Analysis"]
            DISPATCH --> SEQ_MODEL[Markov / LSTM Action Predictor<br/>Computes Trajectory Surprisal Score]
            SEQ_MODEL -.->|Advisory Score Only| AI_GATED_SIGNAL[Signal 5: Sequence Anomaly]
        end
    end

    subgraph POLICY ["4. Deterministic Rule & Policy Engine"]
        SIG_DEV & SIG_GEO & SIG_TIME & SIG_SEQ & AI_GATED_SIGNAL --> RULE_EVAL[Deterministic Rules Evaluator<br/>Evaluates Configurable YAML Policy Matrix]
        RULE_EVAL --> AUDIT_BUILDER[Explainability & Audit Tracer<br/>Attaches Signals + Values + Rationale]
    end

    subgraph RESPONSES ["5. Action Dispatcher & Session State Machine"]
        RULE_EVAL --> RESP_DECISION{Policy Decision}
        RESP_DECISION -->|Score < 0.30| ALLOW[NO_ACTION<br/>Allow Activity]
        RESP_DECISION -->|Moderate Risk| STEP_UP[STEP_UP_VERIFICATION<br/>Trigger FIDO2 / Biometric Face Scan]
        RESP_DECISION -->|Critical Threat| REVOKE[SESSION_REVOCATION<br/>Invalidate JWT / Blacklist Session ID]
        RESP_DECISION -->|Ambiguous / Sparse| REVIEW[ANALYST_REVIEW<br/>Triage Queue with Trace Report]
    end

    subgraph ENFORCEMENT ["6. Enforcement Gate & Session Ledger"]
        REVOKE --> BLOCKLIST[Active Session Revocation Table]
        DISPATCH -.-> CHECK_REVOKED{Session In Blocklist?}
        CHECK_REVOKED -->|Yes| HARD_DENY[403 FORBIDDEN: Terminated Session]
    end

    subgraph REPLAY ["7. Analyst Replay Studio"]
        STORAGE[(Historical Event Audit DB)] --> REPLAY_UI[Analyst Replay Interface]
        REPLAY_UI -->|Step-Through Events| BUF
    end
```

---

## 📦 Event Ingestion Schema & Data Contract

Every monitored session interaction arrives as an atomic event adhering to the strict schema below:

```json
{
  "event_id": "evt_98f7e2a4-b223-4c59-a78b-04e8d3b5b111",
  "timestamp": "2026-10-11T09:45:00.000Z",
  "user_id": "usr_alex_vance_88",
  "session_id": "sess_89f02c98d71241aa",
  "device_identifier": {
    "device_hash": "dvh_9a7b3c21e",
    "browser": "Chrome 124.0",
    "os": "macOS 14.4",
    "hardware_concurrency": 8,
    "canvas_fingerprint": "cf_e839210a"
  },
  "location": {
    "label": "Frankfurt, Germany",
    "country_iso": "DE",
    "latitude": 50.1109,
    "longitude": 8.6821,
    "ip_address": "194.26.29.11"
  },
  "action": {
    "name": "UPDATE_EMAIL",
    "category": "SENSITIVE",
    "parameters": {
      "new_email": "attacker_drop@proton.me"
    }
  }
}
```

### Action Taxonomy & Risk Categorization

| Action Name | Category | Base Sensitivity Weight ($w_{action}$) | Description |
| :--- | :--- | :---: | :--- |
| `LOGIN` | `AUTHENTICATION` | $0.20$ | Session initialization challenge |
| `VIEW_DASHBOARD` | `BENIGN_READ` | $0.00$ | Standard portfolio / overview viewing |
| `SEARCH_DOCS` | `BENIGN_READ` | $0.00$ | Information retrieval query |
| `UPDATE_EMAIL` | `SENSITIVE` | $0.85$ | Recovery address modification (High ATO target) |
| `UPDATE_PHONE` | `SENSITIVE` | $0.85$ | SMS/2FA routing reconfiguration |
| `RESET_PASSWORD` | `SENSITIVE` | $0.90$ | Credential rotation |
| `TRANSFER_FUNDS` | `FINANCIAL` | $0.80$ | Outbound monetary asset movement |
| `ADD_NEW_PAYEE` | `FINANCIAL` | $0.75$ | White-listing new external beneficiary |

---

## 🧠 Habitual Baseline Learning & Behavioral Profiling

IdentityGuard maintains an incremental state model for every active user profile $U_i$. Rather than relying on rigid static thresholds, it derives adaptive user envelopes:

### 1. Device Affinity Registry
Tracks known devices with temporal frequency decay:
$$\text{Affinity}(d, U_i) = \sum_{t_k \in \text{Uses}(d)} e^{-\lambda (t_{\text{now}} - t_k)}$$
* A device unseen for 90 days gradually loses affinity.
* Devices with zero recorded interaction trigger an unfamiliarity penalty.

### 2. Circadian Hour Modeling (von Mises Circular Kernel)
Since time of day is periodic on a 24-hour cycle ($0 \equiv 24$), a standard Gaussian distribution fails across midnight. We model activity using the **von Mises distribution** (circular normal):
$$f(\theta \mid \mu, \kappa) = \frac{\exp(\kappa \cos(\theta - \mu))}{2\pi I_0(\kappa)}$$
Where:
* $\theta = \frac{2\pi \cdot \text{hour}}{24}$ is the angular representation of the event timestamp.
* $\mu$ is the user's circular mean login hour.
* $\kappa$ is the concentration parameter (higher $\kappa$ = very rigid working schedule; lower $\kappa$ = irregular hours).
* $I_0(\kappa)$ is the modified Bessel function of order 0.

### 3. Geographical Centroid Clustering
Tracks regular access locations as spherical clusters:
$$\mathcal{C}_{U_i} = \{ (\text{lat}_c, \text{lon}_c, r_c) \mid c \in 1 \dots K \}$$
Where $r_c$ is the historical radius of nominal activity (e.g., home, office, secondary branch).

---

## ⚡ Risk Signal Detection Engine & Mathematical Formulations

Every incoming event is evaluated by parallel detectors that produce an atomic signal tuple:
$$\mathcal{S} = (\text{signal\_id}, \text{value} \in [0.0, 1.0], \text{confidence} \in [0.0, 1.0], \text{reason\_str})$$

---

### Signal 1: Unfamiliar Device (`SIGNAL_UNFAMILIAR_DEVICE`)

Evaluates novelty of the device fingerprint against the user's device registry:
$$\text{Score}_{\text{dev}} = \begin{cases} 
0.0 & \text{if } \text{device\_hash} \in \text{Registry}_{\text{primary}} \\
0.4 & \text{if OS \& Browser match, but Canvas Hash differs} \\
1.0 & \text{if completely novel device hardware signature}
\end{cases}$$

* **Reason Output**: `"Unfamiliar device identifier [dvh_9a7b3c21e] (Chrome on macOS). Never previously authenticated by user Alex Vance."`

---

### Signal 2: Implausible Location Change (`SIGNAL_IMPOSSIBLE_TRAVEL`)

Calculates physical velocity required to travel between the current event location $L_t$ and the last recorded event location $L_{t-1}$ over elapsed time $\Delta t = t - t_{prev}$.

1. **Haversine Distance**:
   $$\Delta \sigma = 2 \arcsin \left( \sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)} \right)$$
   $$d = R \cdot \Delta \sigma \quad (R \approx 6371 \text{ km})$$
2. **Implied Travel Velocity**:
   $$v = \frac{d}{\Delta t} \quad (\text{km/hour})$$
3. **Signal Scoring**:
   $$\text{Score}_{\text{travel}} = \begin{cases}
   0.0 & \text{if } v \le 120 \text{ km/h (automotive/rail plausible)} \\
   \frac{v - 120}{800 - 120} \times 0.5 & \text{if } 120 < v \le 800 \text{ km/h (commercial flight plausible)} \\
   1.0 & \text{if } v > 900 \text{ km/h (physically impossible supersonic travel)}
   \end{cases}$$

* **Reason Output**: `"Implausible travel velocity: 4,820 km/h detected (New York, US to Frankfurt, DE in 42 minutes). Exceeds physical speed limits (threshold: 900 km/h)."`

---

### Signal 3: Circadian Hour Deviation (`SIGNAL_UNUSUAL_HOURS`)

Quantifies whether the current action occurs during an abnormal time window for this specific user:
$$\text{Score}_{\text{hour}} = 1.0 - \min\left(1.0, \frac{f(\theta \mid \mu_{U_i}, \kappa_{U_i})}{f_{\text{expected}}}\right)$$

* **Reason Output**: `"Unusual activity hour: Event initiated at 03:42 AM local time. Alex Vance typically operates exclusively between 09:00 AM - 06:30 PM (Deviation: 4.8σ)."`

---

### Signal 4: Rapid Sensitive Action (`SIGNAL_SENSITIVE_VELOCITY`)

Detects the quintessential ATO signature: an attacker logging in from an unfamiliar device and immediately modifying security parameters before the true owner notices.

$$\Delta t_{\text{login}} = t_{\text{action}} - t_{\text{device\_first\_seen\_in\_session}}$$
$$\text{Score}_{\text{sens}} = \begin{cases}
1.0 & \text{if } \text{Action} \in \text{SENSITIVE} \land \text{IsUnfamiliarDevice} \land \Delta t_{\text{login}} \le 10 \text{ min} \\
0.7 & \text{if } \text{Action} \in \text{SENSITIVE} \land \text{IsUnfamiliarDevice} \land 10 < \Delta t_{\text{login}} \le 30 \text{ min} \\
0.0 & \text{otherwise}
\end{cases}$$

* **Reason Output**: `"High-Risk Sequence Trigger: Sensitive action [UPDATE_EMAIL] executed 3 minutes and 12 seconds following the first login from an unverified device."`

---

## 🛡️ Resilience & Edge-Case Handling

Real-world production event streams are inherently messy. IdentityGuard incorporates defensive algorithms for three major real-world edge cases:

### 1. Sparse History & Cold-Start Accounts
* **The Problem**: New users or dormant accounts have insufficient historical events ($N < 10$). Standard outlier algorithms produce high false alarm rates because "usual" behavior is not yet established.
* **The Solution**:
  * Track an explicit state: `is_sparse_history = (event_count < 15)`.
  * Compute **Confidence Score**: $C(U_i) = \min\left(1.0, \frac{\text{event\_count}}{15}\right)$.
  * Blend user-specific baselines with a **Cohort / Global Prior**:
    $$\mathcal{P}_{\text{effective}} = C(U_i) \cdot \mathcal{P}_{\text{user}} + (1 - C(U_i)) \cdot \mathcal{P}_{\text{cohort}}$$
  * **Explicit Audit Disclosure**: The policy engine tags the decision payload:
    `"evaluation_notes": "Judgment rested on limited historical data (user has only 3 recorded past events). Defaulting to step-up verification instead of punitive revocation."`

### 2. Unknown or Unresolved Location Labels
* **The Problem**: VPNs, mobile proxies, or satellite ISPs may emit IP addresses that fail GeoIP lookup, resulting in `location_label = "UNKNOWN"`.
* **The Solution**:
  * Do not crash travel distance mathematics or assume a zero-distance hop.
  * Emit `SIGNAL_UNKNOWN_LOCATION` with value `0.35` and confidence `0.50`.
  * Calculate travel velocity only against the *last verified geographical coordinate*, using $\Delta t$ from that verified event.
  * Explicitly note: `"Geo-velocity check deferred: current location label could not be resolved to valid coordinates."`

### 3. Out-of-Order Timestamps & Retroactive Reconciliation
* **The Problem**: Network latency, offline client event synchronization, or distributed messaging partitions can deliver events out of chronological sequence ($t_{\text{received}} \ne t_{\text{event}}$).
* **The Solution**:
  * **Sliding Re-sequencing Buffer**: Inbound events are held in a 60-second priority queue ordered by event timestamp $t$.
  * **Retroactive State Invalidation**: If an event arrives with timestamp $t < t_{\text{latest}}$ beyond the buffer window:
    1. The engine checks if the late-arriving event was a high-risk login.
    2. If a subsequent sensitive action was already executed under the assumption of a familiar session, the engine retroactively evaluates the sequence.
    3. If the combined sequence breaches policy thresholds, an **emergency retrospective session revocation** is fired immediately.

---

## ⚖️ Configurable Rule Engine & Traceable Policy Responses

IdentityGuard enforces a **four-tier response matrix**. Every outcome must be completely deterministic, transparent, and traceable back to the individual contributing signals.

```yaml
# identity_guard_policies.yaml
policy_version: "2.1.0"
default_action: "NO_ACTION"

policies:
  - id: "POL_01_CRITICAL_ATO_REVOKE"
    description: "Revoke session immediately upon supersonic travel or rapid credential alteration from unfamiliar device"
    conditions:
      any:
        - rule: "SIGNAL_IMPOSSIBLE_TRAVEL.value >= 0.95"
        - all:
            - rule: "SIGNAL_UNFAMILIAR_DEVICE.value >= 0.80"
            - rule: "SIGNAL_SENSITIVE_VELOCITY.value >= 0.90"
    response: "SESSION_REVOCATION"
    priority: 100

  - id: "POL_02_STEP_UP_CHALLENGE"
    description: "Enforce multi-factor or biometric step-up for unfamiliar device or abnormal hours"
    conditions:
      any:
        - all:
            - rule: "SIGNAL_UNFAMILIAR_DEVICE.value >= 0.80"
            - rule: "action.category == 'SENSITIVE'"
        - all:
            - rule: "SIGNAL_UNUSUAL_HOURS.value >= 0.75"
            - rule: "action.category in ['SENSITIVE', 'FINANCIAL']"
        - rule: "SIGNAL_SEQUENCE_ANOMALY.value >= 0.85 and SIGNAL_UNFAMILIAR_DEVICE.value >= 0.40"
    response: "STEP_UP_VERIFICATION"
    priority: 80

  - id: "POL_03_ANALYST_TRIAGE"
    description: "Send to human security analyst when risk is elevated under sparse history"
    conditions:
      all:
        - rule: "composite_risk_score >= 0.55"
        - rule: "is_sparse_history == true"
    response: "ANALYST_REVIEW"
    priority: 60

  - id: "POL_04_STANDARD_ALLOW"
    description: "Permit nominal routine operations"
    conditions:
      rule: "composite_risk_score < 0.35"
    response: "NO_ACTION"
    priority: 10
```

### Traceable Decision Payload Example

When an event triggers a response, the engine returns an exhaustive audit trace:

```json
{
  "event_id": "evt_98f7e2a4-b223-4c59-a78b-04e8d3b5b111",
  "user_id": "usr_alex_vance_88",
  "session_id": "sess_89f02c98d71241aa",
  "decision": "SESSION_REVOCATION",
  "triggered_policy": "POL_01_CRITICAL_ATO_REVOKE",
  "composite_risk_score": 0.94,
  "is_sparse_history": false,
  "confidence": 0.92,
  "signals": [
    {
      "signal_id": "SIGNAL_UNFAMILIAR_DEVICE",
      "value": 1.0,
      "weight": 0.35,
      "reason": "Unrecognized device fingerprint dvh_9a7b3c21e (Chrome on macOS). Never seen in user device registry."
    },
    {
      "signal_id": "SIGNAL_SENSITIVE_VELOCITY",
      "value": 1.0,
      "weight": 0.45,
      "reason": "Action [UPDATE_EMAIL] requested 3 minutes 12 seconds after initial login from unverified hardware."
    },
    {
      "signal_id": "SIGNAL_UNUSUAL_HOURS",
      "value": 0.82,
      "weight": 0.20,
      "reason": "Event executed at 03:42 AM local time (User typical active window: 09:00 - 18:30)."
    }
  ],
  "enforcement": {
    "action_taken": "SESSION_REVOCATION",
    "session_revoked": true,
    "revoked_at": "2026-10-11T09:45:00.120Z",
    "blocked_for_further_actions": true
  }
}
```

---

## 🤖 AI Guardrails: Hybrid Sequence Anomaly Scoring

### The Mandate
> **Strict Operational Guardrail**: AI may help recognize suspicious patterns in action sequences, but **it must never trigger a response alone**; explicit rules must also support it.

### How the Sequence AI Operates
IdentityGuard incorporates an unfolded **LSTM / Markov Action Sequence Evaluator** that scores the probability of the sequence trajectory:
$$\mathcal{T} = [a_1, a_2, \dots, a_t]$$
* Typical user path: `LOGIN` $\to$ `VIEW_DASHBOARD` $\to$ `SEARCH_DOCS` $\to$ `VIEW_PORTFOLIO`.
* Attack path: `LOGIN` $\to$ `UPDATE_EMAIL` $\to$ `RESET_PASSWORD` $\to$ `TRANSFER_FUNDS`.

The AI calculates the **Sequence Surprisal (Perplexity)**:
$$\mathcal{S}_{\text{seq}} = -\frac{1}{T}\sum_{t=1}^T \log P(a_t \mid a_1, \dots, a_{t-1}, \mathbf{x}_{\text{context}})$$

### The Guardrail Implementation
The output $\mathcal{S}_{\text{seq}}$ is strictly formatted as an advisory signal:
```python
# ai_guardrail.py
def evaluate_hybrid_decision(signals: Dict[str, Signal], ai_score: float) -> PolicyDecision:
    # 1. AI indicates high anomaly
    ai_flagged = ai_score >= 0.85
    
    # 2. Check for explicit corroborating deterministic rules
    deterministic_corroboration = (
        signals["SIGNAL_UNFAMILIAR_DEVICE"].value >= 0.70 or
        signals["SIGNAL_IMPOSSIBLE_TRAVEL"].value >= 0.80 or
        signals["SIGNAL_SENSITIVE_VELOCITY"].value >= 0.80
    )
    
    # 3. Guardrail Enforcement: AI alone can NEVER revoke or challenge
    if ai_flagged and not deterministic_corroboration:
        logger.warn("AI flagged sequence anomaly, but no explicit rule corroborated it. Routing to low-priority background audit.")
        return PolicyDecision(action="NO_ACTION", notes="AI anomaly unverified by explicit rules.")
    
    if ai_flagged and deterministic_corroboration:
        return PolicyDecision(action="STEP_UP_VERIFICATION", notes="AI sequence pattern corroborated by unfamiliar hardware rule.")
```

---

## 🎬 Analyst Replay Studio & Session Revocation Lifecycle

### 1. Analyst Replay Engine
Security Operations Center (SOC) analysts can replay any historical event log through the engine:
* **Step-by-Step Stepping**: Advance through events in chronological milliseconds or simulated real-time.
* **Out-of-Order Injection**: Intentionally reorder events to verify the engine's temporal resilience.
* **Signal Inspection**: Live visualization of evolving circadian histograms, geo-trajectories, and signal breakdown gauges.
* **Policy Simulation**: Adjust policy thresholds (e.g., lower travel speed threshold from 900 to 600 km/h) and preview historical impact (counterfactual analysis).

### 2. Session Revocation Enforcement Guarantee
When a session is marked `REVOKED`:
1. The `session_id` is atomically written to an in-memory Redis / memory blocklist with TTL.
2. The active RS256 JWT / session token is immediately invalidated.
3. Any subsequent action received bearing that `session_id` is immediately rejected at the gateway:

```
[Gateway Enforcement]
POST /api/session/event -> { session_id: "sess_89f02c98d71241aa", action: "TRANSFER_FUNDS" }
<<< HTTP/1.1 403 Forbidden
<<< { 
      "error": "SESSION_REVOKED", 
      "message": "Session was terminated at 09:45:00 UTC due to ATO Policy POL_01_CRITICAL_ATO_REVOKE. All subsequent actions are refused." 
    }
```

---

## 📡 RESTful & Streaming API Reference

### Event Ingestion
* `POST /api/v1/events/ingest`: Ingests an atomic session event; returns real-time risk evaluation and policy response.
* `POST /api/v1/events/batch`: Ingests a chronological or out-of-order array of events.

### Policy & Configuration
* `GET  /api/v1/policies`: Retrieves the active YAML/JSON rule matrix.
* `PUT  /api/v1/policies`: Updates detection thresholds with syntax validation and regression testing.

### User State & Baselines
* `GET  /api/v1/users/:userId/baseline`: Returns user habitual profile (devices, circadian parameters $\mu, \kappa$, geo-centroids, and event count).
* `DELETE /api/v1/users/:userId/baseline`: Clears and resets user baseline profile (for testing or profile reset requests).

### Analyst Replay & Auditing
* `POST /api/v1/replay/load`: Loads a historical event dataset for replay analysis.
* `POST /api/v1/replay/step`: Advances the replay cursor by $K$ events and returns state diffs.
* `GET  /api/v1/sessions/:sessionId/status`: Checks if a session is currently `ACTIVE`, `CHALLENGED`, or `REVOKED`.

---

## 📂 Project Structure & Implementation Blueprint

```
IdentityGuard/
├── engine/                            # Core Session Risk & Anomaly Engine (Python / Node)
│   ├── ingestion/
│   │   ├── validator.py               # JSON schema & hygiene validation
│   │   └── monotonic_buffer.py        # Out-of-order timestamp re-sequencer
│   ├── profiler/
│   │   ├── user_baseline.py           # Per-user device, geo, and circadian state store
│   │   └── circadian_math.py          # von Mises periodic distribution calculator
│   ├── detectors/
│   │   ├── device_detector.py         # Hardware fingerprint & Jaccard distance
│   │   ├── impossible_travel.py       # Haversine distance & velocity solver
│   │   ├── sensitive_velocity.py      # Rapid action post-login monitor
│   │   └── sequence_ai.py             # LSTM / Markov action trajectory surprisal
│   ├── policy/
│   │   ├── rule_evaluator.py          # Deterministic YAML policy executor
│   │   └── explainability.py          # Signal value & human-readable rationale generator
│   └── state/
│       └── session_ledger.py          # Atomic revocation blocklist & session lifecycle
├── replay_studio/                     # Analyst Time-Travel Replay Environment
│   ├── replay_runner.py               # Event simulator with chronological pacing
│   └── test_scenarios/
│       ├── scenario_classic_ato.json  # Unfamiliar device + immediate password change
│       ├── scenario_impossible_travel.json # NY to Tokyo within 30 minutes
│       ├── scenario_sparse_history.json    # First-time user cold start
│       └── scenario_out_of_order.json      # Delayed event ingestion test
├── server.py                          # FastAPI / Express API gateway
├── identity_guard_policies.yaml       # Default rule configurations
└── README.md
```

---

## ⚖️ License
IdentityGuard is open-source software licensed under the **Apache 2.0 License**.
