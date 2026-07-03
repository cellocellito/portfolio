/** Live HUD readouts: Botucatu local time (nav + hero corners). Updates 1Hz, no tween. */
export function initHud(): void {
  const clocks = document.querySelectorAll<HTMLElement>('[data-clock]');
  if (!clocks.length) return;
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const tick = (): void => {
    const t = fmt.format(new Date());
    clocks.forEach((c) => { c.textContent = t; });
  };
  tick();
  window.setInterval(tick, 1000);
}
