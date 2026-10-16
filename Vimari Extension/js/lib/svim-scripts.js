/*
 * Code in this file is taken from sVim, it has been adjusted to
 * work with Vimari.
 * Assumes global variable: settings.
 */

let animationFrame = null;
let pendingTarget = null; // { el, x, y }: where the running animation will end up

// smoothScroll false              -> instant jump
// smoothScroll true, duration > 0 -> Vimari's own fast animation, `scrollDuration` ms
// smoothScroll true, duration 0   -> Safari's native smooth scroll (slower, fixed speed)
// Every frame uses behavior 'instant' so a page's `scroll-behavior: smooth` CSS
// (e.g. nileparun.com) can't turn each step into its own animation.
function smoothOn() {
    return !!(settings && settings.smoothScroll);
}

function scrollDurationMs() {
    const d = Number(settings && settings.scrollDuration);
    return isFinite(d) && d > 0 ? d : 0;
}

// --- Finding what actually scrolls ------------------------------------------
// Many web apps (ChatGPT, Claude, Gmail...) never scroll the window: the content
// lives in an inner box with its own scrollbar. Like Vimium, scroll the box you
// last clicked in; otherwise the page; otherwise the biggest scrollable box.
let lastClicked = null;
let cachedScroller = null;

document.addEventListener('mousedown', function(e) {
    lastClicked = e.target;
}, true);

function canScroll(el) {
    if (!el || el.nodeType !== 1 || !el.isConnected) return false;
    if (el.scrollHeight <= el.clientHeight + 1) return false;
    return /(auto|scroll|overlay)/.test(window.getComputedStyle(el).overflowY);
}

function documentCanScroll() {
    const doc = document.scrollingElement || document.documentElement;
    return doc.scrollHeight > window.innerHeight + 1;
}

function visibleArea(el) {
    const r = el.getBoundingClientRect();
    const w = Math.min(r.right, window.innerWidth) - Math.max(r.left, 0);
    const h = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
    return w > 0 && h > 0 ? w * h : 0;
}

function largestScrollableBox() {
    if (cachedScroller && canScroll(cachedScroller) && visibleArea(cachedScroller) > 0) {
        return cachedScroller;
    }
    let best = null;
    let bestArea = 0;
    const all = document.body ? document.body.getElementsByTagName('*') : [];
    for (let i = 0; i < all.length; i++) {
        const el = all[i];
        if (el.scrollHeight <= el.clientHeight + 1) continue; // cheap check first
        if (!canScroll(el)) continue;
        const area = visibleArea(el);
        if (area > bestArea) {
            best = el;
            bestArea = area;
        }
    }
    cachedScroller = best;
    return best;
}

// Returns null to mean "the page itself" (window), or an element.
function findScroller() {
    for (let el = lastClicked; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
        if (canScroll(el)) return el;
    }
    if (documentCanScroll()) return null;
    return largestScrollableBox();
}

function position(el) {
    return el ? { x: el.scrollLeft, y: el.scrollTop } : { x: window.scrollX, y: window.scrollY };
}

function maxScroll(el) {
    if (el) {
        return {
            x: Math.max(0, el.scrollWidth - el.clientWidth),
            y: Math.max(0, el.scrollHeight - el.clientHeight)
        };
    }
    const s = document.scrollingElement || document.documentElement;
    return {
        x: Math.max(0, s.scrollWidth - window.innerWidth),
        y: Math.max(0, s.scrollHeight - window.innerHeight)
    };
}

function scrollTarget(el) {
    return el || window;
}

// --- Scrolling ---------------------------------------------------------------
function animateScrollTo(el, left, top) {
    const max = maxScroll(el);
    left = Math.min(Math.max(0, left), max.x);
    top = Math.min(Math.max(0, top), max.y);

    window.cancelAnimationFrame(animationFrame);
    const duration = scrollDurationMs();
    const target = scrollTarget(el);

    if (!smoothOn() || duration === 0) {
        pendingTarget = null;
        target.scrollTo({ left, top, behavior: smoothOn() ? 'smooth' : 'instant' });
        return;
    }

    pendingTarget = { el: el, x: left, y: top };
    const start = position(el);
    const startTime = performance.now();

    function frame(now) {
        const t = Math.min(1, (now - startTime) / duration);
        const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
        target.scrollTo({
            left: start.x + (left - start.x) * eased,
            top: start.y + (top - start.y) * eased,
            behavior: 'instant'
        });
        if (t < 1) {
            animationFrame = window.requestAnimationFrame(frame);
        } else {
            pendingTarget = null;
        }
    }
    animationFrame = window.requestAnimationFrame(frame);
}

function customScrollBy(x, y) {
    const el = findScroller();
    // While a scroll is still animating (e.g. holding j), add to where it was
    // heading rather than where it is now, so repeated presses don't lag behind.
    const base = (pendingTarget && pendingTarget.el === el) ? pendingTarget : position(el);
    animateScrollTo(el, base.x + x, base.y + y);
}

function scrollToPageTop() {
    const el = findScroller();
    animateScrollTo(el, position(el).x, 0);
}

// G: jump to the bottom. On infinite feeds (YouTube) the content grows after the
// jump, so follow it a few times, stopping early if the user scrolls away.
function scrollToPageBottom() {
    const el = findScroller();
    const box = el || document.scrollingElement || document.documentElement;
    const viewport = el ? el.clientHeight : window.innerHeight;
    const maxFollows = 3;
    let follows = 0;
    let lastHeight = box.scrollHeight;

    animateScrollTo(el, position(el).x, lastHeight);

    function follow() {
        const height = box.scrollHeight;
        const nearBottom = position(el).y + viewport >= lastHeight - viewport;
        if (height > lastHeight && nearBottom && follows < maxFollows) {
            follows += 1;
            lastHeight = height;
            scrollTarget(el).scrollTo({ top: height, behavior: 'instant' });
            setTimeout(follow, 800);
        }
    }
    setTimeout(follow, 800);
}
