// src/screens/ClientDashboardScreen.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function ClientDashboardScreen({ trees }) {
  const [sessions, setSessions] = useState([]); // Sessions gérées par ce DRH
  const [selectedSession, setSelectedSession] = useState(() => {
    const saved = sessionStorage.getItem('drh_selected_session');
    return saved ? JSON.parse(saved) : null;
  }); 
  const [sessionStudents, setSessionStudents] = useState([]); // Étudiants de la session active
  const [sessionQuests, setSessionQuests] = useState([]); // Quêtes associées à l'arbre de la session active
  const [allProductions, setAllProductions] = useState([]); // Toutes les productions globales
  const [loading, setLoading] = useState(true);

  // FILTRES DRH PERSISTANTS (Maintien au Alt+Tab / Refresh)
  const [selectedStudents, setSelectedStudents] = useState(() => {
    const saved = sessionStorage.getItem('drh_filter_students');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedQuests, setSelectedQuests] = useState(() => {
    const saved = sessionStorage.getItem('drh_filter_quests');
    return saved ? JSON.parse(saved) : [];
  });

  // Source de vérité unique et sécurisée pour la session active
  const currentSessionSafe = selectedSession || sessions[0] || null;

  // Sauvegarde des filtres dans le stockage de session
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

        // Récupérer les sessions affectées à ce DRH
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('sessions')
          .select('*')
          .contains('drh_ids', JSON.stringify([hrUserId]));

        if (sessionsError) throw sessionsError;
        setSessions(sessionsData || []);

        if (sessionsData && sessionsData.length > 0 && !selectedSession) {
          setSelectedSession(sessionsData[0]);
        }

        // Récupérer les productions de la table
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

  // 2. SYNCHRONISATION ÉTUDIANTS + QUÊTES DÈS QUE LA COHORTE CHANGE
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
              // Récupération dynamique du palier max atteint via le localStorage de secours
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

        // B. Récupération des quêtes associées à l'arbre de cette session spécifique
        if (currentSessionSafe.tree_id) {
          const { data: questsData, error: qError } = await supabase
            .from('quests')
            .select('*')
            .eq('tree_id', currentSessionSafe.tree_id);

          if (qError) throw qError;
          setSessionQuests(questsData || []);
        } else {
          setSessionQuests([]);
        }
      } catch (err) {
        console.error("Erreur lors du rechargement du contexte de cohorte :", err);
      }
    };

    fetchCohortContext();
  }, [currentSessionSafe?.id, currentSessionSafe?.session_code, currentSessionSafe?.tree_id]);

  const handleSessionChange = (e) => {
    const sessionDocId = e.target.value;
    const found = sessions.find(s => String(s.id) === String(sessionDocId));
    if (found) {
      setSelectedSession(found);
      // Reset obligatoire des filtres pour éviter les collisions inter-cohortes
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

  if (sessions.length === 0 || !currentSessionSafe) {
    return (
      <div className="max-w-7xl mx-auto px-8 py-12 text-center bg-white border rounded-2xl shadow-sm">
        <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider">Aucune session affectée</h2>
        <p className="text-xs text-slate-400 mt-1">Votre compte n'est pas déclaré comme DRH sur une session active.</p>
      </div>
    );
  }

  // 3. LOGIQUE DE CLOISONNEMENT ET DE FILTRAGE STRICT DES DONNÉES
  const studentIdsInCurrentSession = sessionStudents.map(s => s.uid);
  const sessionQuestIdsOnly = sessionQuests.map(q => q.id);

  const filteredProductions = allProductions.filter(p => {
    if (!p) return false;

    // Protection 1 : L'étudiant doit appartenir à la session consultée
    const isStudentInSession = studentIdsInCurrentSession.includes(p.studentId);
    
    // Protection 2 : Le rendu doit correspondre au code unique de cette session
    const matchesSessionCode = p.session_code === currentSessionSafe.session_code;

    if (!isStudentInSession || !matchesSessionCode) return false;

    // Protection 3 : Application des filtres dynamiques du Centre de Tri
    const activeSelectedStudents = selectedStudents.filter(s => studentIdsInCurrentSession.includes(s.uid));
    const matchesStudentFilter = activeSelectedStudents.length === 0 || activeSelectedStudents.some(s => s.uid === p.studentId);

    const activeSelectedQuests = selectedQuests.filter(q => sessionQuestIdsOnly.includes(q.id));
    const matchesQuestFilter = activeSelectedQuests.length === 0 || activeSelectedQuests.some(q => q.id === p.questId);

    return matchesStudentFilter && matchesQuestFilter;
  });

  // Isolation des livrables réels (hors imports système)
  const uniqueProductionsGlobal = filteredProductions.filter(p => !p.content?.startsWith("[Importé"));
  
  const getPointsByDifficulty = (diff) => {
    const d = parseInt(diff, 10);
    if (d === 3) return 500;
    if (d === 2) return 250;
    return 100;
  };

  // Calcul dynamique des statistiques par collaborateur en fonction des filtres appliqués
  let totalXP = 0;
  const studentsProgress = sessionStudents.map(student => {
    const studentProds = filteredProductions.filter(p => p.studentId === student.uid);
    const studentUniqueProds = studentProds.filter(p => !p.content?.startsWith("[Importé"));

    const studentPoints = studentProds.reduce((sum, prod) => {
      const originalQuest = sessionQuests.find(q => q.id === prod.questId);
      if (originalQuest) {
        return sum + getPointsByDifficulty(originalQuest.difficulty);
      }
      if (prod.questId && String(prod.questId).startsWith('quest_')) {
        return sum + 250;
      }
      return sum + 100;
    }, 0);

    totalXP += studentPoints;

    return {
      ...student,
      xp: studentPoints,
      livrablesCount: studentUniqueProds.length
    };
  });

  // Calcul des KPIs d'avancement (basés sur les données filtrées)
  const totalStudents = sessionStudents.length;
  const countPalier1 = studentsProgress.filter(s => s.maxFloor >= 1).length;
  const countPalier2 = studentsProgress.filter(s => s.maxFloor >= 2).length;

  const pctPalier1 = totalStudents > 0 ? Math.round((countPalier1 / totalStudents) * 100) : 0;
  const pctPalier2 = totalStudents > 0 ? Math.round((countPalier2 / totalStudents) * 100) : 0;

  const activeStudentsCount = studentsProgress.filter(s => s.livrablesCount > 0).length;
  const engagementRate = totalStudents > 0 ? Math.round((activeStudentsCount / totalStudents) * 100) : 0;

  // Préparation des listes déroulantes dynamiques (exclusion des items déjà sélectionnés)
  const availableStudents = [...sessionStudents]
    .filter(st => !selectedStudents.some(sel => sel.uid === st.uid));

  const availableQuests = [...sessionQuests]
    .sort((a, b) => parseInt(a.difficulty || 0, 10) - parseInt(b.difficulty || 0, 10))
    .filter(q => !selectedQuests.some(sel => sel.id === q.id));

  const sortedSelectedStudents = [...selectedStudents].filter(s => studentIdsInCurrentSession.includes(s.uid));
  const sortedSelectedQuests = [...selectedQuests].filter(q => sessionQuestIdsOnly.includes(q.id));

  return (
    <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">
      
      {/* SELECTION DE COHORTE */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 border p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <label className="text-xs font-black text-slate-700 uppercase tracking-wider whitespace-nowrap">
            📂 Sélectionner la cohorte :
          </label>
          <select 
            value={String(currentSessionSafe.id || '')} 
            onChange={handleSessionChange}
            className="bg-white border border-slate-200 text-xs font-bold rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-purple-500 shadow-sm min-w-[220px] cursor-pointer"
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

      {/* BANNIÈRE DE CONTEXTE */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-wrap justify-between items-center gap-4 shadow-md">
        <div className="space-y-1">
          <div className="text-[10px] uppercase font-black tracking-wider text-amber-400">Suivi d'Acculturation Entreprise</div>
          <h2 className="text-lg font-black tracking-tight">
            Portail Décideur & RH — {currentSessionSafe.name || 'Ma Session'}
          </h2>
          <p className="text-xs text-slate-400">
            Code unique d'arrimage : <span className="font-mono text-amber-500 font-bold bg-slate-800 px-2 py-0.5 rounded">{currentSessionSafe.session_code || 'N/A'}</span> | {totalStudents} collaborateur(s) inscrit(s) dans cette cohorte.
          </p>
        </div>
        <button 
          onClick={() => alert(`📊 Génération du rapport de suivi...`)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all cursor-pointer"
        >
          📥 Télécharger le rapport (.xlsx)
        </button>
      </div>

      {/* CENTRE DE TRI AVANCÉ (Filtres à 2 Colonnes) */}
      <div className="bg-slate-50 border rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="text-[11px] font-black uppercase text-slate-500 tracking-wider">🎛️ Centre de Tri Avancé</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* SÉLECTEUR COLLABORATEURS */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Filtrer par Collaborateur :</label>
              <button onClick={() => setSelectedStudents([])} className="text-[10px] font-bold text-blue-600 hover:underline">Tous les collaborateurs</button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 min-h-[38px] bg-white border p-1.5 rounded-xl">
              {sortedSelectedStudents.length === 0 ? <span className="text-[10px] text-slate-400 italic pl-1">Tous visibles</span> : (
                sortedSelectedStudents.map(st => (
                  <span key={st.uid} className="bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                    👤 {st.name} 
                    <button onClick={() => setSelectedStudents(selectedStudents.filter(s => s.uid !== st.uid))} className="hover:text-red-500 pl-0.5">✕</button>
                  </span>
                ))
              )}
            </div>
            <select value="" onChange={(e) => {
              const match = sessionStudents.find(s => s.uid === e.target.value);
              if (match) setSelectedStudents([...selectedStudents, match]);
            }} className="w-full bg-white border text-xs rounded-xl p-2.5 font-semibold text-slate-700 cursor-pointer shadow-sm">
              <option value="" disabled>✨ Choisir un collaborateur ({availableStudents.length} dispo)...</option>
              {availableStudents.map(st => <option key={st.uid} value={st.uid}>{st.email}</option>)}
            </select>
          </div>

          {/* SÉLECTEUR QUÊTES */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Filtrer par Quête :</label>
              <button onClick={() => setSelectedQuests([])} className="text-[10px] font-bold text-purple-600 hover:underline">Toutes les quêtes</button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 min-h-[38px] bg-white border p-1.5 rounded-xl">
              {sortedSelectedQuests.length === 0 ? <span className="text-[10px] text-slate-400 italic pl-1">Toutes visibles</span> : (
                sortedSelectedQuests.map(q => (
                  <span key={q.id} className="bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                    🎯 {q.name} 
                    <button onClick={() => setSelectedQuests(selectedQuests.filter(sq => sq.id !== q.id))} className="hover:text-red-500 pl-0.5">✕</button>
                  </span>
                ))
              )}
            </div>
            <select value="" onChange={(e) => {
              const match = sessionQuests.find(q => q.id === e.target.value);
              if (match) setSelectedQuests([...selectedQuests, match]);
            }} className="w-full bg-white border text-xs rounded-xl p-2.5 font-semibold text-slate-700 cursor-pointer shadow-sm">
              <option value="" disabled>✨ Choisir une quête ({availableQuests.length} dispo)...</option>
              {availableQuests.map(q => <option key={q.id} value={q.id}>{q.name} ({q.difficulty}★)</option>)}
            </select>
          </div>

        </div>
      </div>

      {/* METRICS ROW (Mis à jour dynamiquement selon les filtres) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm space-y-1">
          <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Compteur de Compétences</div>
          <div className="text-3xl font-black text-slate-900">{totalXP} <span className="text-xs font-bold text-slate-400">XP</span></div>
          <p className="text-[11px] text-slate-500 font-medium">Somme pondérée des quêtes isolées.</p>
        </div>

        <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm space-y-1">
          <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Cas Pratiques Trouvés</div>
          <div className="text-3xl font-black text-emerald-600">{uniqueProductionsGlobal.length} <span className="text-xs font-bold text-slate-400">Rendus</span></div>
          <p className="text-[11px] text-slate-500 font-medium">Preuves concrètes filtrées ci-dessous.</p>
        </div>

        <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm space-y-1">
          <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Taux de Participation Ciblé</div>
          <div className="text-3xl font-black text-purple-600">{engagementRate}%</div>
          <p className="text-[11px] text-slate-500 font-medium">Collaborateurs répondant aux filtres définis.</p>
        </div>
      </div>

      {/* VUE BLOCS INTERMÉDIAIRES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LE PASSEUR DE PALIER */}
        <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm space-y-4 lg:col-span-1">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">📉 Taux de passage des Paliers</h3>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>Palier 1</span>
                <span>{pctPalier1}% ({countPalier1}/{totalStudents})</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${pctPalier1}%` }} />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>Palier 2</span>
                <span>{pctPalier2}% ({countPalier2}/{totalStudents})</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-purple-600 h-full transition-all duration-300" style={{ width: `${pctPalier2}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* SYNTHÈSE DE LA COHORTE */}
        <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm space-y-3 lg:col-span-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">👥 Avancement de la Cohorte ({totalStudents})</h3>
          {totalStudents === 0 ? (
            <div className="text-center p-12 text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-dashed">
              💡 Aucun collaborateur associé.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 font-bold uppercase border-b">
                    <th className="pb-2">Collaborateur</th>
                    <th className="pb-2">Dernier Niveau Connu</th>
                    <th className="pb-2">Livrables (sélection)</th>
                    <th className="pb-2 text-right">XP générée</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentsProgress.map(student => (
                    <tr key={student.uid} className="hover:bg-slate-50/50">
                      <td className="py-3 font-black text-slate-800 flex flex-col">
                        <span>{student.name}</span>
                        <span className="text-[10px] text-slate-400 font-normal">{student.email}</span>
                      </td>
                      <td className="py-3 font-medium">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold font-mono">Palier {student.maxFloor}</span>
                      </td>
                      <td className="py-3 font-semibold text-slate-500">{student.livrablesCount} dépôt(s)</td>
                      <td className="py-3 text-right font-black text-emerald-600">{student.xp} XP</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* REGISTRE D'AUDIT CLOISONNÉ */}
      <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">📂 Registre d'audit des Livrables correspondants</h3>
        {uniqueProductionsGlobal.length === 0 ? (
          <div className="text-center p-8 text-xs text-slate-400 font-medium italic bg-slate-50 rounded-xl border border-dashed">
            Aucun livrable ne répond aux critères sélectionnés pour cette cohorte.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {uniqueProductionsGlobal.map(prod => (
              <div key={prod.id} className="border rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between gap-3 relative overflow-hidden shadow-sm">
                <div className="absolute top-0 bottom-0 left-0 w-1 bg-emerald-500" />
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-slate-900 font-black">
                      👤 {sessionStudents.find(s => s.uid === prod.studentId)?.name || "Apprenant"}
                      {prod.file_url && (
                        <a 
                          href={prod.file_url} 
                          download
                          className="ml-2 inline-flex items-center text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded font-mono font-bold text-[9px] border border-purple-200 cursor-pointer"
                        >
                          📄 doc joint
                        </a>
                      )}
                    </span>
                    <span className="text-slate-400 font-mono">{prod.date}</span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-800 pt-1">🎯 Quête : {prod.questName}</h4>
                  <p className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border italic">"{prod.content}"</p>
                </div>
                <div className="pt-2 border-t flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                  <span>Réf : DRH-SESS-{String(currentSessionSafe.id).substring(0, 5)}</span>
                  <span className="text-emerald-600 font-extrabold">✓ Livrable Archivé</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
