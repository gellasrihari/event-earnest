import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Attendly — Attendance Calculator" },
      {
        name: "description",
        content:
          "Calculate attendance percentage across 10 subject timetables, see who is safe, and how many classes you can bunk or must attend.",
      },
      { property: "og:title", content: "Attendly — Attendance Calculator" },
      {
        property: "og:description",
        content:
          "Track attendance across 10 timetables with live percentages and bunk math.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Subject = {
  name: string;
  day: string;
  time: string;
  held: number;
  attended: number;
};

const DEFAULT_SUBJECTS: Subject[] = [
  { name: "Mathematics", day: "Mon", time: "09:00 – 10:00", held: 42, attended: 36 },
  { name: "Physics", day: "Mon", time: "10:00 – 11:00", held: 38, attended: 30 },
  { name: "Chemistry", day: "Tue", time: "09:00 – 10:00", held: 40, attended: 35 },
  { name: "English", day: "Tue", time: "11:00 – 12:00", held: 30, attended: 28 },
  { name: "Computer Science", day: "Wed", time: "09:00 – 11:00", held: 36, attended: 27 },
  { name: "Electronics", day: "Wed", time: "12:00 – 13:00", held: 34, attended: 30 },
  { name: "Statistics", day: "Thu", time: "09:00 – 10:00", held: 28, attended: 21 },
  { name: "Economics", day: "Thu", time: "10:00 – 11:00", held: 26, attended: 24 },
  { name: "Lab — Physics", day: "Fri", time: "09:00 – 11:00", held: 20, attended: 18 },
  { name: "Lab — CS", day: "Fri", time: "11:00 – 13:00", held: 20, attended: 14 },
];

function pct(attended: number, held: number) {
  if (held <= 0) return 0;
  return (attended / held) * 100;
}

function statusOf(p: number, target: number) {
  if (p >= target) return "safe" as const;
  if (p >= target - 10) return "warn" as const;
  return "danger" as const;
}

const statusStyles = {
  safe: "text-safe border-safe/40 bg-safe/10",
  warn: "text-warn border-warn/40 bg-warn/10",
  danger: "text-danger border-danger/40 bg-danger/10",
};

const barStyles = {
  safe: "bg-safe",
  warn: "bg-warn",
  danger: "bg-danger",
};

const statusLabel = { safe: "Safe", warn: "At risk", danger: "Short" };

function Index() {
  const [subjects, setSubjects] = useState<Subject[]>(DEFAULT_SUBJECTS);
  const [target, setTarget] = useState(75);

  const update = (i: number, patch: Partial<Subject>) =>
    setSubjects((s) => s.map((sub, idx) => (idx === i ? { ...sub, ...patch } : sub)));

  const overall = useMemo(() => {
    const held = subjects.reduce((a, s) => a + s.held, 0);
    const attended = subjects.reduce((a, s) => a + s.attended, 0);
    return { held, attended, p: pct(attended, held) };
  }, [subjects]);

  const overallStatus = statusOf(overall.p, target);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-display text-lg font-bold text-primary-foreground">
              A
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Attendly</h1>
              <p className="text-xs text-muted-foreground">Attendance calculator · 10 timetables</p>
            </div>
          </div>
          <label className="flex items-center gap-3 text-sm text-muted-foreground">
            Target %
            <input
              type="number"
              min={1}
              max={100}
              value={target}
              onChange={(e) => setTarget(Math.max(1, Math.min(100, Number(e.target.value) || 75)))}
              className="w-20 rounded-lg border border-input bg-secondary px-3 py-1.5 text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Overall summary */}
        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-6 sm:col-span-2">
            <p className="text-sm text-muted-foreground">Overall attendance</p>
            <div className="mt-2 flex items-end gap-3">
              <span className="font-display text-5xl font-bold tracking-tight">
                {overall.p.toFixed(1)}%
              </span>
              <span
                className={`mb-1.5 rounded-full border px-3 py-0.5 text-xs font-medium ${statusStyles[overallStatus]}`}
              >
                {statusLabel[overallStatus]}
              </span>
            </div>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full rounded-full transition-all ${barStyles[overallStatus]}`}
                style={{ width: `${Math.min(100, overall.p)}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {overall.attended} of {overall.held} classes attended across all 10 timetables.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">Subjects below target</p>
            <p className="mt-2 font-display text-5xl font-bold tracking-tight">
              {subjects.filter((s) => pct(s.attended, s.held) < target).length}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              of {subjects.length} timetables need attention.
            </p>
          </div>
        </section>

        {/* Subject cards */}
        <section className="grid gap-4 md:grid-cols-2">
          {subjects.map((s, i) => {
            const p = pct(s.attended, s.held);
            const st = statusOf(p, target);
            // classes you can still miss while staying >= target
            const canMiss = Math.max(0, Math.floor((s.attended * 100 - target * s.held) / target));
            // classes you must attend (consecutively) to reach target
            const need =
              p >= target
                ? 0
                : Math.ceil((target * s.held - 100 * s.attended) / (100 - target));
            return (
              <div key={i} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <input
                      value={s.name}
                      onChange={(e) => update(i, { name: e.target.value })}
                      className="w-full bg-transparent font-display text-base font-semibold tracking-tight outline-none focus:border-b focus:border-ring"
                    />
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {s.day} · {s.time}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyles[st]}`}
                  >
                    {p.toFixed(1)}%
                  </span>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full rounded-full transition-all ${barStyles[st]}`}
                    style={{ width: `${Math.min(100, p)}%` }}
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <label className="text-xs text-muted-foreground">
                    Classes held
                    <input
                      type="number"
                      min={0}
                      value={s.held}
                      onChange={(e) =>
                        update(i, { held: Math.max(0, Number(e.target.value) || 0) })
                      }
                      className="mt-1 w-full rounded-lg border border-input bg-secondary px-3 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Attended
                    <input
                      type="number"
                      min={0}
                      value={s.attended}
                      onChange={(e) =>
                        update(i, { attended: Math.max(0, Number(e.target.value) || 0) })
                      }
                      className="mt-1 w-full rounded-lg border border-input bg-secondary px-3 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                    />
                  </label>
                </div>

                <p className="mt-3 text-xs text-muted-foreground">
                  {need > 0
                    ? `Attend the next ${need} class${need === 1 ? "" : "es"} to reach ${target}%.`
                    : `You can miss ${canMiss} more class${canMiss === 1 ? "" : "es"} and stay above ${target}%.`}
                </p>
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}
