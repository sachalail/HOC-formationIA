// src/screens/ClientDashboardScreen.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function ClientDashboardScreen({ trees = [], quests = [] }) {
  const [sessions, setSessions] = useState([]); 
  const [selectedSession, setSelectedSession] = useState(() => {
    const saved = sessionStorage.getItem('drh_selected_session');
    return saved ? JSON.parse(saved) : null;
  }); 
  const [sessionStudents, setSessionStudents] = useState([]); 
  const [sessionQuests, setSessionQuests] = useState([]); 
  const [allProductions, setAllProductions] = useState([]); 
  const [loading, setLoading] = useState(true);

  // FILTRES DRH PERSISTANTS
  const [selectedStudents, setSelectedStudents] = useState(() => {
    const saved = sessionStorage.getItem('drh_filter_students');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedQuests, setSelectedQuests] = useState(() => {
    const saved = sessionStorage.getItem('drh_filter_quests');
    return saved ? JSON.parse(saved) : [];
  });

  const currentSessionSafe = selectedSession || sessions[0] || null;

  useEffect(() => {
    sessionStorage.setItem('drh_filter_students', JSON.stringify(selectedStudents));
  }, [selectedStudents]);

  useEffect(() => {
    sessionStorage.setItem('drh_filter_quests', JSON.stringify(selectedQuests));
  }, [selectedQuests]);

  useEffect(() => {
    if (selectedSession) {
      sessionStorage.setItem('drh_selected_session', JSON.stringify(selectedSession));
    } else {
      sessionStorage.removeItem('drh_selected_session');
    }
  }, [selectedSession]);

  // 1. CHARGEMENT INITIAL (SESSIONS + PRODUCTIONS GLOBALES)
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
            session_code: p.session_code,
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

  // 2. EXTRACTION DYNAMIQUE DES QUÊTES DEPUIS LE JSONB 'FLOORS' DE L'ARBRE
  useEffect(() => {
    if (!currentSessionSafe) return;

    const fetchCohortContext = async () => {
      try {
        // A. Récupération des profils étudiants rattachés au code session
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
          }
        }

        // B. Extraction des quêtes à partir du schéma JSON de l'arbre
        if (currentSessionSafe.tree_id) {
          const { data: treeData, error: tError } = await supabase
            .from('trees')
            .select('floors')
            .eq('id', currentSessionSafe.tree_id)
            .single();

          if (!tError && treeData && treeData.floors) {
            const extractedQuestIds = [];
            
            // On parcourt l'objet ou tableau JSONB floors pour récupérer les IDs de quêtes
            const floorsObj = typeof treeData.floors === 'string' ? JSON.parse(treeData.floors) : treeData.floors;
            if (Array.isArray(floorsObj)) {
              floorsObj.forEach(floor => {
                if (floor.quests && Array.isArray(floor.quests)) {
                  floor.quests.forEach(qId => extractedQuestIds.push(String(qId)));
                }
              });
            } else if (typeof floorsObj === 'object') {
              Object.values(floorsObj).forEach(floor => {
                if (floor && Array.isArray(floor.quests)) {
                  floor.quests.forEach(qId => extractedQuestIds.push(String(qId)));
                }
              });
            }

            if (extractedQuestIds.length > 0) {
              const { data: fetchedQuests, error: qError } = await supabase
                .from('quests')
                .select('*')
                .in('id', extractedQuestIds);

              if (!qError && fetchedQuests) {
                setSessionQuests(fetchedQuests);
                return;
              }
            }
          }
        }
        
        // Fallback si l'arbre est introuvable ou vide
        setSessionQuests([]);

      } catch (err) {
        console.error("Erreur de synchronisation du contexte :", err);
      }
    };

    fetchCohortContext();
  }, [currentSessionSafe?.id, currentSessionSafe?.session_code, currentSessionSafe?.tree_id]);

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
    return <div className="max-w-7xl mx-auto px-8 py-8 text-center text-xs font-mono text-slate-400">Chargement...</div>;
  }

  // 3. LOGIQUE DES FILTRES : STRICT ET EXCLUSIF (Vide par défaut = affichage vide)
  const studentIdsInCurrentSession = sessionStudents.map(s => s.uid);
  const sessionQuestIdsOnly = sessionQuests.map(q => q.id);

  const activeSelectedStudents = selectedStudents.filter(s => studentIdsInCurrentSession.includes(s.uid));
  const activeSelectedQuests = selectedQuests.filter(q => sessionQuestIdsOnly.includes(q.id));

  const filteredProductions = allProductions.filter(p => {
    if (!p) return false;

    const isStudentInSession = studentIdsInCurrentSession.includes(p.studentId);
    const matchesSessionCode = p.session_code === currentSessionSafe.session_code;

    if (!isStudentInSession || !matchesSessionCode) return false;

    // REGLE EXPLICITE : Si aucun filtre n'est coché, on n'affiche personne. 
    // Sinon, l'élément doit être explicitement inclus dans les filtres sélectionnés.
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

    // L'XP globale s'incrémente uniquement selon ce qui passe à travers le filtre actif
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
    <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">
      
      {/* SELECTION DE COHORTE */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 border p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <label className="text-xs font-black text-slate-700 uppercase tracking-wider">📂 Sélectionner la cohorte :</label>
          <select 
            value={String(currentSessionSafe.id || '')} 
            onChange={handleSessionChange}
            className="bg-white border text-xs font-bold rounded-lg px-3 py-2 text-slate-800 outline-none min-w-[220px]"
          >
            {sessions.map(s => (
              <option key={String(s.id)} value={String(s.id)}>📍 {s.name || s.session_code}</option>
            ))}
          </select>
        </div>
      </div>

      {/* CENTRE DE TRI AVANCÉ */}
      <div className="bg-slate-50 border rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="text-[11px] font-black uppercase text-slate-500 tracking-wider">🎛️ Centre de Tri Avancé</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* SÉLECTEUR COLLABORATEURS */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Filtrer par Collaborateur :</label>
              <button 
                onClick={() => setSelectedStudents(activeSelectedStudents.length === sessionStudents.length ? [] : [...sessionStudents])} 
                className="text-[10px] font-bold text-blue-600 hover:underline"
              >
                {activeSelectedStudents.length === sessionStudents.length ? "Tout désélectionner" : "✨ Sélectionner tout le monde"}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 min-h-[38px] bg-white border p-1.5 rounded-xl">
              {activeSelectedStudents.length === 0 ? <span className="text-[10px] text-slate-400 italic pl-1">Filtre vide (Sélectionnez quelqu'un)</span> : (
                activeSelectedStudents.map(st => (
                  <span key={st.uid} className="bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    👤 {st.name} 
                    <button onClick={() => setSelectedStudents(selectedStudents.filter(s => s.uid !== st.uid))}>✕</button>
                  </span>
                ))
              )}
            </div>
            <select value="" onChange={(e) => {
              const match = sessionStudents.find(s => s.uid === e.target.value);
              if (match) setSelectedStudents([...selectedStudents, match]);
            }} className="w-full bg-white border text-xs rounded-xl p-2.5 font-semibold text-slate-700">
              <option value="" disabled>✨ Choisir un collaborateur ({availableStudents.length} dispo)...</option>
              {availableStudents.map(st => <option key={st.uid} value={st.uid}>{st.email}</option>)}
            </select>
          </div>

          {/* SÉLECTEUR QUÊTES */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Filtrer par Quête :</label>
              <button 
                onClick={() => setSelectedQuests(activeSelectedQuests.length === sessionQuests.length ? [] : [...sessionQuests])} 
                className="text-[10px] font-bold text-purple-600 hover:underline"
              >
                {activeSelectedQuests.length === sessionQuests.length ? "Tout désélectionner" : "✨ Sélectionner toutes les quêtes"}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 min-h-[38px] bg-white border p-1.5 rounded-xl">
              {activeSelectedQuests.length === 0 ? <span className="text-[10px] text-slate-400 italic pl-1">Filtre vide (Sélectionnez une quête)</span> : (
                activeSelectedQuests.map(q => (
                  <span key={q.id} className="bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    🎯 {q.name} 
                    <button onClick={() => setSelectedQuests(selectedQuests.filter(sq => sq.id !== q.id))}>✕</button>
                  </span>
                ))
              )}
            </div>
            <select value="" onChange={(e) => {
              const match = sessionQuests.find(q => q.id === e.target.value);
              if (match) setSelectedQuests([...selectedQuests, match]);
            }} className="w-full bg-white border text-xs rounded-xl p-2.5 font-semibold text-slate-700">
              <option value="" disabled>✨ Choisir une quête ({availableQuests.length} dispo)...</option>
              {availableQuests.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
            </select>
          </div>

        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border p-5 rounded-2xl shadow-sm">
          <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Compteur de Compétences</div>
          <div className="text-3xl font-black text-slate-900">{totalXP} <span className="text-xs font-bold text-slate-400">XP</span></div>
        </div>
        <div className="bg-white border p-5 rounded-2xl shadow-sm">
          <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Cas Pratiques Trouvés</div>
          <div className="text-3xl font-black text-emerald-600">{uniqueProductionsGlobal.length} <span className="text-xs font-bold text-slate-400">Rendus</span></div>
        </div>
        <div className="bg-white border p-5 rounded-2xl shadow-sm">
          <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Taux de Participation Ciblé</div>
          <div className="text-3xl font-black text-purple-600">{engagementRate}%</div>
        </div>
      </div>

      {/* TABLEAU ET REGISTRE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border p-5 rounded-2xl shadow-sm lg:col-span-1">
          <h3 className="text-xs font-black uppercase text-slate-800">📉 Passage des Paliers</h3>
          <div className="space-y-4 pt-4">
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700"><span>Palier 1</span><span>{pctPalier1}%</span></div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden"><div className="bg-emerald-500 h-full" style={{ width: `${pctPalier1}%` }} /></div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700"><span>Palier 2</span><span>{pctPalier2}%</span></div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden"><div className="bg-purple-600 h-full" style={{ width: `${pctPalier2}%` }} /></div>
            </div>
          </div>
        </div>

        <div className="bg-white border p-5 rounded-2xl shadow-sm lg:col-span-2">
          <h3 className="text-xs font-black uppercase text-slate-800">👥 Avancement de la Cohorte</h3>
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 font-bold border-b uppercase">
                  <th className="pb-2">Collaborateur</th>
                  <th className="pb-2">Niveau Max</th>
                  <th className="pb-2">Livrables filtrés</th>
                  <th className="pb-2 text-right">XP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentsProgress.map(student => {
                  const isVisible = activeSelectedStudents.some(s => s.uid === student.uid);
                  return (
                    <tr key={student.uid} className={`hover:bg-slate-50/50 ${!isVisible ? 'opacity-40' : ''}`}>
                      <td className="py-2.5 font-black text-slate-800">{student.name}<br/><span className="text-[10px] text-slate-400 font-normal">{student.email}</span></td>
                      <td className="py-2.5"><span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">Palier {student.maxFloor}</span></td>
                      <td className="py-2.5 font-semibold text-slate-500">{isVisible ? student.livrablesCount : 0} dépôt(s)</td>
                      <td className="py-2.5 text-right font-black text-emerald-600">{isVisible ? student.xp : 0} XP</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white border p-5 rounded-2xl shadow-sm space-y-4">
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
                  <p className="text-[11px] text-slate-600 bg-white p-2 rounded border italic">"{prod.content}"</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
