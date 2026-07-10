// src/screens/ClientDashboardScreen.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function ClientDashboardScreen({ trees, quests }) {
  const [sessions, setSessions] = useState([]); 
  const [selectedSession, setSelectedSession] = useState(() => {
    const saved = sessionStorage.getItem('drh_selected_session');
    return saved ? JSON.parse(saved) : null;
  }); 
  const [sessionStudents, setSessionStudents] = useState([]); 
  const [allProductions, setAllProductions] = useState([]); 
  const [loading, setLoading] = useState(true);

  // ÉTATS DES FILTRES PERSISTANTS (Anti-reset au changement d'onglet / Alt+Tab)
  const [selectedStudents, setSelectedStudents] = useState(() => {
    const saved = sessionStorage.getItem('drh_filter_students');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedQuests, setSelectedQuests] = useState(() => {
    const saved = sessionStorage.getItem('drh_filter_quests');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    sessionStorage.setItem('drh_filter_students', JSON.stringify(selectedStudents));
  }, [selectedStudents]);

  useEffect(() => {
    sessionStorage.setItem('drh_filter_quests', JSON.stringify(selectedQuests));
  }, [selectedQuests]);

  useEffect(() => {
    if (selectedSession) {
      sessionStorage.setItem('drh_selected_session', JSON.stringify(selectedSession));
    }
  }, [selectedSession]);

  useEffect(() => {
    const fetchHRData = async () => {
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (!authSession) return;

        const hrUserId = authSession.user.id;

        const { data: sessionsData, error: sessionsError } = await supabase
          .from('sessions')
          .select('*')
          .contains('drh_ids', JSON.stringify([hrUserId])); 

        if (sessionsError) throw sessionsError;
        setSessions(sessionsData || []);

        if (sessionsData && sessionsData.length > 0 && !selectedSession) {
          setSelectedSession(sessionsData[0]);
        }

        const { data: prods, error: prodsError } = await supabase
          .from('productions')
          .select('*')
          .order('created_at', { ascending: false });

        if (prodsError) throw prodsError;

        if (prods) {
          const formatted = prods.map(p => ({
            id: p.id,
            studentId: p.student_id,
            studentEmail: p.student_email,
            questId: p.quest_id,
            questName: p.quest_name,
            content: p.content,
            file_url: p.file_url,
            date: new Date(p.created_at).toLocaleDateString('fr-FR')
          }));
          setAllProductions(formatted);
        }
      } catch (err) {
        console.error("Erreur lors du chargement des données DRH:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHRData();
  }, []);

  useEffect(() => {
    if (!selectedSession || !selectedSession.session_code) {
      setSessionStudents([]);
      return;
    }

    const fetchStudentsProfiles = async () => {
      try {
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, email')
          .contains('session_codes', JSON.stringify([selectedSession.session_code]));

        if (error) throw error;

        if (profiles) {
          const formattedStudents = profiles.map(p => {
            const savedFloor = localStorage.getItem(`ecolearn_floor_${p.id}_${selectedSession.tree_id}`);
            const maxFloor = savedFloor ? parseInt(savedFloor, 10) + 1 : 1;

            return {
              uid: p.id,
              name: p.email ? p.email.split('@')[0] : "Apprenant",
              email: p.email,
              maxFloor: maxFloor
            };
          });
          setSessionStudents(formattedStudents);
        }
      } catch (err) {
        console.error("Erreur lors de la récupération automatique des étudiants :", err);
      }
    };

    fetchStudentsProfiles();
  }, [selectedSession]);

  const handleSessionChange = (e) => {
    const sessionDocId = e.target.value;
    const found = sessions.find(s => String(s.id) === String(sessionDocId));
    if (found) {
      setSelectedSession(found);
      setSelectedStudents([]);
      setSelectedQuests([]);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-8 py-8 text-center text-xs font-mono text-slate-400">
        Chargement des données d'audit...
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-8 py-12 text-center bg-white border rounded-2xl shadow-sm">
        <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider">Aucune session affectée</h2>
        <p className="text-xs text-slate-400 mt-1">Votre compte n'est pas déclaré comme DRH sur une session active.</p>
      </div>
    );
  }

  const currentSessionSafe = selectedSession || sessions[0];
  const studentIdsInCurrentSession = sessionStudents.map(s => s.uid);

  const filteredProductions = allProductions.filter(p => {
    const isInSession = studentIdsInCurrentSession.includes(p.studentId);
    if (!isInSession) return false;

    const matchesStudentFilter = selectedStudents.length === 0 || selectedStudents.some(s => s.uid === p.studentId);
    const matchesQuestFilter = selectedQuests.length === 0 || selectedQuests.some(q => q.id === p.questId);

    return matchesStudentFilter && matchesQuestFilter;
  });

  const uniqueProductionsGlobal = filteredProductions.filter(p => !p.content?.startsWith("[Importé"));
  
  const questsList = quests || [];
  const getPointsByDifficulty = (diff) => {
    const d = parseInt(diff, 10);
    if (d === 3) return 500;
    if (d === 2) return 250;
    return 100;
  };

  let totalXP = 0;
  const studentsProgress = sessionStudents.map(student => {
    const studentProds = filteredProductions.filter(p => p.studentId === student.uid);
    const studentUniqueProds = studentProds.filter(p => !p.content?.startsWith("[Importé"));

    const studentPoints = studentProds.reduce((sum, prod) => {
      const originalQuest = questsList.find(q => q.id === prod.questId);
      return sum + (originalQuest ? getPointsByDifficulty(originalQuest.difficulty) : 100);
    }, 0);
    
    totalXP += studentPoints;

    return {
      ...student,
      xp: studentPoints,
      livrablesCount: studentUniqueProds.length
    };
  });

  const totalStudents = sessionStudents.length;
  const activeStudentsCount = studentsProgress.filter(s => s.livrablesCount > 0).length;
  const engagementRate = totalStudents > 0 ? Math.round((activeStudentsCount / totalStudents) * 100) : 0;

  // TRIS DES ENSEMBLES DE RECHERCHE RESTANTS
  const availableStudents = sortedStudentsOptions = [...sessionStudents]
    .sort((a, b) => b.maxFloor - a.maxFloor)
    .filter(st => !selectedStudents.some(sel => sel.uid === st.uid));

  const availableQuests = sortedQuestsOptions = [...questsList]
    .sort((a, b) => parseInt(a.difficulty, 10) - parseInt(b.difficulty, 10))
    .filter(q => !selectedQuests.some(sel => sel.id === q.id));

  // FONCTIONS DE SELECTION
  const addStudentFilter = (uid) => {
    if (!uid) return;
    const match = sessionStudents.find(s => s.uid === uid);
    if (match && !selectedStudents.some(s => s.uid === uid)) {
      setSelectedStudents([...selectedStudents, match]);
    }
  };

  const removeStudentFilter = (uid) => {
    setSelectedStudents(selectedStudents.filter(s => s.uid !== uid));
  };

  const addQuestFilter = (id) => {
    if (!id) return;
    const match = questsList.find(q => q.id === id);
    if (match && !selectedQuests.some(q => q.id === id)) {
      setSelectedQuests([...selectedQuests, match]);
    }
  };

  const removeQuestFilter = (id) => {
    setSelectedQuests(selectedQuests.filter(q => q.id !== id));
  };

  return (
    <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">
      
      {/* SELECTION COHORTE */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <label className="text-xs font-black text-slate-700 uppercase tracking-wider whitespace-nowrap">
            📂 Sélectionner la cohorte :
          </label>
          <select 
            value={String(currentSessionSafe.id || '')} 
            onChange={handleSessionChange}
            className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-purple-500 shadow-sm min-w-[220px] cursor-pointer"
          >
            {sessions.map(s => (
              <option key={String(s.id)} value={String(s.id)}>
                📍 {s.name || `Session — ${s.session_code}`}
              </option>
            ))}
          </select>
        </div>
        <div className="text-[11px] font-medium text-slate-400">
          Supervision de <strong className="text-slate-600">{sessions.length} session(s)</strong> actives rattachées
        </div>
      </div>

      {/* BANNIÈRE */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 rounded-2xl flex flex-wrap justify-between items-center gap-4 shadow-md">
        <div className="space-y-1">
          <div className="text-[10px] uppercase font-black tracking-wider text-emerald-400">Suivi d'Acculturation Entreprise</div>
          <h2 className="text-lg font-black tracking-tight">
            Portail Décideur & RH — {currentSessionSafe.name || 'Ma Session'}
          </h2>
          <p className="text-xs text-slate-300">
            Code d'arrimage : <span className="font-mono text-emerald-400 font-bold bg-slate-800 px-2 py-0.5 rounded">{currentSessionSafe.session_code || 'N/A'}</span> | {totalStudents} collaborateur(s) inscrit(s).
          </p>
        </div>
        <button 
          onClick={() => alert(`📊 Génération du rapport de suivi...`)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
        >
          📥 Télécharger le rapport (.xlsx)
        </button>
      </div>

      {/* BLOC DE TRI DOUBLE COLONNES */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="text-[11px] font-black uppercase text-slate-500 tracking-wider">🎛️ Centre de Tri Avancé</div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* COLONNE FILTRE ÉTUDIANT */}
          <div className="flex flex-col justify-between space-y-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Filtrer par Collaborateur :</label>
              
              {/* Tags au-dessus du sélecteur */}
              <div className="flex flex-wrap gap-1.5 min-h-[32px] pb-1">
                {selectedStudents.map(st => (
                  <span key={st.uid} className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    👤 {st.name}
                    <button onClick={() => removeStudentFilter(st.uid)} className="hover:text-blue-900 font-black ml-0.5 cursor-pointer">✕</button>
                  </span>
                ))}
              </div>
            </div>

            <select
              value=""
              onChange={(e) => { addStudentFilter(e.target.value); e.target.value = ""; }}
              className="w-full bg-white border border-slate-200 text-xs rounded-xl p-2.5 outline-none font-semibold text-slate-700 shadow-sm cursor-pointer"
            >
              <option value="" disabled>✨ Choisir un collaborateur...</option>
              {availableStudents.map((st, index) => {
                const items = [];
                // Séparateur numérique imbriqué dans le flux continu au changement de Palier
                if (index === 0 || st.maxFloor !== availableStudents[index - 1].maxFloor) {
                  items.push(
                    <option key={`sep-floor-${st.maxFloor}`} disabled className="bg-slate-100 text-slate-500 font-bold text-[10px] py-1">
                      ── Palier {st.maxFloor} ──
                    </option>
                  );
                }
                items.push(
                  <option key={st.uid} value={st.uid}>
                    {st.email}
                  </option>
                );
                return items;
              })}
            </select>
          </div>

          {/* COLONNE FILTRE QUÊTES */}
          <div className="flex flex-col justify-between space-y-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Filtrer par Quête :</label>
              
              {/* Tags au-dessus du sélecteur */}
              <div className="flex flex-wrap gap-1.5 min-h-[32px] pb-1">
                {selectedQuests.map(q => (
                  <span key={q.id} className="inline-flex items-center gap-1 bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    🎯 {q.name}
                    <button onClick={() => removeQuestFilter(q.id)} className="hover:text-purple-900 font-black ml-0.5 cursor-pointer">✕</button>
                  </span>
                ))}
              </div>
            </div>

            <select
              value=""
              onChange={(e) => { addQuestFilter(e.target.value); e.target.value = ""; }}
              className="w-full bg-white border border-slate-200 text-xs rounded-xl p-2.5 outline-none font-semibold text-slate-700 shadow-sm cursor-pointer"
            >
              <option value="" disabled>✨ Choisir une quête...</option>
              {availableQuests.map((q, index) => {
                const items = [];
                const diff = parseInt(q.difficulty, 10);
                // Séparateur numérique imbriqué dans le flux continu au changement de Difficulté
                if (index === 0 || diff !== parseInt(availableQuests[index - 1].difficulty, 10)) {
                  items.push(
                    <option key={`sep-diff-${diff}`} disabled className="bg-slate-100 text-slate-500 font-bold text-[10px] py-1">
                      ── Difficulté {diff}★ ──
                    </option>
                  );
                }
                items.push(
                  <option key={q.id} value={q.id}>
                    {q.name}
                  </option>
                );
                return items;
              })}
            </select>
          </div>

        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-1">
          <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Compteur de Compétences</div>
          <div className="text-3xl font-black text-slate-900">{totalXP} <span className="text-xs font-bold text-slate-400">XP</span></div>
          <p className="text-[11px] text-slate-500 font-medium">Somme pondérée des quêtes isolées.</p>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-1">
          <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Cas Pratiques Trouvés</div>
          <div className="text-3xl font-black text-emerald-600">{uniqueProductionsGlobal.length} <span className="text-xs font-bold text-slate-400">Rendus</span></div>
          <p className="text-[11px] text-slate-500 font-medium">Preuves concrètes filtrées ci-dessous.</p>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-1">
          <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Taux de Participation Ciblé</div>
          <div className="text-3xl font-black text-purple-600">{engagementRate}%</div>
          <p className="text-[11px] text-slate-500 font-medium">Collaborateurs répondant aux filtres définis.</p>
        </div>
      </div>

      {/* TABLEAU SYNTHÈSE COHORTE */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">👥 Avancement de la Cohorte ({totalStudents})</h3>
        {totalStudents === 0 ? (
          <div className="text-center p-8 text-xs text-slate-400 italic">Aucun collaborateur trouvé.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 font-bold uppercase border-b pb-2">
                  <th className="pb-2">Collaborateur</th>
                  <th className="pb-2">Dernier Niveau Connu</th>
                  <th className="pb-2">Livrables (sélection)</th>
                  <th className="pb-2 text-right">XP générée</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentsProgress.map(student => (
                  <tr key={student.uid} className="hover:bg-slate-50/60">
                    <td className="py-3 font-black text-slate-800">
                      <div>{student.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{student.email}</div>
                    </td>
                    <td className="py-3">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold font-mono text-[10px]">Palier {student.maxFloor}</span>
                    </td>
                    <td className="py-3 text-slate-500 font-semibold">{student.livrablesCount} dépôt(s)</td>
                    <td className="py-3 text-right font-black text-emerald-600">{student.xp} XP</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* REGISTRE DES RENDUS */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">📂 Registre d'audit des Livrables correspondants</h3>
        
        {uniqueProductionsGlobal.length === 0 ? (
          <div className="text-center p-12 text-xs text-slate-400 font-medium italic bg-slate-50 rounded-xl border border-dashed">
            Aucun livrable ne correspond aux filtres appliqués pour cette cohorte.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {uniqueProductionsGlobal.map(prod => {
              const linkedQuest = questsList.find(q => q.id === prod.questId);
              const stars = linkedQuest ? `${linkedQuest.difficulty}★` : '';

              return (
                <div key={prod.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between gap-3 relative overflow-hidden shadow-sm">
                  <div className="absolute top-0 bottom-0 left-0 w-1 bg-emerald-500" />
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                      <span>
                        👤 {sessionStudents.find(s => s.uid === prod.studentId)?.name || prod.studentEmail || "Anonyme"}
                        {prod.file_url && (
                          <a 
                            href={prod.file_url} 
                            download={`Livrable_${prod.id}`}
                            className="ml-2 inline-flex items-center text-purple-600 hover:text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded font-mono font-bold text-[9px] border border-purple-100 transition-all cursor-pointer"
                          >
                            📄 doc joint
                          </a>
                        )}
                      </span>
                      <span className="font-mono">{prod.date}</span>
                    </div>
                    <h4 className="font-bold text-xs text-slate-800 pt-1">🎯 Quête : {prod.questName} <span className="text-amber-500 text-[10px] ml-1">{stars}</span></h4>
                    <p className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border leading-relaxed font-medium italic">"{prod.content}"</p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                    <span>Réf : DRH-SESS-{String(currentSessionSafe.id).substring(0, 5).toUpperCase()}</span>
                    <span className="text-emerald-600 font-extrabold">✓ Livrable Archivé</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
