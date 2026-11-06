'use client';
import { useEffect } from 'react';

/** Progressive enhancement: all content remains visible without JavaScript. */
export function PublicMotion() {
  useEffect(() => {
    const root = document.querySelector('.public-site');
    if (!root || !('IntersectionObserver' in window)) return;
    const header = root.querySelector('.site-header');
    const marker = document.createElement('span');
    marker.className = 'header-sentinel';
    root.prepend(marker);
    const sticky = new IntersectionObserver(([entry]) => header?.classList.toggle('is-scrolled', !entry.isIntersecting));
    sticky.observe(marker);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      }
    }), { threshold: .08 });
    const nodes = root.querySelectorAll<HTMLElement>('.section .eyebrow, .section h2, .story-photo, .story p, .service-card, .fleet-card, .map-frame, .network-detail, .contact-links > a, .quick-links > a');
    if (!reduced.matches) nodes.forEach((node, i) => {
      if (node.getBoundingClientRect().top < innerHeight) return;
      node.classList.add('reveal-ready');
      node.style.setProperty('--reveal-delay', `${(i % 3) * 55}ms`);
      observer.observe(node);
    });
    const revealAll = () => nodes.forEach(node => node.classList.add('is-revealed'));
    reduced.addEventListener('change', revealAll);
    return () => { sticky.disconnect(); observer.disconnect(); marker.remove(); nodes.forEach(node => node.classList.remove('reveal-ready')); reduced.removeEventListener('change', revealAll); };
  }, []);
  return null;
}
