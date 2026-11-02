# Summary

A technical yet organic system that utilizes a blueprint-style loading state. It emphasizes 'draft to reality' transitions where components are first drawn as jittery SVG paths and then morph into clean, rounded cards. The aesthetic is professional, minimalist, and motion-centric.

# Style

full prompt

## Spec

Build me a small React app that shows a "pencil sketch" loading state for a SaaS dashboard: the page sketches itself in blue pencil, each chart's sketch morphs to the real data while the numbers count up from zero, then the real UI fills in. A Replay button in the bottom-right corner runs it again.

Recreate it exactly. Create the project below with every file written exactly as given, character for character. Don't simplify, refactor, rename, reformat or "improve" anything: the animation depends on these exact values. Don't add any files beyond these.

Then run `npm install` and `npm run dev`, and open the local address it prints.

The logo and avatar load from hosted URLs, so there are no image files to add.

## Files

### `package.json`

```json
{
    "name": "pencil-sketch-loader",
    "private": true,
    "version": "1.0.0",
    "type": "module",
    "scripts": {
        "dev": "vite",
        "build": "tsc && vite build",
        "preview": "vite preview"
    },
    "dependencies": {
        "react": "^19.2.0",
        "react-dom": "^19.2.0"
    },
    "devDependencies": {
        "@tailwindcss/vite": "^4.1.0",
        "@types/node": "^22.20.5",
        "@types/react": "^19.2.0",
        "@types/react-dom": "^19.2.0",
        "@vitejs/plugin-react": "^5.0.0",
        "tailwindcss": "^4.1.0",
        "typescript": "^5.6.0",
        "vite": "^7.0.0"
    }
}
```

### `vite.config.ts`

```ts
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
});
```

### `tsconfig.json`

```json
{
    "compilerOptions": {
        "target": "ES2022",
        "lib": ["ES2022", "DOM", "DOM.Iterable"],
        "module": "ESNext",
        "moduleResolution": "bundler",
        "jsx": "react-jsx",
        "strict": true,
        "noEmit": true,
        "skipLibCheck": true,
        "isolatedModules": true,
        "types": ["vite/client", "node"],
        "paths": {
            "@/*": ["./src/*"]
        }
    },
    "include": ["src", "vite.config.ts"]
}
```

### `index.html`

```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Pocket Dashboard: pencil sketch loading state</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap" />
    </head>
    <body>
        <div id="root"></div>
        <script type="module" src="/src/main.tsx"></script>
    </body>
</html>
```

### `src/main.tsx`

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
```

### `src/index.css`

```css
@import 'tailwindcss';
@import './components/plot-reveal/plot-reveal.css';

:root {
    --paper: #fafaf8;
    --card: #ffffff;
    --ink: #0a0c10;
    --mid: #565b64;
    --muted: #8b909a;
    --line: #e7e9ef;
    /* The pencil colour. */
    --plot: #2e6fff;
    --positive: #16834a;
    --positive-soft: #e6f5ec;
    --well: #f3f4f6;
    --previous: #cbd5e1;
    /* Every chart stays on one hue: a blue ramp, light to deep. */
    --blue-1: #dbe5ff;
    --blue-2: #b2c7ff;
    --blue-3: #7c9fff;
    --blue-4: #3d6ef5;
    --blue-5: #1d47c8;
    color-scheme: light;
}

/* Diagonal stripes over a fill, for the funnel bars and stacked-bar segments. */
.hatch {
    background-image: repeating-linear-gradient(135deg, rgb(255 255 255 / 0.32) 0 1.5px, transparent 1.5px 6px);
}

@theme inline {
    --color-paper: var(--paper);
    --color-card: var(--card);
    --color-ink: var(--ink);
    --color-mid: var(--mid);
    --color-muted: var(--muted);
    --color-line: var(--line);
    --color-plot: var(--plot);
    --color-positive: var(--positive);
    --color-positive-soft: var(--positive-soft);
    --color-well: var(--well);
    --color-previous: var(--previous);
    --color-blue-1: var(--blue-1);
    --color-blue-2: var(--blue-2);
    --color-blue-3: var(--blue-3);
    --color-blue-4: var(--blue-4);
    --color-blue-5: var(--blue-5);

    --font-sans: 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif;
    --font-mono: 'JetBrains Mono', ui-monospace, 'SF Mono', monospace;
}

html {
    background: var(--paper);
    color: var(--ink);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
}

body {
    margin: 0;
}
```

### `src/App.tsx`

```tsx
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { DASHBOARD_ROW, DASHBOARD_WIDTH, ReplyTrendPanel } from '@/components/demo/dashboard-widgets';
import { PlotReveal } from '@/components/plot-reveal';
import { cn } from '@/lib/cn';

/**
 * Pocket Dashboard: a loading state that sketches the dashboard in blue pencil, morphs each sketch to the real data,
 * then fills in the UI. Settings: normal speed, 1500ms between charts, data arrives straight away, morph on, labels off.
 */

/** Gap between one chart's reveal starting and the next, top left first down to bottom right. */
const STAGGER = 1500;
/** The charts wait this long so the page header is sketched first. */
const HEADER_LEAD = 500;
/** The pencil's leader lines and spec tags. They hang off each card's right side, over its neighbour, so they're off. */
const LABELS = false;
/** Sketch each chart with generic data, then morph the pencil to the real numbers before it fills in. */
const MORPH = true;

/** Page header (56) + gap (24) + trend (300) + gap (16) + row of tiles (372). Everything is scaled from this size. */
const DASHBOARD_HEIGHT = 768;
const MAX_SCALE = 1.25;

/**
 * Scales the dashboard to fill the space it's given, so it frames the same on any screen.
 * The pencil layer lives inside the scaled box and measure.ts is scale-aware, so the drawing stays registered.
 */
const useFitScale = () => {
    const ref = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    // Layout effect: fit before the first paint, so the page never shows a frame at the wrong size.
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const fit = () => setScale(Math.min(el.clientWidth / DASHBOARD_WIDTH, el.clientHeight / DASHBOARD_HEIGHT, MAX_SCALE));
        fit();
        const observer = new ResizeObserver(fit);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return [ref, scale] as const;
};

const Icon = ({ children, className }: { children: ReactNode; className?: string }) => (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={cn('size-4 shrink-0', className)}>
        {children}
    </svg>
);

type StaggeredProps = { delay: number; layer: number; children: ReactNode };

/**
 * Holds a chart's space (invisible), then starts its reveal after `delay`.
 * `layer` stacks earlier charts above later ones, so a chart's labels would sit over its right-hand neighbour, not under it.
 */
const Staggered = ({ delay, layer, children }: StaggeredProps) => {
    const [started, setStarted] = useState(delay === 0);

    useEffect(() => {
        if (started) return;
        const t = setTimeout(() => setStarted(true), delay);
        return () => clearTimeout(t);
    }, [delay, started]);

    return started ? (
        <div className="relative w-fit" style={{ zIndex: layer }}>
            <PlotReveal annotate={LABELS} morph={MORPH} ready className="w-fit">
                {children}
            </PlotReveal>
        </div>
    ) : (
        <div className="invisible w-fit">{children}</div>
    );
};

const TABS = [{ label: 'Overview', active: true }, { label: 'Pipeline' }, { label: 'Inbox', count: 12 }, { label: 'Contacts' }, { label: 'Reports' }];

const TopBar = () => (
    <header className="relative z-10 flex h-16 shrink-0 items-center gap-10 border-b border-line bg-card px-8">
        <p className="flex items-center gap-1.5 text-[18px] leading-none font-medium tracking-[-0.3px]">
            <span>Pocket</span>
            <img
                src="https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/projects/1abf8d43-4b9f-4b9a-ba3a-78fffbc3d078/brand-assets/pocket-studio-logo/pocket-studio.svg"
                alt=""
                width={14}
                height={22}
                className="h-[22px] w-auto"
            />
            <span>Studio</span>
        </p>

        <nav className="flex items-center gap-1">
            {TABS.map((tab) => (
                <span key={tab.label} className={cn('flex h-9 items-center gap-2 rounded-lg px-3 text-[14px] font-medium', tab.active ? 'bg-well text-ink' : 'text-mid')}>
                    {tab.label}
                    {tab.count && <span className="text-[12px] text-muted tabular-nums">{tab.count}</span>}
                </span>
            ))}
        </nav>

        <span className="ml-auto flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg text-mid">
                <Icon>
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                </Icon>
            </span>
            <img
                src="https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/projects/1abf8d43-4b9f-4b9a-ba3a-78fffbc3d078/brand-assets/avatar/avatar.jpg"
                alt=""
                width={32}
                height={32}
                className="size-8 rounded-full object-cover"
            />
        </span>
    </header>
);

/** Title and date range, sketched in pencil before any chart. */
const PageHeader = () => (
    <div className="flex h-14 items-center justify-between">
        <PlotReveal annotate={false} className="w-fit">
            <h1 className="text-[24px] leading-8 font-semibold tracking-[-0.02em]">
                <span data-plot="">Pocket Dashboard</span>
            </h1>
        </PlotReveal>
        <PlotReveal annotate={false} className="w-fit">
            <span data-plot-frame className="flex h-9 items-center gap-2 rounded-lg border border-line bg-card px-3 text-[13px] font-medium text-mid">
                <span data-plot="" data-plot-kind="image">
                    <Icon>
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <path d="M16 2v4M8 2v4M3 10h18" />
                    </Icon>
                </span>
                <span data-plot="">Last 7 days</span>
            </span>
        </PlotReveal>
    </div>
);

export const App = () => {
    // Bumping `run` remounts every PlotReveal (new keys), which replays the whole reveal.
    const [run, setRun] = useState(1);
    const [fitRef, scale] = useFitScale();

    return (
        <main className="relative flex h-svh flex-col overflow-hidden bg-card text-ink">
            <TopBar />

            <section ref={fitRef} className="relative m-8 flex min-h-0 flex-1 justify-center">
                <div style={{ width: DASHBOARD_WIDTH * scale, height: DASHBOARD_HEIGHT * scale }}>
                    <div className="origin-top-left" style={{ width: DASHBOARD_WIDTH, height: DASHBOARD_HEIGHT, transform: `scale(${scale})` }}>
                        <PageHeader key={`header-${run}`} />
                        <div className="mt-6 flex flex-col gap-4">
                            <Staggered key={`trend-${run}`} delay={HEADER_LEAD} layer={DASHBOARD_ROW.length + 1}>
                                <ReplyTrendPanel />
                            </Staggered>
                            <div className="flex gap-4">
                                {DASHBOARD_ROW.map(({ id, Component }, i) => (
                                    <Staggered key={`${id}-${run}`} delay={HEADER_LEAD + (i + 1) * STAGGER} layer={DASHBOARD_ROW.length - i}>
                                        <Component />
                                    </Staggered>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <button
                type="button"
                onClick={() => setRun((r) => r + 1)}
                className="fixed right-5 bottom-5 z-50 flex h-10 items-center gap-2 rounded-full bg-ink pr-5 pl-4 text-[14px] font-medium text-paper shadow-[0_2px_8px_rgb(2_6_23/0.12),0_16px_40px_-12px_rgb(2_6_23/0.3)] transition-transform active:scale-95"
            >
                <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4">
                    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                    <path d="M3 3v5h5" />
                </svg>
                Replay
            </button>
        </main>
    );
};
```

### `src/lib/cn.ts`

```ts
export const cn = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');
```

### `src/components/demo/dashboard-widgets.tsx`

```tsx
import type { ReactNode } from 'react';
import { usePlotPhase } from '@/components/plot-reveal';
import { cn } from '@/lib/cn';

/**
 * Film two's widgets. They follow metric-widgets.tsx but stay on one blue ramp and are sized for the dashboard:
 * a full-width trend over a row of four. Kept apart so the filmed originals don't change.
 *
 * Each chart reads usePlotPhase: while it's sketched it shows generic data (bars at the average, a flat line,
 * equal segments), so the pencil visibly adjusts to the real numbers before they fill in.
 */

/** The dashboard is laid out at this width, then scaled to fit the screen (see film-two.tsx). */
export const DASHBOARD_WIDTH = 1312;
const GAP = 16;
const TILE_W = (DASHBOARD_WIDTH - GAP * 3) / 4;

type PanelProps = { width: number; className?: string; children: ReactNode };

const Panel = ({ width, className, children }: PanelProps) => (
    <article data-plot-frame className={cn('flex flex-col rounded-xl border border-line bg-card p-6 shadow-[0_2px_8px_rgb(2_6_23/0.06)]', className)} style={{ width }}>
        {children}
    </article>
);

const Info = () => (
    <span data-plot="" data-plot-kind="image" className="grid size-3.5 place-items-center rounded-full border-[1.5px] border-muted text-[9px] leading-none font-semibold text-muted">
        i
    </span>
);

const Title = ({ children }: { children: ReactNode }) => (
    <h3 className="flex items-center gap-1.5 text-[16px] leading-6 font-semibold">
        <span data-plot="title">{children}</span>
        <Info />
    </h3>
);

/** Every number in a figure: "$486,200", "4m 32s", "3.4", "15%". */
const NUMBER = /\d[\d,]*(?:\.\d+)?/g;

/**
 * Figures are data too: while the chart is sketched each number reads zero, in its real format ("$0", "0m 0s", "0.0"),
 * and the pencil counts it up to the real value in the morph. Labels stay as they are.
 */
const useFigure = () => {
    const sketch = usePlotPhase() === 'sketch';
    return (real: string) => (sketch ? real.replace(NUMBER, (n) => (n.includes('.') ? `0.${'0'.repeat(n.split('.')[1].length)}` : '0')) : real);
};

const Metric = ({ value, change, down }: { value: string; change: string; down?: boolean }) => {
    const figure = useFigure();
    return (
        <p className="flex items-center gap-2.5">
            <span data-plot="metric" className="text-[30px] leading-9 font-bold tracking-[-0.02em] tabular-nums">
                {figure(value)}
            </span>
            <span data-plot="change" className="rounded-md bg-positive-soft px-1.5 py-0.5 text-[13px] leading-4 font-semibold text-positive">
                {figure(`${down ? '↘' : '↗'} ${change}`)}
            </span>
        </p>
    );
};

const Previous = ({ value, className }: { value: string; className: string }) => {
    const figure = useFigure();
    return (
        <p data-plot="previous" className={cn('text-[13px] leading-5 text-mid', className)}>
            {figure(`${value} previous period`)}
        </p>
    );
};

type TileProps = { title: string; value: string; change: string; previous: string; children: ReactNode };

/** A row tile: title, number with change chip, previous period, chart pinned to the bottom. */
const Tile = ({ title, value, change, previous, children }: TileProps) => (
    <Panel className="h-[372px]" width={TILE_W}>
        <Title>{title}</Title>
        <div className="mt-5">
            <Metric value={value} change={change} />
        </div>
        <Previous value={previous} className="mt-1.5" />
        <div className="mt-auto">{children}</div>
    </Panel>
);

const Legend = ({ items }: { items: { label: string; count: string; dot: string }[] }) => {
    const figure = useFigure();
    return (
        <div className="mt-2.5 flex gap-4 text-[12px] leading-4 text-ink/80">
            {items.map((it) => (
                <span key={it.label} data-plot="" className="flex items-center gap-1.5">
                    <span className={cn('size-2 rounded-full', it.dot)} />
                    {figure(`${it.label} ${it.count}`)}
                </span>
            ))}
        </div>
    );
};

/* The trend: one sample per half day across the week, as heights in chart units (higher is slower). */
const CHART_W = DASHBOARD_WIDTH - 48;
const CHART_H = 150;
const THIS_PERIOD = [74, 70, 76, 64, 60, 66, 54, 50, 56, 46, 42, 46, 38, 34];
const LAST_PERIOD = [56, 60, 52, 58, 50, 54, 48, 52, 46, 50, 44, 48, 42, 46];
const DAYS = ['Fri 23', 'Sat 24', 'Sun 25', 'Mon 26', 'Tue 27', 'Wed 28', 'Thu 29'];

/** A smooth path through evenly spaced points: each segment eases out of one point and into the next. */
const smoothPath = (ys: number[]) => {
    const step = CHART_W / (ys.length - 1);
    return ys.reduce((d, y, i) => {
        if (i === 0) return `M0 ${CHART_H - y * 1.6}`;
        const x = i * step;
        const mid = x - step / 2;
        const prev = CHART_H - ys[i - 1] * 1.6;
        return `${d} C${mid} ${prev} ${mid} ${CHART_H - y * 1.6} ${x} ${CHART_H - y * 1.6}`;
    }, '');
};

const average = (ys: number[]) => ys.map(() => ys.reduce((a, b) => a + b, 0) / ys.length);

/** Full-width hero: the headline number sits top right and the line runs edge to edge underneath. */
export const ReplyTrendPanel = () => {
    const sketch = usePlotPhase() === 'sketch';
    const current = sketch ? average(THIS_PERIOD) : THIS_PERIOD;
    const previous = sketch ? average(LAST_PERIOD) : LAST_PERIOD;
    const thisPath = smoothPath(current);
    const lastY = CHART_H - current[current.length - 1] * 1.6;
    return (
        <Panel className="h-[300px]" width={DASHBOARD_WIDTH}>
            <div className="flex items-start justify-between">
                <div>
                    <Title>Median reply time</Title>
                    <p className="mt-1 flex items-center gap-4 text-[13px] leading-5 text-mid">
                        <span data-plot="">Across every channel</span>
                        <span data-plot="" className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full bg-blue-4" />
                            This period
                        </span>
                        <span data-plot="" className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full bg-previous" />
                            Previous period
                        </span>
                    </p>
                </div>
                <div className="flex flex-col items-end">
                    <Metric value="4m 32s" change="15%" down />
                    <Previous value="5m 20s" className="mt-1" />
                </div>
            </div>

            <svg data-plot="trend" data-plot-kind="box" viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="mt-auto block overflow-visible" style={{ width: CHART_W, height: CHART_H }}>
                <defs>
                    <linearGradient id="trend-fade" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="var(--blue-4)" stopOpacity=".18" />
                        <stop offset="1" stopColor="var(--blue-4)" stopOpacity="0" />
                    </linearGradient>
                </defs>
                {[0.25, 0.5, 0.75].map((f) => (
                    <line key={f} x1="0" x2={CHART_W} y1={CHART_H * f} y2={CHART_H * f} stroke="var(--line)" />
                ))}
                <path d={smoothPath(previous)} fill="none" stroke="var(--previous)" strokeWidth="1.5" strokeDasharray="4 4" />
                <path d={`${thisPath} V${CHART_H} H0 Z`} fill="url(#trend-fade)" />
                <path d={thisPath} fill="none" stroke="var(--blue-4)" strokeWidth="2" />
                <circle cx={CHART_W} cy={lastY} r="4" fill="var(--blue-4)" stroke="var(--card)" strokeWidth="2" />
            </svg>
            <div className="mt-2 flex justify-between text-[12px] leading-4 text-mid">
                {DAYS.map((d) => (
                    <span key={d}>{d}</span>
                ))}
            </div>
        </Panel>
    );
};

const STAGES = [
    { stage: 'Leads', count: 1284 },
    { stage: 'Qualified', count: 846 },
    { stage: 'Proposal', count: 412 },
    { stage: 'Won', count: 86 },
];
/** Deepens stage by stage, the same ramp the other tiles use. */
const STAGE_FILLS = ['bg-blue-2', 'bg-blue-3', 'bg-blue-4', 'bg-blue-5'];
const BARS_H = 112;
const RAMP_W = 10;
/** Matches the bars' rounded-t-lg: each connector leaves a bar where its corner curve ends and meets the next where its curve begins. */
const BAR_R = 8;
const barHeight = (count: number) => Math.max(BAR_R + 4, Math.round((count / STAGES[0].count) * BARS_H));
/** Sketched before the counts are known: every stage the same height. */
const SKETCH_BAR = Math.round(BARS_H * 0.6);

/**
 * A stepped funnel: one column per stage, split by hairlines. Each bar steps down to the next through a sloped
 * connector, so the drop-off reads as a shape rather than a number.
 */
export const PipelineTile = () => {
    const height = usePlotPhase() === 'sketch' ? () => SKETCH_BAR : barHeight;
    const figure = useFigure();
    return (
        <Tile title="Pipeline value" value="$486,200" change="15%" previous="$422,800">
            <div data-plot="funnel" className="flex">
                {STAGES.map((s, i) => {
                    const next = STAGES[i + 1];
                    const h = height(s.count);
                    return (
                        <div key={s.stage} className="flex flex-1 flex-col border-l border-line">
                            <div className="px-1.5">
                                <span data-plot="" className="block text-[11px] leading-4 text-muted">
                                    {s.stage}
                                </span>
                                <b data-plot="" className="mt-0.5 block text-[15px] leading-5 font-semibold tabular-nums">
                                    {figure(s.count.toLocaleString('en-US'))}
                                </b>
                            </div>
                            <div className="mt-3 flex items-end" style={{ height: BARS_H }}>
                                <div data-plot="" className={cn('hatch flex-1 rounded-t-lg', STAGE_FILLS[i])} style={{ height: h }} />
                                {next && (
                                    <svg aria-hidden viewBox={`0 0 ${RAMP_W} ${BARS_H}`} className="block shrink-0" style={{ width: RAMP_W, height: BARS_H }}>
                                        <polygon points={`0,${BARS_H - h + BAR_R} ${RAMP_W},${BARS_H - height(next.count) + BAR_R} ${RAMP_W},${BARS_H} 0,${BARS_H}`} fill="var(--blue-1)" />
                                    </svg>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </Tile>
    );
};

const SOURCES = [
    { label: 'Referrals', share: 32, fill: 'bg-blue-5' },
    { label: 'Website', share: 24, fill: 'bg-blue-4' },
    { label: 'LinkedIn', share: 18, fill: 'bg-blue-3' },
    { label: 'Google ads', share: 11, fill: 'bg-blue-2' },
    { label: 'Events', share: 6, fill: 'bg-blue-1' },
    { label: 'Other', share: 9, fill: 'bg-well' },
];

/** Where leads came from: a striped stacked bar, then the breakdown as a list. */
export const LeadSourcesTile = () => {
    const sketch = usePlotPhase() === 'sketch';
    const figure = useFigure();
    return (
        <Tile title="Lead sources" value="1,284" change="12%" previous="1,146">
            <div data-plot="mix" className="flex h-6 gap-1">
                {SOURCES.map((s) => (
                    <span key={s.label} className={cn('rounded-md', s.fill, s.label !== 'Other' && 'hatch')} style={{ flexGrow: sketch ? 1 : s.share }} />
                ))}
            </div>
            <ul className="mt-4 flex flex-col gap-1 text-[13px] leading-5">
                {SOURCES.map((s) => (
                    <li key={s.label} className="flex items-center gap-2.5">
                        <span className={cn('size-2.5 shrink-0 rounded-[3px]', s.fill)} />
                        <span data-plot="">{s.label}</span>
                        <span data-plot="" className="ml-auto text-mid tabular-nums">
                            {figure(`${s.share}%`)}
                        </span>
                    </li>
                ))}
            </ul>
        </Tile>
    );
};

/** Share of clients per touchpoint bucket, as a bar height in %. */
const TOUCHES = [38, 68, 84, 60, 32, 18, 14];
/** The bucket the 3.4 average falls in. */
const TOUCH_PEAK = 2;
const TOUCH_LABELS = ['1', '2', '3', '4', '5', '6', '7+'];

export const TouchpointsTile = () => {
    const sketch = usePlotPhase() === 'sketch';
    return (
        <Tile title="Touchpoints per client" value="3.4" change="10%" previous="3.1">
            <div data-plot="columns" className="flex h-[150px] items-end gap-2">
                {TOUCHES.map((h, i) => (
                    <div key={i} className="flex h-full flex-1 items-end rounded-[10px] bg-well">
                        <div data-plot="" className={cn('w-full rounded-[10px]', i === TOUCH_PEAK ? 'bg-blue-4' : 'bg-blue-2')} style={{ height: `${sketch ? 50 : h}%` }} />
                    </div>
                ))}
            </div>
            <div className="mt-2 flex text-[12px] leading-4 text-mid">
                {TOUCH_LABELS.map((l) => (
                    <span key={l} className="flex-1 text-center">
                        {l}
                    </span>
                ))}
            </div>
        </Tile>
    );
};

/** Enquiries per hour of the day, as a bar height in %. */
const HOURS = [18, 14, 6, 6, 6, 8, 14, 26, 38, 64, 70, 80, 78, 72, 68, 66, 64, 56, 60, 70, 76, 62, 44, 28];
/** Office hours are 9 am to 5 pm. Each bar gets exactly one colour: `cn` doesn't dedupe, so two bg classes fight. */
const isOfficeHour = (hour: number) => hour >= 9 && hour < 17;

export const AfterHoursTile = () => {
    const sketch = usePlotPhase() === 'sketch';
    return (
        <Tile title="After-hours enquiries" value="60%" change="4%" previous="56%">
            <div data-plot="by hour" className="flex h-[118px] items-end gap-[3px]">
                {HOURS.map((h, i) => (
                    <i key={i} className={cn('block flex-1 rounded-[3px]', isOfficeHour(i) ? 'bg-blue-4' : 'bg-blue-2')} style={{ height: `${sketch ? 45 : h}%` }} />
                ))}
            </div>
            <div className="mt-2 flex justify-between text-[12px] leading-4 text-mid">
                <span>12 am</span>
                <span>9 am</span>
                <span>5 pm</span>
                <span>12 am</span>
            </div>
            <Legend
                items={[
                    { label: 'Office hours', count: '96', dot: 'bg-blue-4' },
                    { label: 'After hours', count: '147', dot: 'bg-blue-2' },
                ]}
            />
        </Tile>
    );
};

export const DASHBOARD_ROW = [
    { id: 'pipeline', Component: PipelineTile },
    { id: 'lead-sources', Component: LeadSourcesTile },
    { id: 'touchpoints', Component: TouchpointsTile },
    { id: 'after-hours', Component: AfterHoursTile },
];
```

### `src/components/plot-reveal/index.ts`

```ts
export { PlotReveal, usePlotPhase, type PlotPhase, type PlotRevealProps, type PlotStage } from './plot-reveal';
export { DEFAULT_TEMPO, setTempo } from './timeline';
```

### `src/components/plot-reveal/plot-reveal.tsx`

```tsx
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { measure, type Plot } from './measure';
import { PlotLayer } from './plot-layer';

export type PlotStage = 'measuring' | 'plotting' | 'morphing' | 'waiting' | 'resolving' | 'done';

/** What the UI inside should show: generic placeholder data while it's sketched, then its real data. */
export type PlotPhase = 'sketch' | 'real';

const PhaseContext = createContext<PlotPhase>('real');

/** For UI inside a `morph` PlotReveal: render generic data in "sketch" (bars at the average, a flat line), real data in "real". */
export const usePlotPhase = () => useContext(PhaseContext);

export type PlotRevealProps = {
    /** Data has arrived. The drawing always finishes first, then holds (breathing) until this is true. */
    ready?: boolean;
    /** Tag drawn under the frame, e.g. "Invoice card". */
    label?: string;
    /** Leader lines and spec tags beside the frame for labelled elements. Off gives a centred, quieter drawing. */
    annotate?: boolean;
    /**
     * Sketch the UI with generic data first (see usePlotPhase), then morph every pencil box and line to the real
     * layout before the UI fills in. Slower, but shows the drawing adjusting to the data.
     */
    morph?: boolean;
    className?: string;
    children: ReactNode;
    onStageChange?: (stage: PlotStage) => void;
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r(null)));

/**
 * A loading state that drafts the UI before it arrives. Every `[data-plot]` element inside is
 * measured from the real layout, then boxed, hatched, annotated and lettered in blue pencil.
 * Once the drawing is done and `ready` is true, the real UI comes in element by element and the pencil clears with it.
 * Remount (change `key`) to replay.
 */
export const PlotReveal = ({ ready = true, label, annotate = true, morph = false, className, children, onStageChange }: PlotRevealProps) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const [stage, setStage] = useState<PlotStage>('measuring');
    const [phase, setPhase] = useState<PlotPhase>(morph ? 'sketch' : 'real');
    const [plot, setPlot] = useState<Plot | null>(null);
    const [target, setTarget] = useState<Plot | null>(null);
    const [drawn, setDrawn] = useState(false);
    const [morphed, setMorphed] = useState(!morph);
    const stageListener = useRef(onStageChange);

    useEffect(() => {
        stageListener.current = onStageChange;
    }, [onStageChange]);

    useEffect(() => {
        stageListener.current?.(stage);
    }, [stage]);

    const measureLabelled = useCallback(
        (root: HTMLElement) => {
            const measured = measure(root);
            return annotate ? measured : { ...measured, items: measured.items.map((it) => ({ ...it, label: '' })) };
        },
        [annotate],
    );

    useEffect(() => {
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setPhase('real');
            setStage('done');
            return;
        }
        let alive = true;
        (async () => {
            await Promise.race([document.fonts.ready, wait(1200)]);
            await nextFrame();
            if (!alive || !rootRef.current) return;
            setPlot(measureLabelled(rootRef.current));
            setStage('plotting');
        })();
        return () => {
            alive = false;
        };
    }, [measureLabelled]);

    // Morph: once the sketch is drawn, swap in the real data (still hidden), measure it, and let the layer move the pencil there.
    useEffect(() => {
        if (!drawn) return;
        if (!morphed) {
            setStage('morphing');
            setPhase('real');
            return;
        }
        setStage(ready ? 'resolving' : 'waiting');
    }, [drawn, ready, morphed]);

    useLayoutEffect(() => {
        if (!morph || phase !== 'real' || !plot || target || !rootRef.current) return;
        setTarget(measureLabelled(rootRef.current));
    }, [morph, phase, plot, target, measureLabelled]);

    const handleDrawn = useCallback(() => setDrawn(true), []);
    const handleMorphed = useCallback(() => setMorphed(true), []);
    const handleDone = useCallback(() => setStage('done'), []);

    return (
        <div ref={rootRef} data-plot-state={stage} className={cn('plot-root relative isolate', className)}>
            <PhaseContext.Provider value={phase}>
                <div className="plot-content">{children}</div>
            </PhaseContext.Provider>
            {plot && stage !== 'done' && <PlotLayer plot={plot} target={target} label={label} ready={ready && morphed} morph={morph} onDrawn={handleDrawn} onMorphed={handleMorphed} onDone={handleDone} />}
        </div>
    );
};
```

### `src/components/plot-reveal/plot-reveal.css`

```css
/*
  PlotReveal: the UI is hidden while it is measured; from then on the layer hides and reveals
  its elements one by one (see the hi-fi stage in plot-layer.tsx). Nothing moves or blurs.
*/
.plot-root[data-plot-state='measuring'] > .plot-content {
    opacity: 0;
}

.plot-mark {
    transform-box: fill-box;
    transform-origin: center;
}

.plot-words {
    position: absolute;
    white-space: nowrap;
}
.plot-words,
.plot-words * {
    color: transparent !important;
    -webkit-text-stroke: 0.6px color-mix(in srgb, var(--plot) 85%, transparent);
    background: none !important;
    border-color: color-mix(in srgb, var(--plot) 55%, transparent) !important;
    box-shadow: none !important;
}

/* Drawn, but the data isn't here yet: the lettering breathes. */
.plot-root[data-plot-state='waiting'] .plot-words {
    animation: plot-breathe 1100ms ease-in-out infinite alternate;
}
@keyframes plot-breathe {
    to {
        opacity: 0.3;
    }
}

@media (prefers-reduced-motion: reduce) {
    .plot-layer {
        display: none;
    }
    .plot-root > .plot-content {
        opacity: 1 !important;
    }
}
```

### `src/components/plot-reveal/plot-layer.tsx`

```tsx
import { useEffect, useId, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Grain } from './grain';
import type { Detail } from './details';
import type { Plot, Rect } from './measure';
import { ANNOTATION_GAP, HIFI, schedule, T, TEMPO } from './timeline';

type PlotLayerProps = {
    plot: Plot;
    /** The same UI laid out with its real data. When it arrives, every pencil box and line moves from `plot` to here. */
    target?: Plot | null;
    label?: string;
    /** Data has arrived. Hi-fi runs alongside the drawing; if the data is late, elements wait as pencil until it lands. */
    ready: boolean;
    onDrawn: () => void;
    onDone: () => void;
    onMorphed?: () => void;
    /**
     * Morph mode: the sketch draws in a fixed time (MORPH.draw), and the hi-fi, which waited for the morph,
     * plays in drawing order from the start instead of everything overdue at once.
     */
    morph?: boolean;
};

const HIDDEN = [{ opacity: 0 }, { opacity: 0 }];

const EASE = 'cubic-bezier(0.22, 0.8, 0.24, 1)';
const CHIP_W = 260;

/** Every animated piece carries its timing as data: a (kind), t (start), d (duration), out (clear). */
const timing = (a: 'draw' | 'fade' | 'mark' | 'write', t: number, d?: number, out?: number) => ({
    'data-a': a,
    'data-t': Math.round(t),
    ...(d ? { 'data-d': Math.round(d) } : {}),
    ...(out !== undefined && Number.isFinite(out) ? { 'data-out': Math.round(out) } : {}),
});

const KEYFRAMES = {
    draw: [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
    fade: [{ opacity: 0 }, { opacity: 1 }],
    mark: [
        { opacity: 0, transform: 'scale(0.4)' },
        { opacity: 1, transform: 'scale(1)' },
    ],
    /** Text written in left to right, the way a hand letters it. */
    write: [{ clipPath: 'inset(-4px 100% -4px -2px)' }, { clipPath: 'inset(-4px -2px -4px -2px)' }],
} satisfies Record<string, Keyframe[]>;

/** Each mark is erased the way it was made: strokes rubbed out from where they began, text and fills wiped left to right. */
const ERASE = {
    draw: [{ strokeDashoffset: 0 }, { strokeDashoffset: -1 }],
    write: [{ clipPath: 'inset(-4px -2px -4px -2px)' }, { clipPath: 'inset(-4px -2px -4px 100%)' }],
    wipe: [{ clipPath: 'inset(-3px -3px -3px -3px)' }, { clipPath: 'inset(-3px -3px -3px 100%)' }],
} satisfies Record<string, Keyframe[]>;

const ERASE_EASE = 'cubic-bezier(0.5, 0, 0.75, 0.6)';

/** Erase one mark at `delay`, a touch quicker than it went down. */
const erasePiece = (el: Element, delay: number, base: number) => {
    const node = el as HTMLElement;
    const a = node.dataset.a;
    const frames = a === 'draw' ? ERASE.draw : a === 'write' ? ERASE.write : ERASE.wipe;
    const drawn = Number(node.dataset.d) || base;
    return node.animate(frames, { delay, duration: Math.max(140, Math.min(420, drawn * 0.6)) * TEMPO, easing: ERASE_EASE, fill: 'forwards' });
};

const DEFAULT_DURATION = { draw: T.draw, fade: 300, mark: 380, write: 400 };

/** `pace` stretches this mark's timing: TEMPO, or a morph's fixed-length sketch (see PlotLayer). */
const animatePiece = (el: Element, pace: number) => {
    const node = el as HTMLElement;
    const a = node.dataset.a as keyof typeof KEYFRAMES;
    const t = Number(node.dataset.t);
    const d = Number(node.dataset.d) || DEFAULT_DURATION[a];
    const runs = [node.animate(KEYFRAMES[a], { delay: t * pace, duration: d * pace, easing: a === 'fade' ? 'ease' : a === 'write' ? 'cubic-bezier(0.45, 0, 0.55, 1)' : EASE, fill: 'both' })];
    if (node.dataset.out) {
        runs.push(node.animate(ERASE.wipe, { delay: Number(node.dataset.out) * pace, duration: 320 * pace, easing: ERASE_EASE, fill: 'forwards' }));
    }
    return runs;
};

/**
 * Morph rhythm (before TEMPO): each mark moves over `move`, and the moves sweep top to bottom across `sweep`.
 * The hi-fi takes over `handoff` of a move before the last one ends: the ease's tail barely moves, so it already looks done.
 * Every morphing sketch draws in exactly `draw`, however detailed, so widgets started a beat apart also morph a beat apart.
 */
const MORPH = { move: 700, sweep: 650, handoff: 0.15, ease: 'cubic-bezier(0.77, 0, 0.175, 1)', draw: 2000 } as const;
/** The replayed hi-fi runs at half its time: the drawing is already done, so nothing is left to wait on. */
const REPLAY_PACE = 0.5;

const crossPath = (it: Rect) => `M${it.x} ${it.y} L${it.x + it.w} ${it.y + it.h} M${it.x + it.w} ${it.y} L${it.x} ${it.y + it.h}`;
const measurePath = (it: Rect) => `M${it.x} ${it.y - 13} v8 M${it.x} ${it.y - 9} H${it.x + it.w} M${it.x + it.w} ${it.y - 13} v8`;
const rectFrame = (r: Rect) => ({ x: `${r.x}px`, y: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
const moved = (a: Rect, b: Rect) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.w - b.w) + Math.abs(a.h - b.h) > 0.5;
const cssMatrix = (m: string) => m.replace(/\s+/g, ', ').replace('(, ', '(');

const NUMBER = /\d[\d,]*(?:\.\d+)?/g;

/**
 * Lettering that counts from one figure to another ("0m 0s" to "4m 32s"), number by number in the target's format.
 * Null when the two don't line up (different words, or a different count of numbers).
 */
const countUp = (from: string, to: string) => {
    const a = from.match(NUMBER) ?? [];
    const b = to.match(NUMBER) ?? [];
    if (a.length !== b.length || from.replace(NUMBER, '#') !== to.replace(NUMBER, '#')) return null;
    const parts = to.split(NUMBER);
    const value = (n: string) => parseFloat(n.replace(/,/g, ''));
    return (p: number) =>
        parts.reduce((out, part, i) => {
            if (i === 0) return part;
            const target = b[i - 1];
            const decimals = target.split('.')[1]?.length ?? 0;
            // Geometric, not linear: digits arrive evenly through the move, so the lettering widens in step with its box.
            const from = value(a[i - 1]);
            const v = from + ((value(target) - from + 1) ** p - 1);
            const shown = target.includes(',') ? v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : v.toFixed(decimals);
            return out + shown + part;
        }, '');
};

/** Pairs each detail with the same element's detail in the target, in order: the nth of an element's details with its nth. */
const pairDetails = (from: Detail[], to: Detail[]) => {
    const byEl = new Map<Element, Detail[]>();
    to.forEach((dt) => byEl.set(dt.el, [...(byEl.get(dt.el) ?? []), dt]));
    const used = new Map<Element, number>();
    return from.map((dt) => {
        const n = used.get(dt.el) ?? 0;
        used.set(dt.el, n + 1);
        return byEl.get(dt.el)?.[n] ?? null;
    });
};

type ChipProps = { x: number; y: number; t: number; align?: 'left' | 'center'; children: ReactNode };

const Chip = ({ x, y, t, align = 'left', children }: ChipProps) => (
    <foreignObject x={align === 'center' ? x - CHIP_W / 2 : x} y={y - 7} width={CHIP_W} height={14} {...timing('fade', t)}>
        <div className={cn('flex h-full items-center gap-1.5', align === 'center' && 'justify-center')}>{children}</div>
    </foreignObject>
);

const Tag = ({ children }: { children: ReactNode }) => <span className="rounded-[2px] bg-plot px-1 font-mono text-[8.5px] leading-[13px] tracking-[0.08em] whitespace-nowrap text-paper uppercase">{children}</span>;

const Note = ({ children }: { children: ReactNode }) => <span className="bg-paper px-0.5 font-mono text-[9px] leading-[13px] tracking-[0.04em] whitespace-nowrap text-plot">{children}</span>;

const cropMarks = (w: number, h: number) =>
    [
        [0, 0, -1, -1],
        [w, 0, 1, -1],
        [w, h, 1, 1],
        [0, h, -1, 1],
    ]
        .map(([cx, cy, ox, oy]) => `M${cx + ox * 18} ${cy} H${cx + ox * 6} M${cx} ${cy + oy * 18} V${cy + oy * 6}`)
        .join(' ');

/** A run of text, outlined in pencil and written in left to right. */
const textClone = (dt: Extract<Detail, { kind: 'text' }>, index: number, t: number, d: number) => {
    const el = document.createElement('span');
    el.dataset.detail = String(index);
    el.className = 'plot-words';
    el.textContent = dt.text;
    Object.assign(el.style, {
        left: `${dt.x}px`,
        top: `${dt.y}px`,
        height: `${dt.h}px`,
        lineHeight: `${dt.h}px`,
        ...dt.type,
    });
    el.style.lineHeight = `${dt.h}px`;
    el.dataset.a = 'write';
    el.dataset.t = String(Math.round(t));
    el.dataset.d = String(Math.round(d));
    return el;
};

/** The real elements that fade in during the hi-fi stage, each once every one of its details is finished. */
const revealTimes = (plot: Plot, at: number[]) => {
    const times = new Map<Element, { t: number; d: number; i: number }>();
    plot.details.forEach((dt, i) => {
        const prev = times.get(dt.el);
        if (!prev || at[i] > prev.t) times.set(dt.el, { t: at[i], d: 0, i });
    });
    return times;
};

export const PlotLayer = ({ plot, target, label, ready, morph = false, onDrawn, onMorphed, onDone }: PlotLayerProps) => {
    const uid = useId().replace(/:/g, '');
    const svgRef = useRef<SVGSVGElement>(null);
    const wordsRef = useRef<HTMLDivElement>(null);
    const plan = useMemo(() => schedule(plot), [plot]);
    const mountedAt = useRef(0);
    const { w: W, h: H, radius } = plot.frame;
    const col = W + ANNOTATION_GAP;
    const hasNotes = plan.rows.size > 0;

    useLayoutEffect(() => {
        const svg = svgRef.current;
        const host = wordsRef.current;
        if (!svg || !host) return;

        host.replaceChildren(...plot.details.flatMap((dt, i) => (dt.kind === 'text' ? [textClone(dt, i, plan.detailAt[i], plan.detailDraw[i])] : [])));
        const pace = morph ? TEMPO * (MORPH.draw / plan.drawnAt) : TEMPO;
        const runs = [...svg.querySelectorAll('[data-a]'), ...host.children].flatMap((el) => animatePiece(el, pace));
        // The real UI stays hidden, element by element, until the hi-fi stage brings each one in.
        const real = [plot.surface, ...plot.details.map((dt) => dt.el)].filter((el): el is NonNullable<typeof el> => !!el);
        runs.push(...[...new Set(real)].map((el) => el.animate(HIDDEN, { duration: 1e9, fill: 'both' })));
        mountedAt.current = performance.now();
        const done = setTimeout(onDrawn, plan.drawnAt * pace);

        return () => {
            clearTimeout(done);
            runs.forEach((r) => r.cancel());
            host.replaceChildren();
        };
    }, [plot, plan, onDrawn, morph]);

    // Hi-fi runs alongside the drawing, element by element: each arrives a beat after its own detail lands, and its
    // pencil clears with it. A sketch box clears once everything in it is real; guides and labels clear last.
    // If the data isn't ready yet, everything due so far arrives as soon as it is.
    useEffect(() => {
        const svg = svgRef.current;
        const host = wordsRef.current;
        if (!ready || !svg || !host) return;
        const elapsed = performance.now() - mountedAt.current;
        // Replayed from the first element's arrival: the surface (earlier) clamps to now, and nothing waits on the old lead-in.
        const first = Math.min(...plan.revealAt);
        const at = morph ? (t: number) => Math.max(0, (t - first) * TEMPO * REPLAY_PACE) : (t: number) => Math.max(0, t * TEMPO - elapsed);
        const runs: Animation[] = [];
        const show = (el: Element, t: number, duration: number) => runs.push(el.animate([{ opacity: 0 }, { opacity: 1 }], { delay: at(t), duration: duration * TEMPO, easing: 'ease-out', fill: 'forwards' }));
        // Pencil is erased, never faded: each mark rubbed out the way it went down. Marks with their own exit (hatching) keep it.
        const erased = new Set<Element>();
        const erase = (root: Element, t: number, spread = 90) => {
            const marks = [...(root.matches('[data-a]') ? [root] : []), ...root.querySelectorAll('[data-a]')].filter((m) => !erased.has(m) && !(m as HTMLElement).dataset.out);
            marks.forEach((m, k) => {
                erased.add(m);
                runs.push(erasePiece(m, at(t) + ((k * 37) % 7) * (spread / 7) * TEMPO, HIFI.clear));
            });
        };

        if (plot.surface) show(plot.surface, plan.surfaceAt, HIFI.surface);
        revealTimes(plot, plan.revealAt).forEach(({ t, i }, el) => show(el, t, plan.revealDur[i]));
        // An element's pencil is erased exactly when its own hi-fi arrives.
        const arrives = revealTimes(plot, plan.revealAt);
        plot.details.forEach((dt, i) => {
            const t = arrives.get(dt.el)?.t ?? plan.revealAt[i];
            for (const el of [...svg.querySelectorAll(`[data-detail="${i}"]`), ...host.querySelectorAll(`[data-detail="${i}"]`)]) erase(el, t, 0);
        });
        plot.items.forEach((_, i) => svg.querySelectorAll(`[data-item="${i}"]`).forEach((el) => erase(el, plan.itemOut[i])));
        plan.guides.forEach((_, i) => svg.querySelectorAll(`[data-guide="${i}"]`).forEach((el) => erase(el, plan.guideOut[i], 0)));
        plan.blocks.forEach((_, i) => svg.querySelectorAll(`[data-block="${i}"]`).forEach((el) => erase(el, plan.blockOut[i], 0)));
        // Whatever is left (card outline, measurements, crop marks) goes last, scattered.
        erase(svg, plan.restAt, HIFI.rest * 0.6);
        erase(host, plan.restAt, HIFI.rest * 0.6);

        const done = setTimeout(onDone, at(plan.end));
        return () => {
            clearTimeout(done);
            runs.forEach((r) => r.cancel());
        };
    }, [ready, plot, plan, onDone, morph]);

    // Morph: every box, shape, line and lettering moves from the sketch layout to the real one, sweeping top to bottom.
    useEffect(() => {
        const svg = svgRef.current;
        const host = wordsRef.current;
        if (!target || !svg || !host) return;
        const runs: Animation[] = [];
        const counters: { el: Element; run: Animation; text: (p: number) => string }[] = [];
        let end = 0;
        const move = (el: Element, from: Keyframe, to: Keyframe, y: number) => {
            const delay = Math.max(0, Math.min(1, y / H)) * MORPH.sweep * TEMPO;
            end = Math.max(end, delay + MORPH.move * TEMPO);
            const run = el.animate([from, to], { delay, duration: MORPH.move * TEMPO, easing: MORPH.ease, fill: 'forwards' });
            runs.push(run);
            return run;
        };

        const items = new Map(target.items.map((it) => [it.el, it]));
        plot.items.forEach((a, i) => {
            const b = items.get(a.el);
            if (!b || !moved(a, b)) return;
            const group = svg.querySelector(`g[data-item="${i}"]`);
            group?.querySelectorAll(':scope > rect').forEach((r) => move(r, rectFrame(a), rectFrame(b), a.y));
            group?.querySelectorAll<SVGPathElement>(':scope > path[data-shape]').forEach((p) => {
                const draw = p.dataset.shape === 'cross' ? crossPath : measurePath;
                move(p, { d: `path("${draw(a)}")` }, { d: `path("${draw(b)}")` }, a.y);
            });
        });

        pairDetails(plot.details, target.details).forEach((b, i) => {
            const a = plot.details[i];
            if (!b || a.kind !== b.kind) return;
            if (a.kind === 'shape' && b.kind === 'shape' && moved(a, b)) {
                svg.querySelectorAll(`rect[data-detail="${i}"]`).forEach((r) => move(r, rectFrame(a), rectFrame(b), a.y));
            } else if (a.kind === 'path' && b.kind === 'path' && (a.d !== b.d || a.transform !== b.transform)) {
                svg.querySelectorAll(`path[data-detail="${i}"]`).forEach((p) => move(p, { d: `path("${a.d}")`, transform: cssMatrix(a.transform) }, { d: `path("${b.d}")`, transform: cssMatrix(b.transform) }, a.y));
            } else if (a.kind === 'text' && b.kind === 'text' && (moved(a, b) || a.text !== b.text)) {
                host.querySelectorAll(`[data-detail="${i}"]`).forEach((w) => {
                    const run = move(w, { left: `${a.x}px`, top: `${a.y}px` }, { left: `${b.x}px`, top: `${b.y}px` }, a.y);
                    if (a.text !== b.text) counters.push({ el: w, run, text: countUp(a.text, b.text) ?? ((p) => (p < 0.5 ? a.text : b.text)) });
                });
            }
        });

        // Lettering counts up in step with its own move: same delay, same easing.
        let frame = 0;
        const tick = () => {
            let moving = false;
            counters.forEach(({ el, run, text }) => {
                const p = run.effect?.getComputedTiming().progress ?? (run.playState === 'finished' ? 1 : 0);
                el.textContent = text(p);
                moving ||= p < 1;
            });
            if (moving) frame = requestAnimationFrame(tick);
        };
        if (counters.length) frame = requestAnimationFrame(tick);

        const done = setTimeout(() => onMorphed?.(), Math.max(0, end - MORPH.move * MORPH.handoff * TEMPO));
        return () => {
            clearTimeout(done);
            cancelAnimationFrame(frame);
            runs.forEach((r) => r.cancel());
        };
    }, [target, plot, H, onMorphed]);

    return (
        <>
            <svg ref={svgRef} aria-hidden className="plot-layer pointer-events-none absolute inset-0 size-full overflow-visible text-plot" fill="none" stroke="currentColor">
                <defs>
                    <pattern id={`${uid}-hatch`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
                        <line x1="0" y1="0" x2="0" y2="5" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1" />
                    </pattern>
                    <Grain id={`${uid}-grain`} region={{ x: -90, y: -90, w: W + 180 + (hasNotes ? 320 : 0), h: H + 180 }} />
                </defs>

                <g filter={`url(#${uid}-grain)`}>
                    {/* Pre-stage: construction lines and big blocks */}
                    {plan.guides.map((g, i) => (
                        <path key={`g${i}`} data-guide={i} d={g.d} pathLength={1} strokeDasharray="1" strokeOpacity={0.3} strokeWidth={0.8} {...timing('draw', g.t, g.dur)} />
                    ))}
                    {plan.blocks.map((b, i) => (
                        <rect key={`b${i}`} data-block={i} x={b.x} y={b.y} width={b.w} height={b.h} pathLength={1} strokeDasharray="1" strokeOpacity={0.4} strokeWidth={0.9} {...timing('draw', b.t, b.dur)} />
                    ))}
                    <path d={cropMarks(W, H)} strokeOpacity={0.6} {...timing('fade', 0, 260)} />

                    <rect x={0} y={0} width={W} height={H} rx={radius} pathLength={1} strokeDasharray="1" strokeOpacity={0.75} strokeWidth={1.1} {...timing('draw', T.frame, T.frameDraw)} />

                    <path d={`M0 -19 v9 M0 -14.5 H${W} M${W} -19 v9 M-19 0 h9 M-14.5 0 V${H} M-19 ${H} h9`} pathLength={1} strokeDasharray="1" strokeOpacity={0.6} {...timing('draw', T.dims, 560)} />

                    {plot.items.map((it, i) => {
                        const t = plan.itemAt[i];
                        const row = plan.rows.get(i);
                        return (
                            <g key={i} data-item={i}>
                                {it.leaf && it.kind !== 'image' && <rect x={it.x} y={it.y} width={it.w} height={it.h} rx={it.radius} fill={`url(#${uid}-hatch)`} stroke="none" {...timing('fade', t + 200, 300, plan.hatchOut[i])} />}
                                <rect x={it.x} y={it.y} width={it.w} height={it.h} rx={it.radius} pathLength={1} strokeDasharray="1" strokeOpacity={it.kind === 'text' ? 0.5 : 0.7} {...timing('draw', t, plan.itemDraw[i])} />
                                {it.kind === 'image' && <path data-shape="cross" d={crossPath(it)} pathLength={1} strokeDasharray="1" strokeOpacity={0.4} {...timing('draw', t + 160, 380)} />}
                                {it.measure && <path data-shape="measure" d={measurePath(it)} pathLength={1} strokeDasharray="1" strokeOpacity={0.65} {...timing('draw', t + 260, 420)} />}
                                {row !== undefined && (
                                    <>
                                        <circle cx={it.x + it.w} cy={it.y + it.h / 2} r={1.8} fill="currentColor" stroke="none" className="plot-mark" {...timing('mark', t + 120)} />
                                        <path d={`M${it.x + it.w + 3} ${it.y + it.h / 2} H${W}`} strokeOpacity={0.35} strokeWidth={0.8} strokeDasharray="2 3" {...timing('fade', t + 160, 300)} />
                                        <path d={`M${W} ${it.y + it.h / 2} H${W + 8} L${W + 18} ${row} H${col - 4}`} pathLength={1} strokeDasharray="1" strokeOpacity={0.5} strokeWidth={0.9} {...timing('draw', t + 160, 380)} />
                                    </>
                                )}
                            </g>
                        );
                    })}

                    {/* Pass two: the details, drawn over the boxes in a firmer line */}
                    {plot.details.map((dt, i) => {
                        const t = plan.detailAt[i];
                        const d = plan.detailDraw[i];
                        if (dt.kind === 'shape') return <rect key={`d${i}`} data-detail={i} x={dt.x} y={dt.y} width={dt.w} height={dt.h} rx={dt.radius} pathLength={1} strokeDasharray="1" strokeOpacity={0.85} {...timing('draw', t, d)} />;
                        if (dt.kind === 'path')
                            return (
                                <path
                                    key={`d${i}`}
                                    data-detail={i}
                                    d={dt.d}
                                    transform={dt.transform}
                                    vectorEffect="non-scaling-stroke"
                                    pathLength={1}
                                    strokeDasharray="1"
                                    strokeOpacity={0.9}
                                    strokeWidth={1.2}
                                    strokeLinejoin="round"
                                    {...timing('draw', t, d)}
                                />
                            );
                        return null;
                    })}
                </g>

                <g stroke="none">
                    <Chip x={W / 2} y={-14.5} t={T.dims + 300} align="center">
                        <Note>{Math.round(W)}</Note>
                    </Chip>
                    <Chip x={-14.5} y={H / 2} t={T.dims + 360} align="center">
                        <Note>{Math.round(H)}</Note>
                    </Chip>
                    {label && (
                        <Chip x={0} y={H + 16} t={T.frame + 420}>
                            <Tag>{label}</Tag>
                            <Note>
                                {Math.round(W)}×{Math.round(H)}
                                {radius ? ` · r${Math.round(radius)}` : ''}
                            </Note>
                        </Chip>
                    )}
                    {plot.items.map((it, i) => {
                        const row = plan.rows.get(i);
                        const t = plan.itemAt[i];
                        // An item's label clears with the section it points at.
                        return (
                            <g key={i} data-item={i}>
                                {row !== undefined && (
                                    <Chip x={col} y={row} t={t + 380}>
                                        <Tag>{it.label}</Tag>
                                        <Note>{it.spec}</Note>
                                    </Chip>
                                )}
                                {it.measure && (
                                    <Chip x={it.x + it.w / 2} y={it.y - 9} t={t + 520} align="center">
                                        <Note>{Math.round(it.w)}</Note>
                                    </Chip>
                                )}
                            </g>
                        );
                    })}
                </g>
            </svg>
            <div ref={wordsRef} aria-hidden className="plot-layer pointer-events-none absolute inset-0" />
        </>
    );
};
```

### `src/components/plot-reveal/timeline.ts`

```ts
import type { Plot, Rect } from './measure';

/** One knob for overall pace: every delay and duration below is stretched by this. 1 = as designed, >1 = slower. */
export const DEFAULT_TEMPO = 1.3;
/** A live binding, so importers read the current value. Only film two's tweak panel changes it (setTempo). */
export let TEMPO = DEFAULT_TEMPO;
export const setTempo = (tempo: number) => {
    TEMPO = tempo;
};

/** Drafting rhythm, in ms from when the layer mounts (before TEMPO). */
export const T = {
    /** Pre-stage: long construction lines and big blocks that set out the general shape. */
    guides: 0,
    guideSpread: 260,
    guideDraw: 420,
    blocks: 160,
    blockStep: 90,
    blockDraw: 400,
    frame: 90,
    frameDraw: 520,
    dims: 280,
    items: 280,
    itemStagger: 50,
    draw: 300,
    /** Sketch boxes: start offset either way, and how much their speed varies. */
    itemJitter: 260,
    /** An area's details start only once its box is completely down, plus a short random pause. */
    regionReady: 1,
    regionPause: 110,
    /** Within an area, details follow the hand top-left to bottom-right, this far apart. */
    detailStep: 26,
    shapeDraw: 280,
    pathDraw: 520,
    /** Hand variation in the detail pass: how far a stroke can start early or late, and how many lag well behind. */
    jitter: 300,
    lateChance: 0.14,
    late: 360,
    /** Beat between the last stroke landing and the UI fading in. */
    hold: 20,
    /** The UI fades in over this long (matches plot-reveal.css). */
    resolve: 460,
} as const;

/** Hi-fi rhythm: each element arrives this long (randomised) after its own detail lands. */
export const HIFI = {
    beat: 300,
    fade: 300,
    surface: 280,
    /** Pencil for an element clears over this long as its hi-fi version arrives. */
    clear: 240,
    /** Construction lines, labels and the frame clear over this long once the last element is in. */
    rest: 320,
} as const;

/** Seeded so the same UI always draws the same way (and renders are repeatable). */
const random = (seed: number) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Leader lines run out to a column this far right of the frame. */
export const ANNOTATION_GAP = 28;
const ANNOTATION_STEP = 17;

export type Stroke = { d: string; t: number; dur: number };
export type Block = Rect & { t: number; dur: number };

export type Schedule = {
    /** Pre-stage construction lines, running past the frame. */
    guides: Stroke[];
    /** Pre-stage blocks: one per major horizontal band of the layout. */
    blocks: Block[];
    itemAt: number[];
    itemDraw: number[];
    /** When each layout box's hatching clears: the detail pass reaching it. */
    hatchOut: number[];
    detailAt: number[];
    detailDraw: number[];
    /** Annotation row for each labelled item (by index), stacked so chips never overlap. */
    rows: Map<number, number>;
    /** Hi-fi, running alongside the drawing: the card surface, then each element shortly after its own detail lands. */
    surfaceAt: number;
    revealAt: number[];
    revealDur: number[];
    /** Per layout box: when its sketch clears, once everything inside it is real. */
    itemOut: number[];
    /** Construction lines and blocks each clear on their own beat while the card fills in. */
    guideOut: number[];
    blockOut: number[];
    /** The card outline, measurements and labels clear from here. */
    restAt: number;
    /** The drawing is complete (for `ready` waits). */
    drawnAt: number;
    end: number;
};

export const schedule = (plot: Plot): Schedule => {
    // Plot top to bottom like a pen plotter; dense frames draw faster so the whole plot stays near two seconds.
    const count = Math.max(1, plot.items.length);
    const order = plot.items.map((it, i) => ({ i, key: Math.round(it.y / 8) * 10000 + it.x })).sort((a, b) => a.key - b.key);
    const rank = new Array<number>(count);
    order.forEach(({ i }, r) => (rank[i] = r));

    const rand = random(Math.round(plot.frame.w * 31 + plot.frame.h * 17 + plot.details.length * 7));
    const { w: W, h: H } = plot.frame;

    // Pre-stage. Bands: the top-level boxes grouped by the rows they sit in.
    const isInside = (a: Rect, b: Rect) => a !== b && a.x >= b.x - 1 && a.y >= b.y - 1 && a.x + a.w <= b.x + b.w + 1 && a.y + a.h <= b.y + b.h + 1;
    const top = plot.items.filter((a) => !plot.items.some((b) => isInside(a, b)));
    const left = Math.min(...plot.items.map((it) => it.x), W * 0.06);
    const right = Math.max(...plot.items.map((it) => it.x + it.w), W * 0.94);
    const bands: { y0: number; y1: number }[] = [];
    [...top]
        .sort((a, b) => a.y - b.y)
        .forEach((it) => {
            const last = bands.at(-1);
            if (last && it.y <= last.y1 + 10) last.y1 = Math.max(last.y1, it.y + it.h);
            else bands.push({ y0: it.y, y1: it.y + it.h });
        });
    const blocks: Block[] = bands.map((b, i) => ({
        x: left - 4,
        y: b.y0 - 4,
        w: right - left + 8,
        h: b.y1 - b.y0 + 8,
        t: T.blocks + i * T.blockStep + rand() * 120,
        dur: T.blockDraw * (0.7 + rand() * 0.6),
    }));

    // Construction lines: frame edges, content margins, a four-column grid, band edges. Long, past the frame.
    const ext = 56;
    const uniq = (vals: number[]) => vals.sort((a, b) => a - b).filter((v, i, a) => i === 0 || v - a[i - 1] > 3);
    const cols = uniq([0, left, ...[1, 2, 3].map((k) => left + ((right - left) * k) / 4), right, W]);
    const rowsY = uniq([0, ...bands.flatMap((b) => [b.y0, b.y1]), H]);
    const guides: Stroke[] = [...cols.map((x) => ({ d: `M${x.toFixed(1)} ${-ext} V${H + ext}`, t: 0, dur: 0 })), ...rowsY.map((y) => ({ d: `M${-ext} ${y.toFixed(1)} H${W + ext}`, t: 0, dur: 0 }))].map((g) => ({
        ...g,
        t: T.guides + rand() * T.guideSpread,
        dur: T.guideDraw * (0.7 + rand() * 0.6),
    }));

    // Pass one, loosely: boxes go down roughly top to bottom, but each starts a little early or late
    // and draws at its own speed, so some areas are blocked out well before others.
    const stagger = Math.min(T.itemStagger, Math.max(10, 1100 / count));
    const itemAt = plot.items.map((_, i) => Math.max(T.items, T.items + rank[i] * stagger + (rand() - 0.45) * T.itemJitter));
    const itemDraw = plot.items.map(() => T.draw * (0.6 + rand() * 0.8));
    const itemsEnd = plot.items.reduce<number>((m, _, i) => Math.max(m, itemAt[i] + itemDraw[i]), T.items);

    // Each area is ready for detail once its box (and every box around it) is mostly drawn, plus a pause.
    const ready = plot.items.map((_, i) => itemAt[i] + itemDraw[i] * T.regionReady + rand() * T.regionPause);
    const contains = (it: Rect, x: number, y: number) => x >= it.x - 2 && x <= it.x + it.w + 2 && y >= it.y - 2 && y <= it.y + it.h + 2;
    const regionReady = (x: number, y: number) => {
        let at = T.frame + T.frameDraw * T.regionReady;
        let nearest = -1;
        let best = Infinity;
        plot.items.forEach((it, i) => {
            if (contains(it, x, y)) at = Math.max(at, ready[i]);
            const dist = Math.abs(it.y + it.h / 2 - y) + Math.abs(it.x + it.w / 2 - x) * 0.25;
            if (dist < best) [best, nearest] = [dist, i];
        });
        return nearest >= 0 ? Math.max(at, ready[nearest] - 80) : at;
    };

    // Pass two, area by area: inside an area the hand moves top-left to bottom-right, but every stroke
    // starts a little early or late, a few lag well behind, and each runs at its own speed.
    const order2 = plot.details.map((dt, i) => ({ i, key: Math.round(dt.y / 6) * 10000 + dt.x })).sort((a, b) => a.key - b.key);
    const localRank = new Array<number>(plot.details.length);
    const seen = new Map<number, number>();
    order2.forEach(({ i }) => {
        const dt = plot.details[i];
        const region = Math.round(regionReady(dt.x + 1, dt.y + 1));
        const n = seen.get(region) ?? 0;
        localRank[i] = n;
        seen.set(region, n + 1);
    });
    const detailAt = plot.details.map((dt, i) => {
        const lag = rand() < T.lateChance ? T.late * (0.6 + rand() * 0.8) : 0;
        return Math.max(T.frame + 200, regionReady(dt.x + 1, dt.y + 1) + localRank[i] * T.detailStep + (rand() - 0.4) * T.jitter + lag);
    });
    const detailDraw = plot.details.map((dt) => {
        const base = dt.kind === 'path' ? T.pathDraw : dt.kind === 'text' ? Math.min(420, 120 + dt.w * 1.4) : T.shapeDraw;
        return base * (0.6 + rand() * 0.7);
    });
    const hatchOut = plot.items.map((_, i) => ready[i] + 160);
    // Strokes ease out, so each looks finished at about two-thirds of its time; hand over then, not at the tail.
    const looksDone = 0.6;
    const detailsEnd = detailAt.reduce<number>((m, t, i) => Math.max(m, t + detailDraw[i] * looksDone), itemsEnd * 0.9);

    // Hi-fi, per element and continuous: a short random beat after its own detail lands, nothing waits for anything else.
    const surfaceAt = T.frame + T.frameDraw * 0.6;
    // Each stage completes before the next, per element: hi-fi only once its detail is fully drawn (text fully written)
    // and the sketch box around it is fully down. Elements with several details wait for all of them.
    const boxDone = (x: number, y: number) => plot.items.reduce<number>((m, it, k) => (contains(it, x, y) ? Math.max(m, itemAt[k] + itemDraw[k]) : m), T.frame + T.frameDraw);
    const own = plot.details.map((dt, i) => Math.max(surfaceAt + HIFI.surface, boxDone(dt.x + 1, dt.y + 1), detailAt[i] + detailDraw[i]));
    const allDone = new Map<Element, number>();
    plot.details.forEach((dt, i) => allDone.set(dt.el, Math.max(allDone.get(dt.el) ?? 0, own[i])));
    const revealAt = plot.details.map((dt) => (allDone.get(dt.el) ?? 0) + HIFI.beat * (0.15 + rand() * 0.7));
    const revealDur = plot.details.map(() => HIFI.fade * (0.7 + rand() * 0.6));
    const itemOut = plot.items.map((it, i) => {
        let last = -1;
        plot.details.forEach((dt, k) => {
            if (contains(it, dt.x + 1, dt.y + 1)) last = Math.max(last, revealAt[k]);
        });
        return last >= 0 ? last + 40 : itemAt[i] + itemDraw[i] + HIFI.beat * (0.5 + rand());
    });
    const lastReveal = revealAt.reduce<number>((m, t, i) => Math.max(m, t + revealDur[i] * 0.6), surfaceAt);
    // Scaffolding comes down while the card fills in, not after: from the midpoint of the reveals, each piece on its own beat.
    const sorted = [...revealAt].sort((a, b) => a - b);
    const midway = sorted[Math.floor(sorted.length * 0.5)] ?? surfaceAt;
    const restAt = Math.max(midway, lastReveal - HIFI.rest * 0.5);
    const guideOut = guides.map(() => midway + rand() * (restAt - midway));
    const blockOut = blocks.map(() => midway + rand() * (restAt - midway));

    const rows = new Map<number, number>();
    let floor = -Infinity;
    plot.items
        .map((it, i) => ({ i, cy: it.y + it.h / 2, label: it.label }))
        .filter((a) => a.label)
        .sort((a, b) => a.cy - b.cy)
        .forEach(({ i, cy }) => {
            const y = Math.max(cy, floor + ANNOTATION_STEP);
            rows.set(i, y);
            floor = y;
        });

    return {
        guides,
        blocks,
        itemAt,
        itemDraw,
        hatchOut,
        detailAt,
        detailDraw,
        rows,
        surfaceAt,
        revealAt,
        revealDur,
        itemOut,
        guideOut,
        blockOut,
        restAt,
        drawnAt: Math.max(detailsEnd, T.frame + T.frameDraw),
        // Room for the last marks to be fully erased (erase runs up to ~420ms plus scatter).
        end: Math.max(restAt + HIFI.rest + 260, lastReveal, ...itemOut.map((t) => t + 520)),
    };
};
```

### `src/components/plot-reveal/measure.ts`

```ts
import { collectDetails, type Detail } from './details';

export type Rect = { x: number; y: number; w: number; h: number };

export type PlotKind = 'text' | 'image' | 'box';

export type PlotItem = Rect & {
    label: string;
    spec: string;
    kind: PlotKind;
    radius: number;
    measure: boolean;
    /** No plotted elements inside it, so it gets hatched. */
    leaf: boolean;
    el: HTMLElement;
    /** The element's full box (text items are boxed by their ink, but lettered at this). */
    outer: Rect;
};

export type Plot = {
    frame: Rect & { radius: number };
    /** The UI's own surface (the card), revealed first in the hi-fi stage. */
    surface: HTMLElement | null;
    /** Pass one: the layout boxes. */
    items: PlotItem[];
    /** Pass two: every shape, line and run of text inside them. */
    details: Detail[];
};

const TEXT_TAGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'SPAN', 'LABEL', 'SMALL', 'STRONG', 'B', 'DT', 'DD', 'TD', 'TH']);
const IMAGE_TAGS = new Set(['IMG', 'SVG', 'CANVAS', 'VIDEO', 'PICTURE']);

/** `scale` undoes any transform on an ancestor: the drawing lives in the frame's local space. */
const relative = (r: DOMRect, origin: DOMRect, scale: number): Rect => ({
    x: (r.left - origin.left) / scale,
    y: (r.top - origin.top) / scale,
    w: r.width / scale,
    h: r.height / scale,
});

const radiusOf = (el: Element) => parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;

const kindOf = (el: HTMLElement): PlotKind => {
    const declared = el.dataset.plotKind;
    if (declared === 'text' || declared === 'image' || declared === 'box') return declared;
    if (IMAGE_TAGS.has(el.tagName.toUpperCase()) || el.getAttribute('role') === 'img') return 'image';
    if (TEXT_TAGS.has(el.tagName) && el.textContent?.trim()) return 'text';
    return 'box';
};

/** The ink of a text element: its laid-out lines, not the full block. */
const inkRect = (el: HTMLElement, origin: DOMRect, scale: number) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const rect = relative(range.getBoundingClientRect(), origin, scale);
    range.detach();
    return rect;
};

const specOf = (el: HTMLElement, kind: PlotKind, r: Rect) => {
    if (kind !== 'text') return `${Math.round(r.w)}×${Math.round(r.h)}`;
    const cs = getComputedStyle(el);
    return `${Math.round(parseFloat(cs.fontSize))}/${cs.fontWeight}`;
};

/** Measure the frame and every `[data-plot]` element inside it, relative to the frame. */
export const measure = (root: HTMLElement): Plot => {
    const origin = root.getBoundingClientRect();
    const scale = origin.width / root.offsetWidth || 1;
    const surface = root.querySelector<HTMLElement>('[data-plot-frame]') ?? (root.firstElementChild?.firstElementChild as HTMLElement | null);

    const items = Array.from(root.querySelectorAll<HTMLElement>('[data-plot]'))
        .filter((el) => el.checkVisibility())
        .map((el): PlotItem => {
            const kind = kindOf(el);
            const outer = relative(el.getBoundingClientRect(), origin, scale);
            const box = kind === 'text' ? inkRect(el, origin, scale) : outer;
            return {
                ...box,
                outer,
                kind,
                el,
                label: el.dataset.plot ?? '',
                spec: specOf(el, kind, box),
                radius: kind === 'text' ? 0 : radiusOf(el),
                measure: 'plotMeasure' in el.dataset,
                leaf: !el.querySelector('[data-plot]'),
            };
        });

    const content = (root.querySelector<HTMLElement>('.plot-content') ?? root) as HTMLElement;
    return {
        frame: { x: 0, y: 0, w: root.offsetWidth, h: root.offsetHeight, radius: surface ? radiusOf(surface) : 0 },
        surface,
        items,
        details: collectDetails(content, origin, scale, surface),
    };
};
```

### `src/components/plot-reveal/details.ts`

```ts
import type { Rect } from './measure';

/** One thing to draw in the detail pass, in the frame's local space. */
/** `el` is the real element the detail belongs to: what fades in when its hi-fi version arrives. */
export type Detail = ({ kind: 'shape'; radius: number; el: Element } & Rect) | { kind: 'path'; d: string; transform: string; y: number; x: number; el: Element } | ({ kind: 'text'; text: string; type: TypeStyle; el: Element } & Rect);

/**
 * Type longhands, copied one by one: the `font` shorthand reads back empty whenever a longhand like
 * font-variant-numeric isn't expressible in it (tabular figures), which made the pencil text the wrong size.
 */
const TYPE_PROPS = [
    'fontFamily',
    'fontSize',
    'fontWeight',
    'fontStyle',
    'fontStretch',
    'fontVariantNumeric',
    'fontVariantLigatures',
    'fontFeatureSettings',
    'fontVariationSettings',
    'fontKerning',
    'fontOpticalSizing',
    'letterSpacing',
    'wordSpacing',
    'textTransform',
] as const;

export type TypeStyle = Partial<Record<(typeof TYPE_PROPS)[number], string>>;

const typeOf = (cs: CSSStyleDeclaration): TypeStyle => Object.fromEntries(TYPE_PROPS.map((k) => [k, cs[k]]));

const MEDIA = new Set(['IMG', 'CANVAS', 'VIDEO', 'PICTURE']);

const SVG_SHAPES = 'path, circle, ellipse, rect, line, polyline, polygon';

const isTransparent = (c: string) => c === 'transparent' || c === 'rgba(0, 0, 0, 0)' || /[/,]\s*0\)$/.test(c);

const hasPaint = (cs: CSSStyleDeclaration) => !isTransparent(cs.backgroundColor) || cs.backgroundImage !== 'none' || (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none' && !isTransparent(cs.borderTopColor));

/** An SVG shape as path data in its own user space. */
const pathData = (el: SVGGraphicsElement): string | null => {
    const n = (a: string) => parseFloat(el.getAttribute(a) ?? '0');
    switch (el.tagName.toLowerCase()) {
        case 'path':
            return el.getAttribute('d');
        case 'circle': {
            const [cx, cy, r] = [n('cx'), n('cy'), n('r')];
            return `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0`;
        }
        case 'ellipse': {
            const [cx, cy, rx, ry] = [n('cx'), n('cy'), n('rx'), n('ry')];
            return `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${2 * rx} 0 a${rx} ${ry} 0 1 0 ${-2 * rx} 0`;
        }
        case 'rect':
            return `M${n('x')} ${n('y')} h${n('width')} v${n('height')} h${-n('width')} Z`;
        case 'line':
            return `M${n('x1')} ${n('y1')} L${n('x2')} ${n('y2')}`;
        case 'polyline':
        case 'polygon': {
            const pts = el.getAttribute('points')?.trim();
            return pts ? `M${pts.replace(/\s+/g, ' L')}${el.tagName === 'polygon' ? ' Z' : ''}` : null;
        }
        default:
            return null;
    }
};

/**
 * Everything a sketch artist would go back in and draw once the layout boxes are down:
 * every filled or bordered shape, every SVG line and curve, every run of text.
 */
export const collectDetails = (content: HTMLElement, origin: DOMRect, scale: number, frame: HTMLElement | null): Detail[] => {
    const local = (r: DOMRect): Rect => ({ x: (r.left - origin.left) / scale, y: (r.top - origin.top) / scale, w: r.width / scale, h: r.height / scale });
    const details: Detail[] = [];

    for (const el of content.querySelectorAll<HTMLElement>('*')) {
        if (el === frame || el instanceof SVGElement || !el.checkVisibility()) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        const cs = getComputedStyle(el);
        if (hasPaint(cs) || MEDIA.has(el.tagName)) details.push({ kind: 'shape', radius: Math.min(parseFloat(cs.borderTopLeftRadius) || 0, r.height / scale / 2), el, ...local(r) });
    }

    for (const el of content.querySelectorAll<SVGGraphicsElement>(SVG_SHAPES)) {
        if (el.closest('defs, clipPath, mask, pattern') || !el.checkVisibility()) continue;
        const d = pathData(el);
        const m = el.getScreenCTM();
        if (!d || !m) continue;
        const box = local(el.getBoundingClientRect());
        details.push({
            kind: 'path',
            d,
            transform: `matrix(${m.a / scale} ${m.b / scale} ${m.c / scale} ${m.d / scale} ${(m.e - origin.left) / scale} ${(m.f - origin.top) / scale})`,
            x: box.x,
            y: box.y,
            el,
        });
    }

    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = node.textContent?.trim();
        const parent = node.parentElement;
        if (!text || !parent || parent.closest('svg') || !parent.checkVisibility()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        const r = range.getBoundingClientRect();
        range.detach();
        if (r.width < 1) continue;
        const cs = getComputedStyle(parent);
        details.push({
            kind: 'text',
            text,
            type: typeOf(cs),
            el: parent,
            ...local(r),
        });
    }

    return details;
};
```

### `src/components/plot-reveal/grain.tsx`

```tsx
import type { Rect } from './measure';

type GrainProps = { id: string; region: Rect };

/**
 * Pencil grain: a fine noise field nudges each line off true (displacement) and wears it
 * unevenly (alpha), so strokes read as drawn rather than rendered. The region is in user
 * space because a straight line's bounding box has zero height and would be dropped.
 */
export const Grain = ({ id, region }: GrainProps) => (
    <filter id={id} filterUnits="userSpaceOnUse" x={region.x} y={region.y} width={region.w} height={region.h} colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves={2} seed={7} result="grain" />
        <feDisplacementMap in="SourceGraphic" in2="grain" scale={1.8} xChannelSelector="R" yChannelSelector="G" result="wavered" />
        <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.4 0.15" result="wear" />
        <feComposite in="wavered" in2="wear" operator="in" />
    </filter>
);
```

## Check it worked

The page shows a "Pocket Studio" top bar and a "Pocket Dashboard" title. The title and the "Last 7 days" pill sketch in first, then the full-width "Median reply time" chart, then the four tiles below it (Pipeline value, Lead sources, Touchpoints per client, After-hours enquiries), one every 1.5 seconds. Each finishes as a clean, filled-in dashboard. Clicking Replay starts it again from the beginning.

# Layout & Structure

##
