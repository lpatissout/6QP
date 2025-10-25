/* ==================== CARD ANIMATIONS ==================== */

export function fadeIn(element, duration = 300) {
    element.style.opacity = 0;
    element.style.transition = `opacity ${duration}ms`;
    requestAnimationFrame(() => element.style.opacity = 1);
}

export function moveCard(element, targetX, targetY, duration = 500) {
    element.style.position = 'absolute';
    element.style.transition = `transform ${duration}ms ease-in-out`;
    element.style.transform = `translate(${targetX}px, ${targetY}px)`;
}

export function scaleCard(element, scale = 1.1, duration = 200) {
    element.style.transition = `transform ${duration}ms`;
    element.style.transform = `scale(${scale})`;
}
