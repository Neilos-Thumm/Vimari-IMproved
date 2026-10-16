/*
 * Code in this file is taken from sVim, it has been adjusted to
 * work with Vimari.
 * Assumes global variable: settings.
 */

let animationFrame = null; // unused now; kept so nothing else breaks if it references it

// 'instant' overrides a page's `scroll-behavior: smooth` CSS (e.g. nileparun.com);
// 'smooth' hands the animation to Safari's own scroller, which renders content
// as it goes (the old per-frame scrollBy loop left YouTube blank/black).
function scrollBehavior() {
    return (settings && settings.smoothScroll) ? 'smooth' : 'instant';
}

function customScrollBy(x, y) {
    window.scrollBy({ left: x, top: y, behavior: scrollBehavior() });
}

function scrollToPageTop() {
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
}

// G: jump to the bottom. On infinite feeds (YouTube) the page grows after the
// jump, so follow it a few times, stopping early if the user scrolls away.
function scrollToPageBottom() {
    const scroller = document.scrollingElement || document.documentElement;
    const maxFollows = 3;
    let follows = 0;
    let lastHeight = scroller.scrollHeight;

    window.scrollTo({ top: lastHeight, behavior: scrollBehavior() });

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
