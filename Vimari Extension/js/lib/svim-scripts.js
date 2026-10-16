/*
 * Code in this file is taken from sVim, it has been adjusted to
 * work with Vimari.
 * Assumes global variable: settings.
 */

let animationFrame = null;
let pendingTarget = null; // where the running animation will end up

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

function maxScroll() {
    const s = document.scrollingElement || document.documentElement;
    return {
        x: Math.max(0, s.scrollWidth - window.innerWidth),
        y: Math.max(0, s.scrollHeight - window.innerHeight)
    };
}

function animateScrollTo(left, top) {
    const max = maxScroll();
    left = Math.min(Math.max(0, left), max.x);
    top = Math.min(Math.max(0, top), max.y);

    window.cancelAnimationFrame(animationFrame);
    const duration = scrollDurationMs();

    if (!smoothOn() || duration === 0) {
        pendingTarget = null;
        window.scrollTo({ left, top, behavior: smoothOn() ? 'smooth' : 'instant' });
        return;
    }

    pendingTarget = { x: left, y: top };
    const startX = window.scrollX;
    const startY = window.scrollY;
    const startTime = performance.now();

    function frame(now) {
        const t = Math.min(1, (now - startTime) / duration);
        const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
        window.scrollTo({
            left: startX + (left - startX) * eased,
            top: startY + (top - startY) * eased,
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

// --- Vimium-style continuous scrolling -------------------------------------
// Ported from Vimium's CoreScroller (content_scripts/scroller.js, MIT):
//  - constant speed instead of an ease-out curve, so motion doesn't "pulse";
//  - while a key is held, one animator keeps scrolling until keyup, and the
//    OS key-repeat events are ignored instead of restarting the animation.
const keyState = { code: null, lastEvent: null, time: 0 };

document.addEventListener('keydown', function(e) {
    keyState.code = e.code;
    if (!e.repeat) keyState.time += 1;
    keyState.lastEvent = e;
}, true);

document.addEventListener('keyup', function(e) {
    if (e.code === keyState.code) {
        keyState.code = null;
        keyState.time += 1;
    }
}, true);

window.addEventListener('blur', function() {
    keyState.code = null;
    keyState.time += 1;
});

function continuousScrollBy(x, y) {
    const horizontal = !y;
    const signed = horizontal ? x : y;
    const amount = Math.abs(signed);
    if (!amount) return;

    // Key repeat: the animator started by the first keydown is still running.
    if (keyState.lastEvent && keyState.lastEvent.repeat) return;

    const sign = Math.sign(signed);
    const activation = ++keyState.time;
    const keyStillDown = function() {
        return keyState.time === activation && keyState.code !== null;
    };

    // Same duration rule as Vimium, with scrollDuration (ms) as the minimum.
    const duration = Math.max(scrollDurationMs(), 20 * Math.log(amount));
    let scrolled = 0;
    let previous = null;

    function frame(timestamp) {
        if (previous === null || timestamp === previous) {
            previous = timestamp;
            window.requestAnimationFrame(frame);
            return;
        }
        const elapsed = timestamp - previous;
        previous = timestamp;

        let delta = Math.ceil(amount * (elapsed / duration));
        if (!keyStillDown()) {
            delta = Math.max(0, Math.min(delta, amount - scrolled));
        }
        if (!delta) return;

        const before = horizontal ? window.scrollX : window.scrollY;
        window.scrollBy({
            left: horizontal ? sign * delta : 0,
            top: horizontal ? 0 : sign * delta,
            behavior: 'instant'
        });
        const after = horizontal ? window.scrollX : window.scrollY;
        if (after === before) return; // reached the edge of the page

        scrolled += delta;
        window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame(frame);
}

function customScrollBy(x, y) {
    if (smoothOn() && scrollDurationMs() > 0) {
        continuousScrollBy(x, y);
        return;
    }
    // Instant jump, or Safari's native smooth scroll when scrollDuration is 0.
    window.scrollBy({ left: x, top: y, behavior: smoothOn() ? 'smooth' : 'instant' });
}

function scrollToPageTop() {
    animateScrollTo(window.scrollX, 0);
}

// G: jump to the bottom. On infinite feeds (YouTube) the page grows after the
// jump, so follow it a few times, stopping early if the user scrolls away.
function scrollToPageBottom() {
    const scroller = document.scrollingElement || document.documentElement;
    const maxFollows = 3;
    let follows = 0;
    let lastHeight = scroller.scrollHeight;

    animateScrollTo(window.scrollX, lastHeight);

    function follow() {
        const height = scroller.scrollHeight;
        const nearBottom = window.scrollY + window.innerHeight >= lastHeight - window.innerHeight;
        if (height > lastHeight && nearBottom && follows < maxFollows) {
            follows += 1;
            lastHeight = height;
            window.scrollTo({ top: height, behavior: 'instant' });
            setTimeout(follow, 800);
        }
    }
    setTimeout(follow, 800);
}
