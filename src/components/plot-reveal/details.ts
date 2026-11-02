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

type Box = { left: number; top: number; right: number; bottom: number };

const intersect = (a: Box, b: Box): Box | null => {
    const box = { left: Math.max(a.left, b.left), top: Math.max(a.top, b.top), right: Math.min(a.right, b.right), bottom: Math.min(a.bottom, b.bottom) };
    return box.right > box.left && box.bottom > box.top ? box : null;
};

const NOTHING: Box = { left: 0, top: 0, right: 0, bottom: 0 };

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
    const local = (r: Box): Rect => ({ x: (r.left - origin.left) / scale, y: (r.top - origin.top) / scale, w: (r.right - r.left) / scale, h: (r.bottom - r.top) / scale });
    const details: Detail[] = [];

    // What the user can actually see of each element: scrolled-away Board Columns, a progress bar's off-track
    // indicator and the like are clipped by an overflow ancestor, so the pencil clips them the same way.
    const clips = new Map<Element, Box | null>();
    const clipOf = (el: Element | null): Box | null => {
        if (!el || !content.contains(el)) return null;
        if (clips.has(el)) return clips.get(el)!;
        const outer = el === content ? null : clipOf(el.parentElement);
        const cs = getComputedStyle(el);
        const own = cs.overflowX !== 'visible' || cs.overflowY !== 'visible' ? el.getBoundingClientRect() : null;
        // Clipped away entirely is an empty box, not null: null means nothing clips it at all.
        const box = own ? (outer ? (intersect(own, outer) ?? NOTHING) : own) : outer;
        clips.set(el, box);
        return box;
    };
    /** The element's box as far as its clipping ancestors show it; null when none of it shows. */
    const visible = (r: Box, clip: Box | null) => (clip ? intersect(r, clip) : r);

    for (const el of content.querySelectorAll<HTMLElement>('*')) {
        if (el === frame || el instanceof SVGElement || !el.checkVisibility()) continue;
        const r = visible(el.getBoundingClientRect(), clipOf(el.parentElement));
        if (!r || r.right - r.left < 1 || r.bottom - r.top < 1) continue;
        const cs = getComputedStyle(el);
        if (hasPaint(cs) || MEDIA.has(el.tagName)) details.push({ kind: 'shape', radius: Math.min(parseFloat(cs.borderTopLeftRadius) || 0, (r.bottom - r.top) / scale / 2), el, ...local(r) });
    }

    for (const el of content.querySelectorAll<SVGGraphicsElement>(SVG_SHAPES)) {
        if (el.closest('defs, clipPath, mask, pattern') || !el.checkVisibility()) continue;
        if (!visible(el.getBoundingClientRect(), clipOf(el.parentElement))) continue;
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
        // Screen-reader-only text (a 1px clipped box) is never seen, so it's never drawn.
        const box = parent.getBoundingClientRect();
        if (box.width <= 1 || box.height <= 1) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        const r = range.getBoundingClientRect();
        range.detach();
        if (r.width < 1 || !visible(r, clipOf(parent))) continue;
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
