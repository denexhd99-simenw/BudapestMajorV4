// src/MatchesAdmin.jsx
import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

import { addMatchResult, subscribeMatches, getTeamStateOnce, writeTeamState } from "./firestoreConfig";

/*
 MatchesAdmin
 Props:
  - allTeams: array of team names
*/
export default function MatchesAdmin({ allTeams }) {
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [stage, setStage] = useState("group");
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    const unsub = subscribeMatches((arr) => setMatches(arr), (err) => console.error("subscribeMatches:", err));
    return () => { if (unsub) unsub(); };
  }, []);

  async function onSaveResult() {
    if (!teamA || !teamB || teamA === teamB) { alert("Velg to ulike lag"); return; }
    const a = Number(scoreA), b = Number(scoreB);
    const winner = a === b ? null : (a > b ? teamA : teamB);
    const matchObj = { teamA, teamB, scoreA: a, scoreB: b, winner, stage };

    try {
      // 1) lagre match dokument
      await addMatchResult(matchObj);

      // 2) oppdater teamState enkelt: inkrementer base.win for vinner
      const ts = await getTeamStateOnce();
      const current = ts && ts.teams ? ts.teams : {};
      function ensure(t) { if (!current[t]) current[t] = { base: {}, bonus: {} }; }
      ensure(teamA); ensure(teamB);

      if (winner) {
        const prev = Number(current[winner].base?.win || 0);
        current[winner].base = { ...(current[winner].base || {}), win: prev + 1 };
      }

      await writeTeamState({ teams: current, updatedAt: Date.now() });

      // reset form
      setTeamA(""); setTeamB(""); setScoreA(0); setScoreB(0); setStage("group");
      alert("Resultat lagra og teamState oppdatert");
    } catch (err) {
      console.error("Feil ved lagring av match:", err);
      alert("Feil ved lagring. Sjekk konsollen.");
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader><CardTitle>Administrer kampar (Admin)</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label>Lag A</Label>
            <Select value={teamA} onValueChange={setTeamA}>
              <SelectTrigger><SelectValue placeholder="Vel lag" /></SelectTrigger>
              <SelectContent>{allTeams.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div>
            <Label>Lag B</Label>
            <Select value={teamB} onValueChange={setTeamB}>
              <SelectTrigger><SelectValue placeholder="Vel lag" /></SelectTrigger>
              <SelectContent>{allTeams.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div>
            <Label>Stage</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="group">Group</SelectItem>
                <SelectItem value="quarter">Quarter</SelectItem>
                <SelectItem value="semi">Semi</SelectItem>
                <SelectItem value="final">Final</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Score A</Label>
            <Input type="number" value={scoreA} onChange={(e)=>setScoreA(e.target.value)} />
          </div>
          <div>
            <Label>Score B</Label>
            <Input type="number" value={scoreB} onChange={(e)=>setScoreB(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={onSaveResult}>Lagre resultat</Button>
          <Button onClick={() => { setTeamA(""); setTeamB(""); setScoreA(0); setScoreB(0); }}>Reset</Button>
        </div>

        <div>
          <h4 className="font-semibold">Siste kampar</h4>
          <ul className="list-disc ml-5">
            {matches.slice().reverse().slice(0,10).map(m => (
              <li key={m.id}>
                {m.teamA} {m.scoreA} - {m.scoreB} {m.teamB} ({m.stage}) {m.winner ? ` — vinner: ${m.winner}` : "(uavgjort)"}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
