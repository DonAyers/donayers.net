// Scene time: real time by default, or a preview via ?time=HH:MM (LA local)
// and ?speed=N (time-lapse). [ and ] nudge it by 15 minutes.
import { LOS_ANGELES } from "./sun.ts";

const partsFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: LOS_ANGELES.timeZone,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const displayFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: LOS_ANGELES.timeZone,
  hour: "numeric",
  minute: "2-digit",
});

function laParts(date: Date) {
  const parts = partsFormat.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
}

/** LA's offset from UTC at `date`, in ms (e.g. -7h during daylight time). */
export function laOffset(date: Date): number {
  const p = laParts(date);
  const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return wall - (date.getTime() - date.getMilliseconds());
}

/** The instant that is `hhmm` (e.g. "18:45") on the same LA calendar day as `date`. */
export function laTimeOn(date: Date, hhmm: string): Date | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!match) return null;
  const [hour, minute] = [Number(match[1]), Number(match[2])];
  if (hour > 23 || minute > 59) return null;
  const p = laParts(date);
  return new Date(Date.UTC(p.year, p.month - 1, p.day, hour, minute) - laOffset(date));
}

export function formatLA(date: Date): string {
  return displayFormat.format(date);
}

export class SceneClock {
  /** True when showing anything other than the real current time. */
  preview: boolean;
  private startReal = performance.now();
  private start: number;
  private shift = 0;

  constructor(
    start?: Date,
    private speed = 1,
  ) {
    this.start = start?.getTime() ?? Date.now();
    this.preview = !!start || speed !== 1;
  }

  now(): Date {
    return new Date(this.start + (performance.now() - this.startReal) * this.speed + this.shift);
  }

  nudge(minutes: number) {
    this.shift += minutes * 60_000;
    this.preview = true;
  }

  static fromLocation(search: string): SceneClock {
    const params = new URLSearchParams(search);
    const time = params.get("time");
    const speed = Number(params.get("speed") ?? 1);
    return new SceneClock(time ? (laTimeOn(new Date(), time) ?? undefined) : undefined, speed > 0 ? speed : 1);
  }
}
