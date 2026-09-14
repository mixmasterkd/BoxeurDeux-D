export const MARATHON_PRICE = 100;
export const MARATHON_ID = 'montreal';
export const MARATHON_PLACES = Object.freeze(['marathon-island', 'marathon-downtown', 'marathon-oldport', 'marathon-stadium']);
export const MARATHON_START = Object.freeze({ scene: 'marathon-island', x: 930, y: 820, facing: 'up' });
export const freshMarathon = () => ({ entries: 0, nextId: 1, active: null, history: [], medals: [], bestTime: null });
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const count = value => Number.isSafeInteger(value) && value >= 0;
const time = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER;
const requireValue = (condition, message) => { if (!condition) throw new Error(message); };
export function cleanMarathonCheckpoint(value) {
  requireValue(object(value) && MARATHON_PLACES.includes(value.scene) && ['up', 'down', 'left', 'right'].includes(value.facing)
    && ['x', 'y'].every(axis => time(value[axis]) && value[axis] <= 16384), 'Le point de reprise de la course est invalide.');
  return { scene: value.scene, x: value.x, y: value.y, facing: value.facing };
}
export function normalizeMarathon(raw, profile) {
  if (raw.version < 5) return freshMarathon();
  const m = raw.marathon;
  requireValue(object(m) && count(m.entries) && m.entries < Number.MAX_SAFE_INTEGER && m.nextId === m.entries + 1
    && Array.isArray(m.history) && Array.isArray(m.medals)
    && m.entries === m.history.length + Number(m.active !== null), 'L’historique du marathon est invalide.');
  const cleanRun = (run, archived = false) => {
    requireValue(object(run) && count(run.id) && run.id > 0 && run.id <= m.entries && run.fee === MARATHON_PRICE
      && count(run.registeredAtDay) && run.registeredAtDay > 0 && run.registeredAtDay <= profile.daily.day
      && time(run.elapsed) && count(run.stage) && run.stage < MARATHON_PLACES.length
      && typeof run.encounterUsed === 'boolean' && ['none', 'avoided', 'pending', 'won', 'lost'].includes(run.encounter)
      && (run.encounterUsed === (run.encounter !== 'none'))
      && (archived ? ['finished', 'abandoned'] : ['registered', 'running', 'encounter']).includes(run.status), 'La participation au marathon est invalide.');
    const checkpoint = cleanMarathonCheckpoint(run.checkpoint);
    const routePoint = run.routePoint === undefined ? 0 : run.routePoint;
    requireValue(count(routePoint) && routePoint <= 50, 'Le point de passage de la course est invalide.');
    requireValue(run.stage === MARATHON_PLACES.indexOf(checkpoint.scene)
      && (run.status !== 'registered' || run.stage === 0 && routePoint === 0 && run.elapsed === 0 && !run.encounterUsed)
      && (run.status !== 'encounter' || run.encounter === 'pending')
      && (run.encounter !== 'pending' || run.status === 'encounter' || run.status === 'abandoned')
      && (run.status !== 'finished' || run.stage === 3 && run.elapsed > 0), 'La progression du marathon est incohérente.');
    if (archived) requireValue(count(run.finishedAtDay) && run.finishedAtDay >= run.registeredAtDay && run.finishedAtDay <= profile.daily.day, 'La date de course est invalide.');
    return { id: run.id, fee: MARATHON_PRICE, registeredAtDay: run.registeredAtDay, status: run.status, elapsed: run.elapsed,
      stage: run.stage, routePoint, checkpoint, encounterUsed: run.encounterUsed, encounter: run.encounter,
      ...(archived ? { finishedAtDay: run.finishedAtDay } : {}) };
  };
  const history = m.history.map(run => cleanRun(run, true));
  const active = m.active === null ? null : cleanRun(m.active);
  requireValue([...history, ...(active ? [active] : [])].every((run, index) => run.id === index + 1), 'Les inscriptions au marathon sont incohérentes.');
  const finished = history.filter(run => run.status === 'finished');
  const bestTime = finished.length ? Math.min(...finished.map(run => run.elapsed)) : null;
  requireValue(m.bestTime === bestTime && m.medals.length === Number(finished.length > 0)
    && m.medals.every(medal => object(medal) && medal.event === MARATHON_ID && medal.runId === finished[0].id
      && medal.day === finished[0].finishedAtDay), 'La médaille ou le record du marathon est invalide.');
  if (active && active.status !== 'registered') requireValue(!profile.delivery.active && !profile.tournament.active
    && !profile.cuba.active && !profile.mexico.active, 'Une course ne peut pas avoir lieu pendant un autre séjour.');
  return { entries: m.entries, nextId: m.nextId, active, history, medals: m.medals.map(medal => ({ ...medal })), bestTime };
}
