/** Footer: 2008-web easter eggs (visitor counter, uptime) + colophon year + log ticker. */
export function initFooter(): void {
  const year = document.querySelector<HTMLElement>('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());

  const up = document.querySelector<HTMLElement>('[data-uptime]');
  if (up) {
    const t0 = Date.now();
    const pad = (n: number): string => String(n).padStart(2, '0');
    window.setInterval(() => {
      const s = Math.floor((Date.now() - t0) / 1000);
      up.textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
    }, 1000);
  }

  // Visitor counter — a 2008 tradition. Numbers lovingly approximate, like they always were.
  const counter = document.querySelector<HTMLElement>('[data-counter]');
  if (counter) {
    let visits = 1;
    try {
      visits = Number(localStorage.getItem('cello_visits') ?? '0') + 1;
      localStorage.setItem('cello_visits', String(visits));
    } catch { /* private mode: everyone is visitor #4213 */ }
    const digits = String(4212 + visits).padStart(6, '0').split('');
    const cells = counter.querySelectorAll('span');
    if (cells.length === digits.length) digits.forEach((d, i) => { cells[i].textContent = d; });
  }

  // Duplicate ticker content once for a seamless -50% translate loop.
  const track = document.querySelector<HTMLElement>('[data-ticker]');
  if (track) track.innerHTML += track.innerHTML;
}
