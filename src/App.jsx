// src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Users, Trophy, Settings, Lock, Trash2, LogOut } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { doc, onSnapshot, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

import MatchesAdmin from "./MatchesAdmin";
import {
  getRulesOnce, writeRules, subscribeRules,
  getTeamStateOnce, subscribeTeamState, writeTeamState,
  getSharedOnce, writeShared, subscribeShared,
  SHARED_REF
} from "./firestoreConfig";




// ---- Konfig ----
const ADMIN_PASSWORD = "budapest2025";

// Lag per stage (oppdatert liste)
const STAGE_TEAMS = {
  1: [
    "FaZe Clan","GamerLegion","Ninjas in Pyjamas","B8","PARIVISION","Fnatic","Legacy","Imperial",
    "M80","NRG","Fluxo","RED Canids","Lynn Vision","The Huns","FlyQuest","Rare Atom"
  ],
  2: [
    "Aurora","Natus Vincere","Astralis","3DMAX","Team Liquid","MIBR","Passion UA","TYLOO"
  ],
  3: [
    "Team Vitality","Team Spirit","Team Falcons","MOUZ","G2 Esports","FURIA","paiN Gaming","The MongolZ"
  ]
};
const ALL_TEAMS = [...STAGE_TEAMS[1], ...STAGE_TEAMS[2], ...STAGE_TEAMS[3]];

// ---- Helpers ----
//                      ^^^^^^^^^^^^^^^^^^^^^^^  pass på at useState er importert

// ...inne i App-komponenten, nær dei andre state-variablane:
function useLocalStorage(key, init) {
  const [v, setV] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : init; }
    catch { return init; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }, [key, v]);
  return [v, setV];
}
const trioKey = (a,b,c) => [a,b,c].filter(Boolean).map(x=>x.trim()).sort().join("|");
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");
function uniqueId(existing, base){ let id=base, i=1; while(existing.includes(id)) id=base+"_"+(i++); return id; }

const DEFAULT_BASE_RULES = [
  {id:"win",     navn:"Lag vinn ein kamp",              poeng:3,  type:"counter"},
  {id:"lose",    navn:"Lag taper ein kamp",             poeng:0,  type:"counter"},
  {id:"sweep20", navn:"Lag vinn 2–0 (sweep)",           poeng:2,  type:"counter"},
  {id:"sweep02", navn:"Lag taper 0–2 (sweep)",          poeng:-2, type:"counter"},
  {id:"advance", navn:"Lag går vidare til neste stage", poeng:5,  type:"toggle"},
  {id:"playoff", navn:"Lag kjem til playoff",           poeng:5,  type:"toggle"},
  {id:"semi",    navn:"Lag kjem til semifinale",        poeng:3,  type:"toggle"},
  {id:"final",   navn:"Lag kjem til finale",            poeng:5,  type:"toggle"},
  {id:"champ",   navn:"Lag vinn Majoren",               poeng:10, type:"toggle"},
];
const DEFAULT_BONUS_RULES = [
  {id:"underdog_top5", navn:"Underdog-seier mot topp 5", poeng:2,  type:"counter"},
  {id:"overtime",      navn:"Overtime-kamp",             poeng:1,  type:"counter"},
  {id:"all_three_semis", navn:"Alle tre lag i semifinalen (spelar)", poeng:5, type:"toggle"},
  {id:"perfect_run",   navn:"Perfekt run (ingen tap)",   poeng:3,  type:"toggle"},
  {id:"player_injured",navn:"Spelar skadet",             poeng:-3, type:"counter"},
];

function FriendlyIntro({ baseRules = [], bonusRules = [], onStart }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-5 bg-[#0f1b31] ring-1 ring-white/10">
        <h2 className="text-xl font-bold mb-2">Hei! 🤗 Slik funkar Fantasy</h2>
        <ol className="list-decimal ml-5 space-y-2">
          <li><b>Skriv namnet ditt.</b> (Det du vil bli vist som på lista.)</li>
          <li><b>Vel 3 lag</b> – eitt i kvar “Stage”.</li>
          <li><b>Samle poeng</b> når laga dine gjer det bra. Flest poeng = vinnar! 🏆</li>
        </ol>
      </div>

      <div className="rounded-2xl p-5 bg-[#0f1b31] ring-1 ring-white/10">
        <h3 className="text-lg font-semibold mb-2">Korleis får eg poeng?</h3>
        <p className="opacity-80 mb-2">Dette er dei vanlege reglane (enkelt forklart):</p>
        <ul className="list-disc ml-5 space-y-1">
          {baseRules.map(r => (
            <li key={r.id}>
              <b>{r.navn}</b>{' '}
              <span className="opacity-80">
                {r.type === "counter"
                  ? `(+${r.poeng} poeng kvar gong)`
                  : `(+${r.poeng} poeng når dette er på)`}
              </span>
            </li>
          ))}
          {bonusRules.length > 0 && (
            <li className="mt-2"><b>Bonusar</b>: Ekstra poeng for spesielle ting (viss aktivert).</li>
          )}
        </ul>
      </div>

      <div className="rounded-2xl p-5 bg-[#0f1b31] ring-1 ring-white/10">
        <h3 className="text-lg font-semibold mb-2">Kvar ser eg poenga?</h3>
        <ul className="list-disc ml-5 space-y-1">
          <li><b>Leaderboard</b>-fanen viser poeng og plassering.</li>
          <li><b>Admin</b> (for arrangør) oppdaterer resultat pr lag, og då blir poenga rekna om automatisk.</li>
        </ul>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onStart}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90"
        >
          OK, eg er klar – vel lag!
        </button>
        <span className="text-sm opacity-70">Du kan alltid kome tilbake til Intro-fanen.</span>
      </div>
    </div>
  );
}


export default function App() {
  // tabs
  const [tab, setTab] = useLocalStorage("activeTab", "intro");

  // picks & form state
  const [name, setName] = useLocalStorage("name", "");
  const [picks, setPicks] = useLocalStorage("picks", []);
  const [s1, setS1] = useState("");
  const [s2, setS2] = useState("");
  const [s3, setS3] = useState("");

  // admin auth
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem("isAdmin") === "1");

  // team state (synced)
  const [teamState, setTeamState] = useLocalStorage(
    "teamState",
    Object.fromEntries(ALL_TEAMS.map(t => [t, { base:{}, bonus:{} }]))
  );

 // rules (synced)
  const [baseRules, setBaseRules]   = useLocalStorage("baseRules", DEFAULT_BASE_RULES);
  const [bonusRules, setBonusRules] = useLocalStorage("bonusRules", DEFAULT_BONUS_RULES);
  const [bonusActive, setBonusActive] = useLocalStorage("bonusActive", true);


  const [teamDirty, setTeamDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");

  const baseColsArr = baseRules;
  const bonusColsArr = bonusRules;

  // -------------------------
  // Rules sync
  // -------------------------
  useEffect(() => {
    let unsub = null;
    (async () => {
      try {
        const remote = await getRulesOnce();
        if (remote) {
          if (remote.baseRules) setBaseRules(remote.baseRules);
          if (remote.bonusRules) setBonusRules(remote.bonusRules);
          if (typeof remote.bonusActive !== "undefined") setBonusActive(remote.bonusActive);
        } else {
          await writeRules({ baseRules, bonusRules, bonusActive }).catch(()=>{});
        }
      } catch (e) {
        console.warn("getRulesOnce failed:", e);
      }

      try {
        unsub = subscribeRules((data) => {
          if (!data) return;
          if (data.baseRules) setBaseRules(data.baseRules);
          if (data.bonusRules) setBonusRules(data.bonusRules);
          if (typeof data.bonusActive !== "undefined") setBonusActive(data.bonusActive);
        }, (err) => console.error("subscribeRules error:", err));
      } catch (e) {
        console.warn("subscribeRules failed:", e);
      }
    })();
    return () => { if (unsub) unsub(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Write rules back (debounced)
  useEffect(() => {
    let t = setTimeout(async () => {
      try { await writeRules({ baseRules, bonusRules, bonusActive }); } catch (e) { /* ignore */ }
    }, 700);
    return () => clearTimeout(t);
  }, [baseRules, bonusRules, bonusActive]);

  // -------------------------
  // teamState sync
  // -------------------------
  useEffect(() => {
    let unsub = null;
    (async () => {
      try {
        const ts = await getTeamStateOnce();
        if (ts && ts.teams) setTeamState(ts.teams);
      } catch (e) {}
      try {
        unsub = subscribeTeamState((data) => {
          if (!data) return;
          setTeamState(data.teams || {});
        }, (err) => console.error("subscribeTeamState error:", err));
      } catch (e) {}
    })();
    return () => { if (unsub) unsub(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------
  // sharedData/main (users) subscribe via helper
  // -------------------------
  useEffect(() => {
    let unsub = null;
    (async () => {
      try {
        const snap = await getSharedOnce();
        if (snap && Array.isArray(snap.users)) {
          const users = snap.users;
          setPicks(users.map(u => {
            const teams = Array.isArray(u.stageTeams) ? u.stageTeams : [];
            return { name: u.name || "", s1: teams[0] || "", s2: teams[1] || "", s3: teams[2] || "" };
          }));
        }
      } catch (e) {
        console.warn("getSharedOnce failed:", e);
      }

      try {
        unsub = subscribeShared((data) => {
          if (!data) { setPicks([]); return; }
          const users = Array.isArray(data.users) ? data.users : [];
          setPicks(users.map(u => {
            const teams = Array.isArray(u.stageTeams) ? u.stageTeams : [];
            return { name: u.name || "", s1: teams[0] || "", s2: teams[1] || "", s3: teams[2] || "" };
          }));
        }, (err) => console.error("subscribeShared error:", err));
      } catch (e) {}
    })();
    return () => { if (unsub) unsub(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  
  // --- Sync teamState with Firestore ---
  // Subscribe: keep local in sync with server
  useEffect(() => {
    let unsub = null;
    (async () => {
      try {
        unsub = subscribeTeamState((data) => {
          if (data && data.teams) {
            setTeamState(prev => {
              // Avoid clobbering local unsaved edits if identical
              // Merge to preserve structure
              return { ...prev, ...data.teams };
            });
          }
        }, (err) => console.error("subscribeTeamState error:", err));
      } catch (e) {
        console.error("subscribeTeamState init failed", e);
      }
    })();
    return () => { if (unsub) unsub(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save: whenever admin changes teamState, debounce and write to Firestore
 useEffect(() => {
  if (!isAdmin) return;
  if (!teamDirty) return;
  const t = setTimeout(async () => {
    try {
      setSaveStatus("Lagrar…");
      await writeTeamState({ teams: teamState, updatedAt: Date.now() });
      setSaveStatus("Lagra");
      setTeamDirty(false);
      setTimeout(() => setSaveStatus(""), 1000);
    } catch (e) {
      console.error("writeTeamState error", e);
      setSaveStatus("Feil ved lagring");
    }
  }, 400);
  return () => clearTimeout(t);
}, [teamState, teamDirty, isAdmin]);



  // compute points
  const teamPoints = useMemo(() => {
    const baseMap  = Object.fromEntries(baseRules.map(r => [r.id, {p:Number(r.poeng||0), t:r.type}]));
    const bonusMap = Object.fromEntries(bonusRules.map(r => [r.id, {p:Number(r.poeng||0), t:r.type}]));
    const out = {};
    for (const t of ALL_TEAMS) {
      const s = teamState[t] || {base:{}, bonus:{}};
      let p = 0;
      for (const id of Object.keys(baseMap)) {
        const def = baseMap[id]; const v = s.base?.[id];
        if (def.t === "counter") p += Number(v||0) * def.p;
        else                     p += (v?1:0) * def.p;
      }
      if (bonusActive) {
        for (const id of Object.keys(bonusMap)) {
          const def = bonusMap[id]; const v = s.bonus?.[id];
          if (def.t === "counter") p += Number(v||0) * def.p;
          else                     p += (v?1:0) * def.p;
        }
      }
      out[t] = p;
    }
    return out;
  }, [teamState, baseRules, bonusRules, bonusActive]);

  const rows = useMemo(() => {
    return picks.map(p => ({
      ...p,
      points: (teamPoints[p.s1]||0) + (teamPoints[p.s2]||0) + (teamPoints[p.s3]||0),
    })).sort((a,b)=> b.points - a.points || a.name.localeCompare(b.name));
  }, [picks, teamPoints]);

  // ---------- Firestore helpers for shared users ----------
async function addOrUpdateUserFirestore(player) {
  try {
    const snap = await getDoc(SHARED_REF);
    const data = snap.exists() ? snap.data() : { users: [] };
    const users = Array.isArray(data.users) ? data.users : [];

    const existingIndex = users.findIndex(u => u.name === player.name);
    const userObj = {
      id: (existingIndex !== -1 && users[existingIndex].id) ? users[existingIndex].id : Date.now().toString(),
      name: player.name,
      stageTeams: [player.s1, player.s2, player.s3].filter(Boolean),
      score: (users[existingIndex]?.score ?? 0),
      createdAt: existingIndex !== -1 ? users[existingIndex].createdAt : Date.now()
    };

    if (existingIndex !== -1) users[existingIndex] = userObj; else users.push(userObj);

    if (!snap.exists()) await setDoc(SHARED_REF, { users, lastUpdated: Date.now() });
    else await updateDoc(SHARED_REF, { users, lastUpdated: Date.now() });
  } catch (err) {
    console.error("addOrUpdateUserFirestore error:", err);
    throw err;
  }
}


  async function removeUserFromFirestoreByName(nameToRemove) {
    try {
      const snap = await getDoc(SHARED_REF);
      if (!snap.exists()) return;
      const users = Array.isArray(snap.data().users) ? snap.data().users : [];
      const filtered = users.filter(u => u.name !== nameToRemove);
      await updateDoc(SHARED_REF, { users: filtered, lastUpdated: Date.now() });
    } catch (err) {
      console.error("removeUserFromFirestoreByName error:", err);
      throw err;
    }
  }

  // ---------- UI handlers ----------
  async function savePick() {
    if (!name || !s1 || !s2 || !s3) { alert("Fyll ut navn og vel 3 lag"); return; }
    const player = { name, s1, s2, s3 };
    try {
      await addOrUpdateUserFirestore(player);
      setS1(""); setS2(""); setS3("");
    } catch (err) {
      alert("Feil ved lagring til database. Se konsoll.");
    }
  }

  async function deletePlayer(n) {
    const confirmed = window.confirm(`Slett spelar ${n}?`);
    if (!confirmed) return;
    try {
      await removeUserFromFirestoreByName(n);
    } catch (err) {
      alert("Feil ved sletting. Se konsoll.");
    }
  }

function setTeamBase(team, ruleId, value) {
  setTeamState(s => ({
    ...s,
    [team]: {
      ...(s[team] || { base:{}, bonus:{} }),
      base: { ...((s[team]?.base) || {}), [ruleId]: value }
    }
  }));
  setTeamDirty(true);
}

function setTeamBonus(team, ruleId, value) {
  setTeamState(s => ({
    ...s,
    [team]: {
      ...(s[team] || { base:{}, bonus:{} }),
      bonus: { ...((s[team]?.bonus) || {}), [ruleId]: value }
    }
  }));
  setTeamDirty(true);
}


  return (
    <div className="min-h-screen bg-[#0e1625] text-foreground">
      <div className="container py-6">
        <Header totalTeams={ALL_TEAMS.length} participants={rows.length} />

        <div className="mt-4">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="bg-[#152238]">
              <TabsTrigger value="intro">Intro</TabsTrigger>
              <TabsTrigger value="pick">Vel lag</TabsTrigger>
              <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
              <TabsTrigger value="admin">Admin</TabsTrigger>
            </TabsList>

            <TabsContent value="pick">
              <PickTab
                name={name} setName={setName}
                s1={s1} setS1={setS1}
                s2={s2} setS2={setS2}
                s3={s3} setS3={setS3}
                savePick={savePick}
                rows={rows}
              />
            </TabsContent>

            <TabsContent value="leaderboard"><LeaderboardTab rows={rows} /></TabsContent>

            <TabsContent value="intro">
              <IntroTab baseRules={baseRules} bonusRules={bonusRules} />
            </TabsContent>

            <TabsContent value="admin">
              {!isAdmin ? (
                <AdminLogin onLogin={(pwd) => {
                  if (pwd === ADMIN_PASSWORD) { localStorage.setItem("isAdmin", "1"); setIsAdmin(true); }
                }}/>
              ) : (
                <>
                  <AdminTab
                    baseRules={baseRules} setBaseRules={setBaseRules}
                    bonusRules={bonusRules} setBonusRules={setBonusRules}
                    bonusActive={bonusActive} setBonusActive={setBonusActive}
                    teamState={teamState} setTeamBase={setTeamBase} setTeamBonus={setTeamBonus}
                    picks={picks} deletePlayer={deletePlayer}
                    onLogout={() => { localStorage.removeItem("isAdmin"); setIsAdmin(false); }}
                  />
                  <MatchesAdmin allTeams={ALL_TEAMS} />
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

// ---------- UI components below ----------
function Header({ totalTeams, participants }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-4xl font-extrabold">Fantasy CS2 Major</h1>
        <p className="text-sm text-muted-foreground">Enkel vennelag Pick’em – norsk, dynamisk poengsystem</p>
      </div>
      <div className="flex gap-4">
        <Metric label="Lag i systemet" value={totalTeams} />
        <Metric label="Deltakarar" value={participants} />
      </div>
    </div>
  );
}
function Metric({ label, value }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-2 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function PickTab({ name, setName, s1, setS1, s2, setS2, s3, setS3, savePick, rows }) {
  return (
    <>
      <Card className="mt-6">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>Vel lag</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Namnet ditt</Label>
            <Input placeholder="Spelar-namn" value={name} onChange={(e)=>setName(e.target.value)} />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <StageSelect label="Stage 1" value={s1} onChange={setS1} items={STAGE_TEAMS[1]} />
            <StageSelect label="Stage 2" value={s2} onChange={setS2} items={STAGE_TEAMS[2]} />
            <StageSelect label="Stage 3" value={s3} onChange={setS3} items={STAGE_TEAMS[3]} />
          </div>

          <div className="flex gap-2">
            <Button onClick={savePick}>Lagre val</Button>
            <Button onClick={()=>{ setS1(''); setS2(''); setS3(''); }}
              className="bg-secondary text-secondary-foreground hover:opacity-90">
              Reset
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Tips: Du kan redigere valet ditt når som helst – lagre på nytt med same namn.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>Deltakarar</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Spelar</TableHead>
                <TableHead>Stage 1</TableHead>
                <TableHead>Stage 2</TableHead>
                <TableHead>Stage 3</TableHead>
                <TableHead className="text-right">Poeng</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r,i)=>(
                <TableRow key={i}>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{r.s1}</TableCell>
                  <TableCell>{r.s2}</TableCell>
                  <TableCell>{r.s3}</TableCell>
                  <TableCell className="text-right">{r.points}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

function StageSelect({ label, value, onChange, items }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="Vel lag" /></SelectTrigger>
        <SelectContent>
          {items.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function LeaderboardTab({ rows }) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          <CardTitle>Leaderboard</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Spelar</TableHead>
              <TableHead>Poeng</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r,i)=>(
              <TableRow key={r.name}>
                <TableCell>{i+1}</TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.points}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function IntroTab({ baseRules, bonusRules }) {
  return (
    <Card className="mt-6">
      <CardHeader className="pb-0">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-lg font-semibold">Velkommen</h3>
            <p className="text-sm text-muted-foreground mt-1">Fantasy CS2 Major – vennelag Pick’em</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="mt-4">
        <h2 className="text-xl font-semibold mb-2">🎮 Poengoversikt</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-md border bg-muted p-4">
            <h3 className="font-semibold mb-2">Grunnreglar</h3>
            <ul className="list-disc ml-5">
              {baseRules.map(r => (
                <li key={r.id}>{r.navn} — <strong>{r.poeng} poeng</strong> {r.type === "toggle" ? "(Av/På)" : "(Teller)"}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-md border bg-muted p-4">
            <h3 className="font-semibold mb-2">Bonusreglar</h3>
            <ul className="list-disc ml-5">
              {bonusRules.length ? bonusRules.map(r => (
                <li key={r.id}>{r.navn} — <strong>{r.poeng} poeng</strong> {r.type === "toggle" ? "(Av/På)" : "(Teller)"}</li>
              )) : <li>Ingen bonusreglar definert</li>}
            </ul>
          </div>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          Endringar til reglar gjeld for alle og blir lagra i databasen.
        </p>
      </CardContent>
    </Card>
  );
}

// ---------- Admin ----------
function AdminLogin({ onLogin }) {
  const [pwd, setPwd] = useState("");
  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          <CardTitle>Admin – logg inn</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-sm space-y-2">
          <Label>Passord</Label>
          <Input type="password" value={pwd} onChange={(e)=>setPwd(e.target.value)} />
        </div>
        <Button onClick={()=>onLogin(pwd)}>Logg inn</Button>
      </CardContent>
    </Card>
  );
}

function AdminTab({
  baseRules, setBaseRules,
  bonusRules, setBonusRules,
  bonusActive, setBonusActive,
  teamState, setTeamBase, setTeamBonus,
  picks, deletePlayer,
  onLogout
}) {
  // Ny regel/bonus inputs
  const [newBaseName, setNewBaseName] = useState("");
  const [newBasePts,  setNewBasePts]  = useState(1);
  const [newBaseType, setNewBaseType] = useState("counter");

  const [newBonusName, setNewBonusName] = useState("");
  const [newBonusPts,  setNewBonusPts]  = useState(1);
  const [newBonusType, setNewBonusType] = useState("counter");

  function addBase() {
    if (!newBaseName) return;
    const id = uniqueId(baseRules.map(r=>r.id), slug(newBaseName));
    setBaseRules(rs => [...rs, { id, navn:newBaseName, poeng:Number(newBasePts||0), type:newBaseType }]);
    setNewBaseName(""); setNewBasePts(1); setNewBaseType("counter");
  }
  function addBonus() {
    if (!newBonusName) return;
    const id = uniqueId(bonusRules.map(r=>r.id), slug(newBonusName));
    setBonusRules(rs => [...rs, { id, navn:newBonusName, poeng:Number(newBonusPts||0), type:newBonusType }]);
    setNewBonusName(""); setNewBonusPts(1); setNewBonusType("counter");
  }

  function updBase(id, field, val)  { setBaseRules (rs => rs.map(r => r.id===id ? {...r, [field]:val} : r)); }
  function delBase(id)              { setBaseRules (rs => rs.filter(r => r.id!==id)); }
  function updBonus(id, field, val) { setBonusRules(rs => rs.map(r => r.id===id ? {...r, [field]:val} : r)); }
  function delBonus(id)             { setBonusRules(rs => rs.filter(r => r.id!==id)); }

  function resetAll(){
    localStorage.removeItem("baseRules");
    localStorage.removeItem("bonusRules");
    localStorage.removeItem("teamState");
    location.reload();
  }

  const baseColsArr  = baseRules;
  const bonusColsArr = bonusRules;

  return (
    <>
      <div className="flex items-center justify-between mt-6">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Admin</h2>
        </div>
        <Button onClick={onLogout} className="bg-secondary text-secondary-foreground">
          <LogOut className="h-4 w-4 mr-1" /> Logg ut
        </Button>
      </div>

      {/* Reglar */}
      <Card className="mt-4">
        <CardHeader><CardTitle>Reglar</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch checked={!!bonusActive} onCheckedChange={setBonusActive} />
              <span>Bonus aktiv?</span>
            </div>
            <div className="flex items-center gap-2">
  
  <Button
    onClick={async () => {
      try {
        setSaveStatus("Lagrar…");
        await writeTeamState({ teams: teamState, updatedAt: Date.now() });
        setSaveStatus("Lagra");
        setTeamDirty(false);
        setTimeout(() => setSaveStatus(""), 1000);
      } catch {
        setSaveStatus("Feil ved lagring");
      }
    }}
  >
    Lagre no
  </Button>
  <Button onClick={resetAll} className="bg-secondary text-secondary-foreground">Tilbakestill</Button>
</div>
<div>

<Button
  onClick={async () => {
    try {
      setSaveStatus("Lagrar…");
      await writeTeamState({ teams: teamState, updatedAt: Date.now() });
      setSaveStatus("Lagra");
      setTeamDirty(false);
      setTimeout(() => setSaveStatus(""), 1000);
    } catch {
      setSaveStatus("Feil ved lagring");
    }
  }}
>
  Lagre no
</Button>

            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Grunnreglar */}
            <div>
              <h3 className="font-semibold mb-2">Grunnreglar</h3>
              <div className="space-y-2">
                {baseRules.map(r => (
                  <div key={r.id} className="flex flex-wrap items-center gap-2">
                    <Input value={r.navn} onChange={(e)=>updBase(r.id,"navn",e.target.value)} className="min-w-[220px]" />
                    <Select value={r.type} onValueChange={(v)=>updBase(r.id,"type",v)}>
                      <SelectTrigger className="w-28"><SelectValue placeholder="Type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="counter">Teller</SelectItem>
                        <SelectItem value="toggle">Av/På</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="number" className="w-24" value={r.poeng} onChange={(e)=>updBase(r.id,"poeng",Number(e.target.value||0))} />
                    <button className="text-red-400 hover:text-red-500" onClick={()=>delBase(r.id)} title="Slett">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <div className="flex flex-wrap items-end gap-2">
                  <div><Label>Ny regel</Label><Input placeholder="t.d. Lag vinn 2–0" value={newBaseName} onChange={(e)=>setNewBaseName(e.target.value)} /></div>
                  <div><Label>Type</Label>
                    <Select value={newBaseType} onValueChange={setNewBaseType}>
                      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="counter">Teller</SelectItem>
                        <SelectItem value="toggle">Av/På</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Poeng</Label><Input type="number" className="w-24" value={newBasePts} onChange={(e)=>setNewBasePts(e.target.value)} /></div>
                  <Button onClick={addBase}>+ Legg til regel</Button>
                </div>
              </div>
            </div>

            {/* Bonusreglar */}
            <div>
              <h3 className="font-semibold mb-2">Bonusreglar</h3>
              <div className="space-y-2">
                {bonusRules.map(r => (
                  <div key={r.id} className="flex flex-wrap items-center gap-2">
                    <Input value={r.navn} onChange={(e)=>updBonus(r.id,"navn",e.target.value)} className="min-w-[220px]" />
                    <Select value={r.type} onValueChange={(v)=>updBonus(r.id,"type",v)}>
                      <SelectTrigger className="w-28"><SelectValue placeholder="Type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="counter">Teller</SelectItem>
                        <SelectItem value="toggle">Av/På</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="number" className="w-24" value={r.poeng} onChange={(e)=>updBonus(r.id,"poeng",Number(e.target.value||0))} />
                    <button className="text-red-400 hover:text-red-500" onClick={()=>delBonus(r.id)} title="Slett">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <div className="flex flex-wrap items-end gap-2">
                  <div><Label>Ny bonus</Label><Input placeholder="t.d. Underdog mot topp 5" value={newBonusName} onChange={(e)=>setNewBonusName(e.target.value)} /></div>
                  <div><Label>Type</Label>
                    <Select value={newBonusType} onValueChange={setNewBonusType}>
                      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="counter">Teller</SelectItem>
                        <SelectItem value="toggle">Av/På</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Poeng</Label><Input type="number" className="w-24" value={newBonusPts} onChange={(e)=>setNewBonusPts(e.target.value)} /></div>
                  <Button onClick={addBonus}>+ Legg til bonus</Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultat pr lag – horisontal tabell */}
      <Card className="mt-6">
        <CardHeader><CardTitle>Resultat pr lag</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {[1,2,3].map(stage => (
            <div key={stage} className="space-y-2">
              <h3 className="font-semibold">Stage {stage}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2 text-left">Lag</th>
                      {baseColsArr.map(col => (
                        <th key={col.id} className="p-2 text-left">
                          {col.navn} <span className="opacity-60">({col.type==="counter"?"#": "on"})</span>
                        </th>
                      ))}
                      {bonusColsArr.length>0 && (
                        <th className="p-2 text-left">Bonusar</th>
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {STAGE_TEAMS[stage].map(team => {
                      const s = teamState[team] || { base: {}, bonus: {} };
                      const showBonus = bonusRules.length > 0;
                      const remainingCols = baseRules.length + (showBonus ? 1 : 0);

                      return (
                        <React.Fragment key={team}>
                          <tr className="border-b hover:bg-muted/20">
                            <td rowSpan={showBonus ? 2 : 1} className="p-2 align-top font-medium min-w-[140px]">
                              {team}
                            </td>

                            {baseRules.map(col => (
                              <td key={col.id} className="p-1 align-top">
                                {col.type === "counter" ? (
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    step="1"
                                    min="0"
                                    className="w-16 h-7 text-sm rounded-md border border-input bg-background text-foreground px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    value={String(typeof s.base?.[col.id] !== "undefined" ? s.base[col.id] : 0)}
                                    onChange={(e) => {
                                      const parsed = parseInt(e.target.value === "" ? "0" : e.target.value, 10);
                                      setTeamBase(team, col.id, Number.isNaN(parsed) ? 0 : parsed);
                                    }}
                                  />
                                ) : (
                                  <label className="inline-flex items-center gap-2 text-sm">
                                    <input
                                      type="checkbox"
                                      checked={!!s.base?.[col.id]}
                                      onChange={(e) => setTeamBase(team, col.id, e.target.checked)}
                                    />
                                    <span className="text-sm">på</span>
                                  </label>
                                )}
                              </td>
                            ))}

                            {showBonus ? <td className="p-1" /> : null}
                          </tr>

                          {showBonus && (
                            <tr className="border-b">
                              <td colSpan={remainingCols} className="p-2">
                                <div className="flex flex-wrap gap-2">
                                  {bonusRules.map(col => (
                                    <div key={col.id} className="flex items-center gap-2 border rounded px-3 py-2 min-w-[120px]">
                                      <div className="flex-1 text-xs">
                                        <div className="font-medium truncate">{col.navn}</div>
                                        <div className="opacity-60 text-xxs">{col.type === "counter" ? "(#)" : "(on)"}</div>
                                      </div>

                                      {col.type === "counter" ? (
                                        <input
                                          type="number"
                                          inputMode="numeric"
                                          step="1"
                                          min="0"
                                          className="w-14 h-7 text-sm rounded-md border border-input bg-background text-foreground px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                          value={String(typeof s.bonus?.[col.id] !== "undefined" ? s.bonus[col.id] : 0)}
                                          onChange={(e) => {
                                            const parsed = parseInt(e.target.value === "" ? "0" : e.target.value, 10);
                                            setTeamBonus(team, col.id, Number.isNaN(parsed) ? 0 : parsed);
                                          }}
                                        />
                                      ) : (
                                        <label className="inline-flex items-center gap-2">
                                          <input
                                            type="checkbox"
                                            checked={!!s.bonus?.[col.id]}
                                            onChange={(e) => setTeamBonus(team, col.id, e.target.checked)}
                                          />
                                          <span className="text-sm">på</span>
                                        </label>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>

                </table>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Administrer deltakarar */}
      <Card className="mt-6">
        <CardHeader><CardTitle>Administrer deltakarar</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Spelar</TableHead>
                <TableHead>Stage 1</TableHead>
                <TableHead>Stage 2</TableHead>
                <TableHead>Stage 3</TableHead>
                <TableHead className="text-right">Slett</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {picks.map(p => (
                <TableRow key={p.name}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.s1}</TableCell>
                  <TableCell>{p.s2}</TableCell>
                  <TableCell>{p.s3}</TableCell>
                  <TableCell className="text-right">
                    <button className="text-red-400 hover:text-red-500" onClick={()=>deletePlayer(p.name)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
