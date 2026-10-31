# Repository Guidelines

## Project Overview
GlobalGram is a gesture-controlled holographic globe that shows live world events over a webcam feed. Hand tracking runs in the browser (MediaPipe, Web Worker). Two parts, one repo:

- `frontend/`: React 19 + react-three-fiber + Vite, zustand stores, vitest. Renders the globe, clusters events, handles hand and mouse input.
- `backend/`: FastAPI (Python 3.12, uv), domain-driven layout. Fetches events from the last 24 h, keeps them in memory, refreshes every 5 min, serves them in the exact `GlobeEvent` JSON shape.

`README.md` is the authoritative user-facing doc (gesture table, tuning, debug keys, troubleshooting). Read the relevant section before changing behaviour, and update it in the same change.

## Architecture & Data Flow
**Events (backend to pixels)**
1. `EventFeed.fetch_since` adapters (GDELT, USGS, GDACS, EONET) → `RefreshEvents` (`application/refresh_events.py`) → `InMemoryEventRepository`. Enrichment (`OpenGraphEnricher`) fills title/summary/image for top unenriched events.
2. `GET /api/events` → `ListRecentEvents` → `EventOut.from_domain` (camelCase, `None` fields omitted).
3. Frontend: `HttpEventSource.fetchEvents` → `parseGlobeEvents` (drops invalid items) → `useEventFeed` → `eventStore`. Per-frame hooks then build clusters (`useClusters`), project to screen (`useScreenCache`), and write instance buffers (`Pins`/`Beams`); `useMagneticPicking` sets `selectionStore.hoveredId`.

**Hands (camera to actions)**
`HandTrackerClient` (worker, one frame in flight, extra frames dropped) → `useHandTracking` (mirror, One Euro filter, features) → `handStore` → `useGestureController` → pure `stepGesture` state machine → effects applied to `globeStore` / callbacks (`selectionActions`).

**Patterns to preserve**
- **Frontend layering** (convention, no lint rule): `core/` is pure TS and imports only `core/`. `store/` imports only `core`. `features/` (React/R3F) may use store, core, infrastructure, shared. Features depend on the `EventSource` interface, never on a concrete source.
- **Composition roots:** `frontend/src/app/App.tsx` is the only place that picks a concrete `EventSource` (`VITE_EVENT_SOURCE=mock` selects `MockEventSource`). Backend: `create_app(settings, *, feeds, enricher, clock)` in `backend/src/globalgram_api/api/app.py` is the only place that wires adapters, and also the test seam.
- **State:** one zustand store per concern, setters only. Render loops read `useXStore.getState()` (never React state) so hot paths avoid re-renders; use selectors only for data that drives JSX.
- **Frame order:** `useFrame` hooks that depend on each other use `FRAME_ORDER` (`frontend/src/shared/frameOrder.ts`). Priorities must be `<= 0`, or R3F stops auto-rendering.
- **Pure state machines:** gesture logic lives in `core/gestures/gestureMachine.ts` (`stepGesture(state, input) -> {state, effects}`); it never touches the globe. All timings and thresholds are in `core/gestures/thresholds.ts`.
- **Backend DDD:** `domain/` (stdlib only: frozen slotted dataclasses, `typing.Protocol` ports in `domain/events/ports.py`, policies) ← `application/` (use cases, `Clock`) ← `infrastructure/` (adapters) ← `api/`. Constructor injection everywhere; no DI container. The repository port is synchronous, feeds and enricher are async.
- **Wire contract:** the backend JSON must equal `frontend/src/core/events/GlobeEvent.ts` (`Category` values equal `EVENT_CATEGORIES`). Change both sides together.

## Key Directories
- `frontend/src/core/`: pure logic with colocated tests (gestures, hands, geo, clustering, motion, picking, events).
- `frontend/src/features/`: R3F/React by feature (`globe`, `eventPoints`, `selection`, `infoPanel`, `handInput`, `coach`, `help`, `debug`).
- `frontend/src/infrastructure/`: the only code touching `getUserMedia`, MediaPipe and event sources.
- `frontend/src/store/`, `frontend/src/shared/` (config, `FRAME_ORDER`, UI helpers).
- `frontend/scripts/`: `setup-mediapipe.mjs` (auto-run by `dev`/`build`), `build-land-mask.mjs` (manual).
- `backend/src/globalgram_api/`: `domain/events/`, `application/`, `infrastructure/{gdelt,hazards,enrichment,persistence}/`, `api/`, `config.py`.
- `backend/tests/`: mirrors the source tree.

## Development Commands
Frontend (run in `frontend/`):
```bash
pnpm install
pnpm dev                 # http://localhost:5173, proxies /api to 127.0.0.1:8000
pnpm typecheck && pnpm lint && pnpm test && pnpm build
pnpm vitest run src/core/gestures/gestureMachine.test.ts   # one file
VITE_EVENT_SOURCE=mock pnpm dev                            # no backend needed
```
Backend (run in `backend/`):
```bash
uv sync
uv run uvicorn globalgram_api.api.app:app --port 8000
uv run pytest -q
uv run pytest tests/infrastructure/gdelt/test_feed.py::test_old_404_is_permanent_gap -q
uv run ruff check . && uv run ruff format --check . && uv run mypy
```
Health check: `curl localhost:8000/api/health` (`starting` until the first refresh finishes, ~30 s; `degraded` lists `feedErrors`).

## Code Conventions & Common Patterns
**Frontend (TypeScript)**
- Single quotes, no semicolons, 2-space indent; no formatter config exists, so match surrounding code.
- `erasableSyntaxOnly`: no `enum`, no runtime `namespace`, no constructor parameter properties (declare fields explicitly). `verbatimModuleSyntax`: use `import type` for types. `noUnusedLocals/Parameters` are errors.
- Component files export components only (react-refresh lint rule). Hooks are named `useX`; stores `useXStore`; pure actions that call `getState()` live in `*Actions.ts` (e.g. `selectionActions.ts`).
- Async: `useEventFeed` uses a `cancelled` flag, sets `status = 'error'` with no retry (reload recovers). Subscriptions in `useEffect` must return their cleanup; callbacks passed to long-lived subscriptions go through a `latest` ref (see `useGestureController`).
- `import.meta.env`: `VITE_EVENT_SOURCE`, `VITE_API_BASE_URL`.

**Backend (Python)**
- Ruff line length 120, rules `E,F,I,UP,B,ASYNC`; mypy `strict` on `globalgram_api` (not tests). Full type hints, `from __future__` not used.
- Domain validation in `__post_init__` raises `ValueError`. Adapters wrap transport failures as `FeedError(f"{name}: {exc}")`; one failing feed never blocks others (`RefreshEvents` records it in `feed_errors`). Per-item parse errors are skipped silently (`except (KeyError, TypeError, ValueError): continue`). Enrichment never raises per item.
- Pure `parse_*` function + thin async `*Feed` class per source (`infrastructure/hazards/usgs.py`). New source: add a feed class and register it in `create_app`'s default feeds; no domain change.
- Event ids are prefixed by source (`gdelt-`, `usgs-`, `gdacs-`, `eonet-`). Feeds that need no article enrichment set `enriched=True`.
- Config: `Settings` in `config.py`, env prefix `GLOBALGRAM_`, reads `.env` in the cwd. API handlers are `async def` on purpose: the repository has no lock and relies on single-event-loop access.
- Commits: conventional style with scope, e.g. `feat(backend): ...`, `feat(frontend): ...`, `docs: ...`, `chore: ...`, `refactor: ...`.

## Important Files
- `frontend/src/app/App.tsx`: composition root, gesture and hook wiring.
- `frontend/src/core/events/GlobeEvent.ts`: wire type and categories.
- `frontend/src/features/selection/selectionActions.ts`: select / cluster-zoom / stack stepping logic.
- `frontend/src/core/gestures/{gestureMachine,thresholds,GestureState}.ts`, `core/hands/handFeatures.ts`: gesture detection (thumbs-up close, palm swipe, pinch tap/drag, two-hand zoom).
- `frontend/src/shared/config/{visualConfig,gestureConfig}.ts`: live-tunable singletons (leva, press `D`).
- `frontend/vite.config.ts`: `/api` proxy, vitest include (`src/**/*.test.ts` only).
- `backend/src/globalgram_api/api/app.py`, `application/refresh_events.py`, `domain/events/{model,policies,ports}.py`, `config.py`, `pyproject.toml`.

## Runtime/Tooling Preferences
- Frontend: Node 20.19+ or 22.12+, **pnpm** (lockfile `frontend/pnpm-lock.yaml`), Vite 8, TypeScript ~6, ESLint 10, Vitest 5. Run all `pnpm` commands from `frontend/`, not the repo root.
- Backend: Python >=3.12, **uv** (`backend/uv.lock`, `uv_build`). Use `uv run`, never bare `pip`/`python`.
- Ports: backend 8000, frontend 5173 (CORS allowlist and proxy depend on them).
- Generated, gitignored assets: `frontend/public/mediapipe` (made by `pnpm assets`), `landmarks-*.json` debug recordings. `frontend/public/land-mask.png` is tracked.
- Live smoke needs network (GDELT, USGS, GDACS, EONET, article pages). Browser testing: the globe canvas needs WebGL; headless Chromium works.

## Testing & QA
- **Frontend:** Vitest, node environment, `src/**/*.test.ts` colocated with source. Covers pure `core/` logic, `parseGlobeEvents`, `MockEventSource`, coach messages. No React/DOM tests and no mocks; fixtures are local helpers; randomness is seeded (`mulberry32`, never `Math.random`). Stateful logic is driven through a small `Session` class (see `gestureMachine.test.ts`). Not covered: stores, `features/**/*.tsx`, `App.tsx`, `HttpEventSource`.
- **Backend:** pytest with `asyncio_mode = "auto"` (no markers needed), `respx` for HTTP, in-test fakes for ports, `TestClient(create_app(Settings(enable_scheduler=False), feeds=[...], enricher=..., clock=lambda: NOW))` for API tests. Use a fixed clock, never `datetime.now()`.
- Shared helpers: `backend/tests/conftest.py` (`make_event(**overrides)`, `NOW`), imported as `from conftest import ...`. There are deliberately no `__init__.py` files under `tests/` (pytest prepend mode); keep test file basenames unique across the tree and do not add nested `conftest.py` files.
- Behaviour change checklist: run the stack's full checks above, exercise the changed path (curl the API, or load the app in a browser against the running backend), and update `README.md` tables (gestures, thresholds, endpoints, env vars) that the change touches. There is no coverage threshold.

## Gotchas
- **Vite HMR duplicates modules:** after editing a store or module while the dev server runs, a plain `import('/src/store/...')` from the browser console can return a *different* instance than the app uses (`?t=` timestamps). Restart `pnpm dev` before driving stores from the console.
- Dev React StrictMode double-runs effects: `useHandTracking` creates, disposes and recreates the worker.
- `app = create_app()` runs at import in `api/app.py`; tests must call `create_app` directly.
- Most real events share city-centre coordinates, so many clusters never split by zooming; selection falls back to a "stack" with next/previous (panel buttons, repeat select, palm swipe).
- GDELT's newest 1-2 files can 404 for minutes (retried); a 404 on a slot 2 h or older is a permanent gap.
- `gestureMachine.ts` header comments still say taps are 250 ms; the real limit is `TAP_MAX_MS = 350` in `thresholds.ts`.
