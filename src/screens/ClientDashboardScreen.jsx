// src/screens/ClientDashboardScreen.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function ClientDashboardScreen({ trees = [], quests = [] }) {
  const [sessions, setSessions] = useState([]); 
  const [selectedSession, setSelectedSession] = useState(() => {
    try {
      const saved = sessionStorage.getItem('drh_selected_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }); 
  const [sessionStudents, setSessionStudents] = useState([]); 
  const [sessionQuests, setSessionQuests] = useState([]); 
  const [allProductions, setAllProductions] = useState([]); 
  const [loading, setLoading] = useState(true);

  // FILTRES DRH PERSISTANTS
  const [selectedStudents, setSelectedStudents] = useState(() => {
    try {
      const saved = sessionStorage.getItem('drh_filter_students');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedQuests, setSelectedQuests] = useState(() => {
    try {
      const saved = sessionStorage.getItem('drh_filter_quests');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // FONCTION DE CHANGEMENT DE SESSION
  const handleSessionChange = (e) => {
    const sessionDocId = e.target.value;
    const found = sessions.find(s => String(s.id) === String(sessionDocId));
    if (found) {
      setSelectedSession(found);
      setSelectedStudents([]);
      setSelectedQuests([]);
    }
  };

  // SECURITÉ ANTI-FANTÔME
  const isSelectedSessionValid = selectedSession && sessions.some(s => String(s.id) === String(selectedSession.id));
  const currentSessionSafe = isSelectedSessionValid ? selectedSession : (sessions[0] || null);

  useEffect(() => {
    sessionStorage.setItem('drh_filter_students', JSON.stringify(selectedStudents));
  }, [selectedStudents]);

  useEffect(() => {
    sessionStorage.setItem('drh_filter_quests', JSON.stringify(selectedQuests));
  }, [selectedQuests]);

  useEffect(() => {
    if (currentSessionSafe) {
      sessionStorage.setItem('drh_selected_session', JSON.stringify(currentSessionSafe));
    } else {
      sessionStorage.removeItem('drh_selected_session');
    }
  }, [currentSessionSafe]);

  // 1. CHARGEMENT INITIAL DES SESSIONS ASSOCIÉES AU MANAGER / DRH
  useEffect(() => {
    const initializeDRHData = async () => {
      try {
        setLoading(true);
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        const hrUserId = authUser.id;

        const { data: fetchedSessions, error: sError } = await supabase
          .from('sessions')
          .select('*')
          .contains('drh_ids', JSON.stringify([hrUserId]));

        if (sError) throw sError;

        if (fetchedSessions && fetchedSessions.length > 0) {
          setSessions(fetchedSessions);
          const stillValid = fetchedSessions.find(s => String(s.id) === String(selectedSession?.id));
          if (!stillValid) {
            setSelectedSession(fetchedSessions[0]);
          }
        } else {
          setSessions([]);
          setSelectedSession(null);
        }

        const { data: fetchedProductions, error: pError } = await supabase
          .from('productions')
          .select('*')
          .order('id', { ascending: false });

        if (pError) throw pError;
        if (fetchedProductions) setAllProductions(fetchedProductions);

      } catch (err) {
        console.error("Erreur d'initialisation du tableau de bord client :", err);
      } finally {
        setLoading(false);
      }
    };

    initializeDRHData();
  }, []); 

  // 2. EXTRACTION DYNAMIQUE DES QUÊTES ET DES APPRENANTS
  useEffect(() => {
    if (!currentSessionSafe) {
      setSessionStudents([]);
      setSessionQuests([]);
      return;
    }

    const fetchCohortContext = async () => {
      // --- PARTIE A : CHARGEMENT ISOLE DES COLLABORATEURS ---
      try {
        if (currentSessionSafe.session_code) {
          const { data: profiles, error: pError } = await supabase
            .from('profiles')
            .select('id, email')
            .contains('session_codes', JSON.stringify([currentSessionSafe.session_code]));

          if (pError) throw pError;

          if (profiles) {
            const formattedStudents = profiles.map(p => {
              const savedFloor = localStorage.getItem(`ecolearn_floor_${p.id}_${currentSessionSafe.tree_id}`);
              const maxFloor = savedFloor ? parseInt(savedFloor, 10) + 1 : 1;
              
              return {
                uid: p.id,
                name: p.email ? p.email.split('@')[0] : "Apprenant",
                email: p.email,
                maxFloor: maxFloor
              };
            });
            setSessionStudents(formattedStudents);
          } else {
            setSessionStudents([]);
          }
        } else {
          setSessionStudents([]);
        }
      } catch (err) {
        console.error("Erreur lors du chargement des profils collaborateurs :", err);
        setSessionStudents([]);
      }

      // --- PARTIE B : CHARGEMENT ISOLE ET COMPATIBLE UUID DES QUETES VIA L'ARBRE ---
      try {
        if (currentSessionSafe.tree_id) {
          const { data: treeData, error: tError } = await supabase
            .from('trees')
            .select('floors')
            .eq('id', currentSessionSafe.tree_id)
            .single();

          if (!tError && treeData && treeData.floors) {
            const extractedQuestIds = [];
            const floorsObj = typeof treeData.floors === 'string' ? JSON.parse(treeData.floors) : treeData.floors;
            
            if (Array.isArray(floorsObj)) {
              floorsObj.forEach(floor => {
                if (floor && floor.quests && Array.isArray(floor.quests)) {
                  floor.quests.forEach(qId => {
                    // SÉCURITÉ : On garde la valeur brute textuelle/UUID sans forcer Number()
                    if (qId !== undefined && qId !== null && String(qId).trim() !== "") {
                      extractedQuestIds.push(String(qId));
                    }
                  });
                }
              });
            } else if (typeof floorsObj === 'object' && floorsObj !== null) {
              Object.values(floorsObj).forEach(floor => {
                if (floor && Array.isArray(floor.quests)) {
                  floor.quests.forEach(qId => {
                    if (qId !== undefined && qId !== null && String(qId).trim() !== "") {
                      extractedQuestIds.push(String(qId));
                    }
                  });
                }
              });
            }

            if (extractedQuestIds.length > 0) {
              const uniqueQuestIds = [...new Set(extractedQuestIds)];

              const { data: fetchedQuests, error: qError } = await supabase
                .from('quests')
                .select('*')
                .in('id', uniqueQuestIds); // Plus aucun risque de NaN ici

              if (qError) throw qError;
              if (fetchedQuests) {
                setSessionQuests(fetchedQuests);
                return;
              }
            }
          }
        }
        setSessionQuests([]);
      } catch (err) {
        console.error("Erreur lors de l'extraction des quêtes depuis l'arbre :", err);
        setSessionQuests([]);
      }
    };

    fetchCohortContext();
  }, [currentSessionSafe?.id, currentSessionSafe?.session_code, currentSessionSafe?.tree_id]);

  // PROTECTION DE CHARGEMENT DE SÉCURITÉ
  if (loading) {
    return <div className="max-w-7xl mx-auto px-8 py-8 text-center text-xs font-mono text-slate-400">Chargement de l'espace de pilotage...</div>;
  }

  // 3. LOGIQUE DES FILTRES ET DES CALCULS KPI
  const studentIdsInCurrentSession = sessionStudents.map(s => s.uid);
  const sessionQuestIdsOnly = sessionQuests.map(q => q.id);

  const activeSelectedStudents = selectedStudents.filter(s => studentIdsInCurrentSession.includes(s.uid));
  const activeSelectedQuests = selectedQuests.filter(q => sessionQuestIdsOnly.includes(q.id));

  const filteredProductions = allProductions.filter(p => {
    if (!p || !currentSessionSafe) return false;

    const isStudentInSession = studentIdsInCurrentSession.includes(p.studentId);
    const matchesSessionCode = p.session_code === currentSessionSafe.session_code;

    if (!isStudentInSession || !matchesSessionCode) return false;

    if (activeSelectedStudents.length === 0 || activeSelectedQuests.length === 0) {
      return false;
    }

    const matchesStudentFilter = activeSelectedStudents.some(s => s.uid === p.studentId);
    const matchesQuestFilter = activeSelectedQuests.some(q => q.id === p.questId);

    return matchesStudentFilter && matchesQuestFilter;
  });

  const uniqueProductionsGlobal = filteredProductions.filter(p => !p.content?.startsWith("[Importé"));
  
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
      const originalQuest = sessionQuests.find(q => q.id === prod.questId);
      if (originalQuest) return sum + getPointsByDifficulty(originalQuest.difficulty);
      return sum + 100;
    }, 0);

    if (activeSelectedStudents.some(s => s.uid === student.uid)) {
      totalXP += studentPoints;
    }

    return {
      ...student,
      xp: studentPoints,
      livrablesCount: studentUniqueProds.length
    };
  });

  const totalStudents = sessionStudents.length;
  const countPalier1 = studentsProgress.filter(s => s.maxFloor >= 1).length;
  const countPalier2 = studentsProgress.filter(s => s.maxFloor >= 2).length;

  const pctPalier1 = totalStudents > 0 ? Math.round((countPalier1 / totalStudents) * 100) : 0;
  const pctPalier2 = totalStudents > 0 ? Math.round((countPalier2 / totalStudents) * 100) : 0;

  const activeStudentsCount = studentsProgress.filter(s => s.livrablesCount > 0).length;
  const engagementRate = totalStudents > 0 ? Math.round((activeStudentsCount / totalStudents) * 100) : 0;

  const availableStudents = [...sessionStudents].filter(st => !activeSelectedStudents.some(sel => sel.uid === st.uid));
  const availableQuests = [...sessionQuests].filter(q => !activeSelectedQuests.some(sel => sel.id === q.id));

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6 text-slate-800 antialiased">
      
      {/* SECTION BANNIÈRE DU HAUT */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-2">
            <span>💼</span> Espace Superviseur & Pilotage RH
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">Vue globale des performances de vos cohortes en temps réel.</p>
        </div>
        
        {/* SÉLECTEUR DE COHORTE */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-black uppercase text-slate-400 whitespace-nowrap">Sélectionner la cohorte :</label>
          <select 
            value={currentSessionSafe?.id || ""} 
            onChange={handleSessionChange}
            className="bg-white border rounded-xl px-3 py-2 text-xs font-bold text-slate-800 shadow-sm outline-none cursor-pointer border-slate-200 hover:border-slate-300"
          >
            {sessions.length === 0 ? (
              <option value="" disabled>Aucune session assignée</option>
            ) : (
              sessions.map(s => (
                <option key={s.id} value={s.id}>📈 {s.session_code}</option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* COMPOSANT INTRODUCTIF SANS SESSION */}
      {!currentSessionSafe && (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed text-xs font-mono text-slate-400">
          Aucun espace de session actif configuré pour votre profil d'audit.
        </div>
      )}

      {currentSessionSafe && (
        <>
          {/* COMPTEURS ET INDICES DE PERFORMANCE (KPI) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border rounded-2xl p-4 shadow-sm space-y-1 relative overflow-hidden">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">👥 Effectif total</div>
              <div className="text-2xl font-black text-slate-900">{totalStudents} <span className="text-[11px] font-mono text-slate-400 font-normal">collaborateurs</span></div>
              <div className="text-[9px] font-mono text-slate-400">Inscrits sur le code {currentSessionSafe.session_code}</div>
            </div>

            <div className="bg-white border rounded-2xl p-4 shadow-sm space-y-1 relative overflow-hidden">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">⚡ Expérience cumulée</div>
              <div className="text-2xl font-black text-blue-600">{totalXP} <span className="text-[11px] font-mono text-slate-400 font-normal">XP</span></div>
              <div className="text-[9px] font-mono text-slate-400">Total pour la sélection active</div>
            </div>

            <div className="bg-white border rounded-2xl p-4 shadow-sm space-y-1 relative overflow-hidden">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">🎯 Taux d'Engagement</div>
              <div className="text-2xl font-black text-emerald-600">{engagementRate}%</div>
              <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-1">
                <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${engagementRate}%` }} />
              </div>
            </div>

            <div className="bg-white border rounded-2xl p-4 shadow-sm space-y-1 relative overflow-hidden">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">🏔️ Avancement Paliers</div>
              <div className="text-xs font-bold text-slate-700 flex flex-col gap-0.5 justify-center h-8">
                <div>Palier 1 : <span className="text-slate-900 font-black">{pctPalier1}%</span></div>
                <div>Palier 2 : <span className="text-slate-900 font-black">{pctPalier2}%</span></div>
              </div>
            </div>
          </div>

          {/* CENTRE DE TRI AVANCÉ */}
          <div className="bg-slate-50 border rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="text-[11px] font-black uppercase text-slate-500 tracking-wider">🎛️ Centre de Tri Avancé</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* SÉLECTEUR COLLABORATEURS */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Filtrer par Collaborateur :</label>
                <div className="bg-white border p-1.5 rounded-xl min-h-[42px] flex flex-col justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {activeSelectedStudents.length === 0 ? (
                      <span className="text-[10px] text-slate-400 italic pl-1 py-1">Aucun collaborateur actif</span>
                    ) : (
                      activeSelectedStudents.map(st => (
                        <span key={st.uid} className="bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          👤 {st.name} 
                          <button type="button" onClick={() => setSelectedStudents(selectedStudents.filter(s => s.uid !== st.uid))} className="hover:text-blue-900 font-bold ml-0.5">✕</button>
                        </span>
                      ))
                    )}
                  </div>
                  
                  <div className="text-right border-t pt-1.5 border-slate-50">
                    <button 
                      type="button"
                      onClick={() => setSelectedStudents(activeSelectedStudents.length === sessionStudents.length ? [] : [...sessionStudents])} 
                      className="text-[9px] font-black tracking-wide text-slate-400 hover:text-blue-600 uppercase transition-colors"
                    >
                      {activeSelectedStudents.length === sessionStudents.length ? "🚫 Tout désélectionner" : "✨ Tout sélectionner"}
                    </button>
                  </div>
                </div>
                
                <select value="" onChange={(e) => {
                  const match = sessionStudents.find(s => s.uid === e.target.value);
                  if (match) setSelectedStudents([...selectedStudents, match]);
                }} className="w-full bg-white border text-xs rounded-xl p-2.5 font-semibold text-slate-700 outline-none">
                  <option value="" disabled>✨ Choisir un collaborateur ({availableStudents.length} dispo)...</option>
                  {availableStudents.map(st => <option key={st.uid} value={st.uid}>{st.email}</option>)}
                </select>
              </div>

              {/* SÉLECTEUR QUÊTES */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Filtrer par Quête :</label>
                <div className="bg-white border p-1.5 rounded-xl min-h-[42px] flex flex-col justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {activeSelectedQuests.length === 0 ? (
                      <span className="text-[10px] text-slate-400 italic pl-1 py-1">Aucune quête active</span>
                    ) : (
                      activeSelectedQuests.map(q => (
                        <span key={q.id} className="bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          🎯 {q.name} 
                          <button type="button" onClick={() => setSelectedQuests(selectedQuests.filter(sq => sq.id !== q.id))} className="hover:text-purple-950 font-bold ml-0.5">✕</button>
                        </span>
                      ))
                    )}
                  </div>

                  <div className="text-right border-t pt-1.5 border-slate-50">
                    <button 
                      type="button"
                      onClick={() => setSelectedQuests(activeSelectedQuests.length === sessionQuests.length ? [] : [...sessionQuests])} 
                      className="text-[9px] font-black tracking-wide text-slate-400 hover:text-purple-600 uppercase transition-colors"
                    >
                      {activeSelectedQuests.length === sessionQuests.length ? "🚫 Tout désélectionner" : "✨ Tout sélectionner"}
                    </button>
                  </div>
                </div>

                <select value="" onChange={(e) => {
                  const match = sessionQuests.find(q => String(q.id) === String(e.target.value));
                  if (match) setSelectedQuests([...selectedQuests, match]);
                }} className="w-full bg-white border text-xs rounded-xl p-2.5 font-semibold text-slate-700 outline-none">
                  <option value="" disabled>✨ Choisir une quête ({availableQuests.length} dispo)...</option>
                  {availableQuests.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
                </select>
              </div>

            </div>
          </div>

          {/* TABLEAU RÉCAPITULATIF DES EQUIPES */}
          <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-slate-50/50">
              <h3 className="text-xs font-black uppercase text-slate-800">📋 Progression Générale des Équipes</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/40 text-slate-400 font-bold border-b text-[10px] uppercase">
                    <th className="p-3 pl-4">Identité Collaborateur</th>
                    <th className="p-3">XP Cumulée</th>
                    <th className="p-3">Livrables Validés</th>
                    <th className="p-3 pr-4 text-right">Statut Filtre Tri</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-medium text-slate-700">
                  {studentsProgress.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center p-6 text-slate-400 italic">Aucun collaborateur trouvé pour cette cohorte.</td>
                    </tr>
                  ) : (
                    studentsProgress.map(student => {
                      const isChecked = activeSelectedStudents.some(s => s.uid === student.uid);
                      return (
                        <tr key={student.uid} className={`hover:bg-slate-50/60 transition-colors ${isChecked ? 'bg-blue-50/20' : ''}`}>
                          <td className="p-3 pl-4">
                            <div className="font-bold text-slate-900">{student.name}</div>
                            <div className="text-[10px] font-mono text-slate-400">{student.email}</div>
                          </td>
                          <td className="p-3 font-bold text-slate-900">{student.xp} XP</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${student.livrablesCount > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400'}`}>
                              {student.livrablesCount} dossiers
                            </span>
                          </td>
                          <td className="p-3 pr-4 text-right">
                            <button 
                              type="button"
                              onClick={() => {
                                if (isChecked) {
                                  setSelectedStudents(selectedStudents.filter(s => s.uid !== student.uid));
                                } else {
                                  setSelectedStudents([...selectedStudents, student]);
                                }
                              }}
                              className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${isChecked ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white hover:bg-slate-50 text-slate-500 border-slate-200'}`}
                            >
                              {isChecked ? "⚡ Actif" : "Désactivé"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* PORTFOLIO LIVRABLES */}
          <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-800">📂 Registre d'audit des Livrables correspondants</h3>
            {uniqueProductionsGlobal.length === 0 ? (
              <div className="text-center p-6 text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-dashed">
                Aucun livrable. Activez des collaborateurs et des quêtes dans le Centre de Tri pour auditer les dossiers.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {uniqueProductionsGlobal.map(prod => (
                  <div key={prod.id} className="border rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between gap-2 relative overflow-hidden">
                    <div className="absolute top-0 bottom-0 left-0 w-1 bg-emerald-500" />
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-slate-900 font-black">👤 {sessionStudents.find(s => s.uid === prod.studentId)?.name || "Apprenant"}</span>
                        <span className="text-slate-400 font-mono">{prod.date}</span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-800">🎯 Quête : {prod.questName}</h4>
                      <p className="text-[11px] text-slate-600 italic bg-white p-2.5 rounded-xl border line-clamp-4 mt-2 font-medium leading-relaxed shadow-sm">
                        "{prod.content}"
                      </p>
                    </div>
                    <div className="text-[9px] font-mono text-slate-400 text-right pt-1 border-t border-slate-100">
                      ID Livrable : {prod.id}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
