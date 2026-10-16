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

function customScrollBy(x, y) {
    // While a scroll is still animating (e.g. holding j), add to where it was
    // heading rather than where it is now, so repeated presses don't lag behind.
    const baseX = pendingTarget ? pendingTarget.x : window.scrollX;
    const baseY = pendingTarget ? pendingTarget.y : window.scrollY;
    animateScrollTo(baseX + x, baseY + y);
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
