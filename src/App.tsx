import React, { useEffect, useMemo, useState } from "react";

type Workout = { id: string; time: string; text: string };
type Food = { id: string; time: string; text: string };
type DayLog = { workouts: Workout[]; foods: Food[] };
type State = { logs: Record<string, DayLog> };

const KEY = "fitness_jelena_v3";

const pad2 = (n: number) => String(n).padStart(2, "0");
const toISO = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const todayISO = () => toISO(new Date());
const nowHHMM = () => {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};
const uid = () =>
  (typeof crypto !== "undefined" && (crypto as any).randomUUID
    ? (crypto as any).randomUUID()
    : String(Date.now()) + Math.random().toString(16).slice(2));

const MOT = [
  "Ajmo jakoo 🔥 Danas uzmi svojih 10–20 minuta.",
  "Nema filozofije — samo kreni. Prvih 5 minuta otključava ostatak.",
  "Jedan trening = jedna pobjeda. Ajmo jakoo 💪",
  "Ako nemaš volje: napravi minimum. Minimum se računa.",
  "Ne traži motivaciju — napravi akciju. Motivacija dođe poslije.",
  "Danas radiš za sebe. Ajmo jakoo — sad.",
];

function pick(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return MOT[Math.abs(h) % MOT.length];
}

function safeLoad(): State {
  try {
    const raw = localStorage.getItem(KEY);
    const s = raw ? (JSON.parse(raw) as State) : { logs: {} };
    return s?.logs && typeof s.logs === "object" ? s : { logs: {} };
  } catch {
    return { logs: {} };
  }
}

function ensureDay(logs: Record<string, DayLog>, iso: string): DayLog {
  return logs[iso] ?? { workouts: [], foods: [] };
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function streakUpTo(logs: Record<string, DayLog>, upToISO: string) {
  let s = 0;
  let cur = upToISO;
  while (true) {
    const d = logs[cur];
    const has = !!d && ((d.workouts?.length ?? 0) > 0 || (d.foods?.length ?? 0) > 0);
    if (!has) break;
    s += 1;
    const [y, m, day] = cur.split("-").map(Number);
    const prev = new Date(y, m - 1, day);
    prev.setDate(prev.getDate() - 1);
    cur = toISO(prev);
  }
  return s;
}

export default function App() {
  const [state, setState] = useState<State>({ logs: {} });
  const [date, setDate] = useState<string>(todayISO());
  const [tab, setTab] = useState<"dnevnik" | "podrska" | "historija">("dnevnik");

  const [workoutText, setWorkoutText] = useState("");
  const [foodText, setFoodText] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => setState(safeLoad()), []);
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(state)), [state]);

  const day = useMemo(() => ensureDay(state.logs, date), [state.logs, date]);
  const streak = useMemo(() => streakUpTo(state.logs, date), [state.logs, date]);

  const motivation = useMemo(() => {
    const a = pick(date + "-a");
    const b = pick(date + "-b");
    return [a, b];
  }, [date]);

  function upsertDay(updater: (d: DayLog) => DayLog) {
    setState((prev) => {
      const logs = { ...prev.logs };
      logs[date] = updater(ensureDay(logs, date));
      return { ...prev, logs };
    });
  }

  function addWorkout() {
    const t = workoutText.trim();
    if (!t) return;
    const w: Workout = { id: uid(), time: nowHHMM(), text: t };
    upsertDay((d) => ({ ...d, workouts: [w, ...(d.workouts ?? [])] }));
    setWorkoutText("");
  }

  function addFood() {
    const t = foodText.trim();
    if (!t) return;
    const f: Food = { id: uid(), time: nowHHMM(), text: t };
    upsertDay((d) => ({ ...d, foods: [f, ...(d.foods ?? [])] }));
    setFoodText("");
  }

  function delWorkout(id: string) {
    upsertDay((d) => ({ ...d, workouts: (d.workouts ?? []).filter((x) => x.id !== id) }));
  }

  function delFood(id: string) {
    upsertDay((d) => ({ ...d, foods: (d.foods ?? []).filter((x) => x.id !== id) }));
  }

  const history = useMemo(() => {
    const out: Array<{ kind: "workout" | "food"; iso: string; time: string; text: string; id: string }> = [];
    for (const iso of Object.keys(state.logs)) {
      const d = ensureDay(state.logs, iso);
      d.workouts.forEach((w) => out.push({ kind: "workout", iso, time: w.time, text: w.text, id: w.id }));
      d.foods.forEach((f) => out.push({ kind: "food", iso, time: f.time, text: f.text, id: f.id }));
    }
    out.sort((a, b) => (a.iso < b.iso ? 1 : a.iso > b.iso ? -1 : b.time.localeCompare(a.time)));
    const qq = q.trim().toLowerCase();
    return qq ? out.filter((e) => `${e.iso} ${e.kind} ${e.text}`.toLowerCase().includes(qq)) : out;
  }, [state.logs, q]);

  function resetAll() {
    if (!confirm("Sigurno želiš obrisati SVE podatke?")) return;
    setState({ logs: {} });
    setDate(todayISO());
    setTab("dnevnik");
    setWorkoutText("");
    setFoodText("");
    setQ("");
  }

  const card: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,.14)",
    borderRadius: 16,
    padding: 14,
    background: "rgba(255,255,255,.04)",
  };

  const btn: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,.2)",
    borderRadius: 14,
    padding: "10px 12px",
    background: "rgba(255,255,255,.10)",
    color: "white",
    fontWeight: 800,
  };

  const input: React.CSSProperties = {
    width: "100%",
    border: "1px solid rgba(255,255,255,.2)",
    borderRadius: 14,
    padding: "10px 12px",
    background: "rgba(255,255,255,.06)",
    color: "white",
    outline: "none",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0b0b0c", color: "white", padding: 16, fontFamily: "system-ui" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <h2 style={{ margin: 0 }}>Fitness Jelena</h2>
        <div style={{ opacity: 0.8, marginTop: 6 }}>Ajmo jakoo 🔥</div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12, alignItems: "end" }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Datum</div>
            <input style={input} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div style={{ ...card, padding: "10px 12px" }}>
            🔥 Streak: <b>{streak}</b>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {(["dnevnik", "podrska", "historija"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                ...btn,
                background: tab === t ? "rgba(255,255,255,.18)" : "rgba(255,255,255,.10)",
              }}
            >
              {t === "dnevnik" ? "Dnevnik" : t === "podrska" ? "Podrška" : "Historija"}
            </button>
          ))}
        </div>

        {tab === "podrska" ? (
          <div style={{ ...card, marginTop: 14 }}>
            <b>Podrška za danas</b>
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {motivation.map((m, i) => (
                <div key={i} style={{ ...card, background: "rgba(255,255,255,.02)" }}>
                  {m}
                </div>
              ))}
            </div>

            <div style={{ marginTop: 10, opacity: 0.9 }}>
              {day.workouts.length === 0 ? "💥 Mini cilj: 10 minuta kretanja. Ajmo jakoo." : "✅ Trening upisan — drži momentum!"}
            </div>
            <div style={{ marginTop: 6, opacity: 0.9 }}>
              {day.foods.length === 0 ? "🥗 Mini cilj: upiši barem jedan obrok." : "✅ Prehrana upisana — bravo!"}
            </div>
          </div>
        ) : null}

        {tab === "dnevnik" ? (
          <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
            <div style={card}>
              <b>Trening</b>
              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                <input
                  style={input}
                  value={workoutText}
                  onChange={(e) => setWorkoutText(e.target.value)}
                  placeholder="npr. snaga 45 min, kardio 30 min..."
                />
                <button style={btn} onClick={addWorkout}>Dodaj</button>
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {day.workouts.length === 0 ? (
                  <div style={{ opacity: 0.8 }}>Nema unosa. Ajmo jakoo — ubaci bar minimum.</div>
                ) : (
                  day.workouts.map((w) => (
                    <div key={w.id} style={{ ...card, background: "rgba(255,255,255,.02)", display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div><b>{w.text}</b></div>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>{w.time}</div>
                      </div>
                      <button style={btn} onClick={() => delWorkout(w.id)}>🗑</button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={card}>
              <b>Prehrana</b>
              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                <input
                  style={input}
                  value={foodText}
                  onChange={(e) => setFoodText(e.target.value)}
                  placeholder="npr. piletina + riža, salata..."
                />
                <button style={btn} onClick={addFood}>Dodaj</button>
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {day.foods.length === 0 ? (
                  <div style={{ opacity: 0.8 }}>Nema unosa hrane. Upis je info, ne suđenje.</div>
                ) : (
                  day.foods.map((f) => (
                    <div key={f.id} style={{ ...card, background: "rgba(255,255,255,.02)", display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div><b>{f.text}</b></div>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>{f.time}</div>
                      </div>
                      <button style={btn} onClick={() => delFood(f.id)}>🗑</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}

        {tab === "historija" ? (
          <div style={{ ...card, marginTop: 14 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Pretraga</div>
                <input style={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="npr. čučanj, ručak..." />
              </div>
              <button style={btn} onClick={resetAll}>Obriši sve</button>
            </div>

            <div style={{ marginTop: 10, opacity: 0.8 }}>{fmtDate(date)}</div>

            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              {history.length === 0 ? (
                <div style={{ opacity: 0.8 }}>Nema unosa.</div>
              ) : (
                history.slice(0, 200).map((e) => (
                  <div key={e.id} style={{ ...card, background: "rgba(255,255,255,.02)" }}>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>{e.iso} · {e.time} · {e.kind === "workout" ? "Trening" : "Hrana"}</div>
                    <div><b>{e.text}</b></div>
                  </div>
                ))
              )}
              {history.length > 200 ? <div style={{ opacity: 0.8 }}>Prikazujem prvih 200 — suzi pretragu.</div> : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
