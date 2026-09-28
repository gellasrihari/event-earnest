import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DAYS, TIMETABLES, subjectCodes } from "@/lib/timetables";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Attendly — SRM Attendance Calculator" },
      {
        name: "description",
        content:
          "Pick your SRM Trichy section timetable, mark classes present or absent, and see attendance and bunk math per subject.",
      },
      { property: "og:title", content: "Attendly — SRM Attendance Calculator" },
      {
        property: "og:description",
        content: "Section timetables with live attendance percentages and bunk math.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Record_ = Record<string, { held: number; attended: number }>;

function pct(a: number, h: number) {
  return h <= 0 ? 0 : (a / h) * 100;
}
function statusOf(p: number, target: number, held: number) {
  if (held === 0 || p >= target) return "safe" as const;
  if (p >= target - 10) return "warn" as const;
  return "danger" as const;
}
const statusStyles = {
  safe: "text-safe border-safe/40 bg-safe/10",
  warn: "text-warn border-warn/40 bg-warn/10",
  danger: "text-danger border-danger/40 bg-danger/10",
};
const barStyles = { safe: "bg-safe", warn: "bg-warn", danger: "bg-danger" };
const statusLabel = { safe: "Safe", warn: "At risk", danger: "Short" };

const inputCls =
  "mt-1 w-full rounded-lg border border-input bg-secondary px-3 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

function roomOf(venue: string) {
  return venue.replace(/\s*·.*$/, "").trim();
}

function Index() {
  const [ttId, setTtId] = useState(TIMETABLES[0]!.id);
  const [target, setTarget] = useState(75);
  const [data, setData] = useState<Record<string, Record_>>({});
  const [loaded, setLoaded] = useState(false);
  const [today, setToday] = useState(0);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("attendly") ?? "{}");
      if (s.data) setData(s.data);
      if (s.ttId) setTtId(s.ttId);
      if (s.target) setTarget(s.target);
    } catch {}
    const d = new Date().getDay();
    setToday(d >= 1 && d <= 5 ? d - 1 : 0);
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem("attendly", JSON.stringify({ data, ttId, target }));
  }, [data, ttId, target, loaded]);

  const tt = TIMETABLES.find((t) => t.id === ttId) ?? TIMETABLES[0]!;
  const subjects = useMemo(() => subjectCodes(tt), [tt]);
  const rec = data[tt.id] ?? {};
  const get = (code: string) => rec[code] ?? { held: 0, attended: 0 };

  const set = (code: string, v: { held: number; attended: number }) =>
    setData((d) => ({
      ...d,
      [tt.id]: { ...(d[tt.id] ?? {}), [code]: { held: v.held, attended: Math.min(v.attended, v.held) } },
    }));

  const markDay = (dayIdx: number, present: boolean) => {
    const counts: Record<string, number> = {};
    tt.grid[dayIdx]!.forEach((c) => c && (counts[c] = (counts[c] ?? 0) + 1));
    setData((d) => {
      const cur = { ...(d[tt.id] ?? {}) };
      for (const [c, n] of Object.entries(counts)) {
        const v = cur[c] ?? { held: 0, attended: 0 };
        cur[c] = { held: v.held + n, attended: v.attended + (present ? n : 0) };
      }
      return { ...d, [tt.id]: cur };
    });
  };

  const overall = subjects.reduce(
    (a, s) => ({ held: a.held + get(s.code).held, attended: a.attended + get(s.code).attended }),
    { held: 0, attended: 0 },
  );
  const overallP = pct(overall.attended, overall.held);
  const overallStatus = statusOf(overallP, target, overall.held);
  const todays = tt.grid[today]!
    .map((c, i) => ({ c, i }))
    .filter((x) => x.c);

  const room = roomOf(tt.venue);

  const warnings = subjects
    .map((s) => {
      const v = get(s.code);
      const p = pct(v.attended, v.held);
      const st = statusOf(p, target, v.held);
      const need = p >= target || v.held === 0 ? 0 : Math.ceil((target * v.held - 100 * v.attended) / (100 - target));
      return { ...s, ...v, p, st, need };
    })
    .filter((s) => s.need > 0)
    .sort((a, b) => b.need - a.need);

  const nextSlot = (code: string) => {
    for (let k = 0; k < 5; k++) {
      const d = (today + k) % 5;
      const idxs = tt.grid[d]!.map((c, i) => ({ c, i })).filter((x) => x.c === code).map((x) => x.i);
      if (idxs.length) return { day: d, idxs };
    }
    return null;
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-display text-lg font-bold text-primary-foreground">
              A
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Attendly</h1>
              <p className="text-xs text-muted-foreground">SRM Trichy · SEEE timetables</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <label className="flex items-center gap-2">
              Section
              <select
                value={ttId}
                onChange={(e) => setTtId(e.target.value)}
                className="rounded-lg border border-input bg-secondary px-3 py-1.5 text-foreground outline-none focus:ring-2 focus:ring-ring"
              >
                {TIMETABLES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              Target %
              <input
                type="number"
                min={1}
                max={99}
                value={target}
                onChange={(e) => setTarget(Math.max(1, Math.min(99, Number(e.target.value) || 75)))}
                className="w-20 rounded-lg border border-input bg-secondary px-3 py-1.5 text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:col-span-2">
            <p className="text-sm text-muted-foreground">
              Overall · {tt.label} · {tt.semester} · Room {room}
            </p>
            <div className="mt-2 flex items-end gap-3">
              <span className="font-display text-5xl font-bold tracking-tight">{overallP.toFixed(1)}%</span>
              <span className={`mb-1.5 rounded-full border px-3 py-0.5 text-xs font-medium ${statusStyles[overallStatus]}`}>
                {statusLabel[overallStatus]}
              </span>
            </div>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-secondary">
              <div className={`h-full rounded-full transition-all ${barStyles[overallStatus]}`} style={{ width: `${Math.min(100, overallP)}%` }} />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {overall.attended} of {overall.held} hours attended.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Mark a day</p>
              <select
                value={today}
                onChange={(e) => setToday(Number(e.target.value))}
                className="rounded-lg border border-input bg-secondary px-2 py-1 text-sm text-foreground"
              >
                {DAYS.map((d, i) => (
                  <option key={d} value={i}>{d}</option>
                ))}
              </select>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {todays.length} hours: {todays.map((x) => x.c).join(", ") || "none"}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => markDay(today, true)} className="rounded-lg border border-safe/40 bg-safe/10 px-3 py-2 text-sm font-medium text-safe hover:bg-safe/20">
                Present all
              </button>
              <button onClick={() => markDay(today, false)} className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm font-medium text-danger hover:bg-danger/20">
                Absent all
              </button>
            </div>
          </div>
        </section>

        <section>
          {overall.held > 0 && overallStatus !== "safe" && (
            <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-medium ${overallStatus === "danger" ? "border-danger/40 bg-danger/10 text-danger" : "border-warn/40 bg-warn/10 text-warn"}`}>
              Overall attendance is {overallP.toFixed(1)}% — below your {target}% target. You need to attend the classes listed below.
            </div>
          )}
          <h2 className="font-display text-lg font-semibold tracking-tight">You need to attend these classes</h2>
          {warnings.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-safe/30 bg-safe/10 px-4 py-3 text-sm font-medium text-safe">
              All caught up — nothing required right now. Keep it up.
            </p>
          ) : (
            <ul className="mt-3 grid gap-3 md:grid-cols-2">
              {warnings.map((w) => {
                const slot = nextSlot(w.code);
                return (
                  <li key={w.code} className="rounded-2xl border border-danger/30 bg-card p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-sm font-semibold tracking-tight">
                          <span className="mr-2 text-primary">{w.code}</span>
                          {w.name}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Attend the next {w.need} to reach {target}% · now at {w.p.toFixed(1)}%
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyles[w.st]}`}>
                        {statusLabel[w.st]}
                      </span>
                    </div>
                    {slot && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-md border border-border bg-secondary px-2 py-1 font-medium text-foreground">
                          {DAYS[slot.day]} · {tt.times[slot.idxs[0]!]}
                          {slot.idxs.length > 1 ? ` +${slot.idxs.length - 1}` : ""}
                        </span>
                        <span className="rounded-md border border-border bg-secondary px-2 py-1 font-medium text-foreground">
                          Room {room}
                        </span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-[720px] text-center text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="p-3 text-left">Day</th>
                {tt.times.map((t, i) => (
                  <th key={i} className="p-3 font-normal">
                    <div className="font-medium text-foreground">{i + 1}</div>
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tt.grid.map((row, d) => (
                <tr key={d} className={`border-t border-border ${d === today ? "bg-accent/50" : ""}`}>
                  <td className="p-3 text-left font-medium">{DAYS[d]}</td>
                  {row.map((c, i) => (
                    <td key={i} className="p-2" title={tt.subjects[c] ?? ""}>
                      {c ? (
                        <span className="inline-block rounded-md bg-primary/15 px-2 py-1 text-xs font-semibold text-primary">{c}</span>
                      ) : (
                        <span className="text-muted-foreground/40">·</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-border px-3 py-2 text-left text-xs text-muted-foreground">
            {room !== tt.venue
              ? `All regular classes for ${tt.label} are in Room ${room} (${tt.venue}).`
              : `All regular classes for ${tt.label} are in Room ${room}.`}
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {subjects.map((s) => {
            const v = get(s.code);
            const p = pct(v.attended, v.held);
            const st = statusOf(p, target, v.held);
            const canMiss = Math.max(0, Math.floor((v.attended * 100 - target * v.held) / target));
            const need = p >= target || v.held === 0 ? 0 : Math.ceil((target * v.held - 100 * v.attended) / (100 - target));
            return (
              <div key={s.code} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-base font-semibold tracking-tight">
                      <span className="mr-2 text-primary">{s.code}</span>
                      {s.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {s.perWeek} {s.perWeek === 1 ? "hour" : "hours"} / week · Room {room}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyles[st]}`}>
                    {p.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
                  <div className={`h-full rounded-full transition-all ${barStyles[st]}`} style={{ width: `${Math.min(100, p)}%` }} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <label className="text-xs text-muted-foreground">
                    Hours held
                    <input type="number" min={0} value={v.held} onChange={(e) => set(s.code, { ...v, held: Math.max(0, Number(e.target.value) || 0) })} className={inputCls} />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Attended
                    <input type="number" min={0} value={v.attended} onChange={(e) => set(s.code, { ...v, attended: Math.max(0, Number(e.target.value) || 0) })} className={inputCls} />
                  </label>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {v.held === 0
                      ? "No classes recorded yet."
                      : need > 0
                        ? `Attend the next ${need} to reach ${target}%.`
                        : `You can miss ${canMiss} and stay at ${target}%.`}
                  </p>
                  <div className="flex shrink-0 gap-1">
                    <button onClick={() => set(s.code, { held: v.held + 1, attended: v.attended + 1 })} className="rounded-md border border-safe/40 px-2 py-1 text-xs text-safe hover:bg-safe/10">+P</button>
                    <button onClick={() => set(s.code, { held: v.held + 1, attended: v.attended })} className="rounded-md border border-danger/40 px-2 py-1 text-xs text-danger hover:bg-danger/10">+A</button>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}
