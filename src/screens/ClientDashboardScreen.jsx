// src/screens/ClientDashboardScreen.jsx
import React, { useState, useEffect, useRef } from 'react';
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
  const [sessionFloors, setSessionFloors] = useState([]); 
  const [allProductions, setAllProductions] = useState([]); 
  const [loading, setLoading] = useState(true);

  // ÉTAT DE LA MODALE KPI
  const [activeKpiIndex, setActiveKpiIndex] = useState(null); // null, 0, 1, 2, ou 3
  const slideRef = useRef(null);

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

  // CHANGEMENT DE SESSION
  const handleSessionChange = (e) => {
    const sessionDocId = e.target.value;
    const found = sessions.find(s => String(s.id) === String(sessionDocId));
    if (found) {
      setSelectedSession(found);
      setSelectedStudents([]);
      setSelectedQuests([]);
    }
  };

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

  // 1. INITIALISATION DES SESSIONS ET PRODUCTIONS
  useEffect(() => {
    const initializeDRHData = async () => {
      try {
        setLoading(true);
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        const { data: fetchedSessions, error: sError } = await supabase
          .from('sessions')
          .select('*')
          .contains('drh_ids', JSON.stringify([authUser.id]));

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
          .order('created_at', { ascending: false });

        if (pError) throw pError;
        if (fetchedProductions) setAllProductions(fetchedProductions);

      } catch (err) {
        console.error("Erreur d'initialisation :", err);
      } finally {
        setLoading(false);
      }
    };

    initializeDRHData();
  }, []); 

  // 2. EXTRACTION DYNAMIQUE DES PALIERS, QUÊTES ET PROFILS
  useEffect(() => {
    if (!currentSessionSafe) {
      setSessionStudents([]);
      setSessionQuests([]);
      setSessionFloors([]);
      return;
    }

    const fetchCohortContext = async () => {
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

            const savedStudents = sessionStorage.getItem('drh_filter_students');
            if (!savedStudents || JSON.parse(savedStudents).length === 0) {
              setSelectedStudents(formattedStudents);
            }
          }
        }
      } catch (err) {
        console.error("Erreur chargement profils :", err);
      }

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
            let normalizedFloors = [];

            if (Array.isArray(floorsObj)) {
              normalizedFloors = floorsObj.map((floor, index) => {
                const qIds = floor && Array.isArray(floor.quests) ? floor.quests.map(String) : [];
                extractedQuestIds.push(...qIds);
                return { id: index + 1, name: floor.name || `Palier ${index + 1}`, questIds: qIds };
              });
            } else if (typeof floorsObj === 'object' && floorsObj !== null) {
              normalizedFloors = Object.entries(floorsObj).map(([key, floor]) => {
                const qIds = floor && Array.isArray(floor.quests) ? floor.quests.map(String) : [];
                extractedQuestIds.push(...qIds);
                return { id: key, name: floor.name || `Palier ${key}`, questIds: qIds };
              });
            }

            setSessionFloors(normalizedFloors);

            if (extractedQuestIds.length > 0) {
              const uniqueQuestIds = [...new Set(extractedQuestIds)];
              const { data: fetchedQuests, error: qError } = await supabase
                .from('quests')
                .select('*')
                .in('id', uniqueQuestIds);

              if (qError) throw qError;
              if (fetchedQuests) {
                setSessionQuests(fetchedQuests);
                const savedQuests = sessionStorage.getItem('drh_filter_quests');
                if (!savedQuests || JSON.parse(savedQuests).length === 0) {
                  setSelectedQuests(fetchedQuests);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("Erreur extraction quêtes :", err);
      }
    };

    fetchCohortContext();
  }, [currentSessionSafe?.id, currentSessionSafe?.session_code, currentSessionSafe?.tree_id]);

  if (loading) {
    return <div className="max-w-7xl mx-auto px-8 py-8 text-center text-xs font-mono text-slate-400">Chargement de l'espace de pilotage...</div>;
  }

  // 3. LOGIQUE KPI & CALCULS EN TEMPS RÉEL (CORRIGÉS)
  const studentIdsInCurrentSession = sessionStudents.map(s => s.uid);
  const sessionQuestIdsOnly = sessionQuests.map(q => String(q.id));

  const activeSelectedStudents = selectedStudents.filter(s => studentIdsInCurrentSession.includes(s.uid));
  const activeSelectedQuests = selectedQuests.filter(q => sessionQuestIdsOnly.includes(String(q.id)));

  // Filtrage des livrables
  const filteredProductions = allProductions.filter(p => {
    if (!p || !currentSessionSafe) return false;
    const isStudentInSession = studentIdsInCurrentSession.includes(p.student_id);
    const matchesSessionCode = p.session_code === currentSessionSafe.session_code;
    if (!isStudentInSession || !matchesSessionCode) return false;
    if (activeSelectedStudents.length === 0 || activeSelectedQuests.length === 0) return false;

    return activeSelectedStudents.some(s => s.uid === p.student_id) && 
           activeSelectedQuests.some(q => String(q.id) === String(p.quest_id));
  });

  const uniqueProductionsGlobal = filteredProductions.filter(p => !p.content?.startsWith("[Importé"));

  // XP cumulée
  let totalXP = 0;
  const studentsProgress = sessionStudents.map(student => {
    const studentProds = allProductions.filter(p => 
      p.student_id === student.uid && 
      p.session_code === currentSessionSafe.session_code &&
      activeSelectedQuests.some(q => String(q.id) === String(p.quest_id))
    );
    const studentUniqueProds = studentProds.filter(p => !p.content?.startsWith("[Importé"));

    const studentPoints = studentProds.reduce((sum, prod) => {
      const originalQuest = sessionQuests.find(q => String(q.id) === String(prod.quest_id));
      if (originalQuest) {
        const d = parseInt(originalQuest.difficulty, 10);
        return sum + (d === 3 ? 500 : d === 2 ? 250 : 100);
      }
      return sum + 100;
    }, 0);

    if (activeSelectedStudents.some(s => s.uid === student.uid)) {
      totalXP += studentPoints;
    }

    return { ...student, xp: studentPoints, livrablesCount: studentUniqueProds.length };
  });

  // Calcul du mini-graphe par palier (Moyenne de complétion)
  const floorsWithProgress = sessionFloors.map(floor => {
    const questIds = floor.questIds;
    if (questIds.length === 0 || sessionStudents.length === 0) {
      return { ...floor, progress: 0, questCount: 0 };
    }

    let completedCount = 0;
    questIds.forEach(qId => {
      sessionStudents.forEach(student => {
        const hasSubmitted = allProductions.some(p => 
          p.student_id === student.uid && 
          String(p.quest_id) === String(qId) && 
          p.session_code === currentSessionSafe.session_code
        );
        if (hasSubmitted) completedCount++;
      });
    });

    const totalPossible = sessionStudents.length * questIds.length;
    return {
      ...floor,
      progress: Math.round((completedCount / totalPossible) * 100),
      questCount: questIds.length
    };
  });

  const totalStudents = sessionStudents.length;
  const activeStudentsCount = studentsProgress.filter(s => s.livrablesCount > 0).length;
  const engagementRate = totalStudents > 0 ? Math.round((activeStudentsCount / totalStudents) * 100) : 0;

  const availableStudents = [...sessionStudents].filter(st => !activeSelectedStudents.some(sel => sel.uid === st.uid));
  const availableQuests = [...sessionQuests].filter(q => !activeSelectedQuests.some(sel => String(sel.id) === String(q.id)));

  // 4. LOGIQUE EXPORT STYLE "GOOGLE SLIDE"
  const handleDownloadSlide = (kpiTitle) => {
    const originalContent = slideRef.current.innerHTML;
    
    // Création d'une fenêtre temporaire formatée en 16:9 pour impression PDF / Impression d'image
    const printWindow = window.open('', '_blank', 'width=1280,height=720');
    printWindow.document.write(`
      <html>
        <head>
          <title>Export Slide - ${kpiTitle}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
            body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; background-color: #0f172a; color: white; }
            .slide-canvas {
              width: 1280px; height: 720px;
              box-sizing: border-box;
              display: flex; flex-col; justify-content: space-between;
              padding: 60px; position: relative;
              background: radial-gradient(circle at 80% 20%, #1e1b4b 0%, #0f172a 100%);
            }
          </style>
        </head>
        <body>
          <div class="slide-canvas">
            <div>
              <div class="text-indigo-400 font-mono text-xs uppercase tracking-widest mb-1">EcoLearn - Dashboard Audit</div>
              <h1 class="text-4xl font-black text-white tracking-tight uppercase">${kpiTitle}</h1>
              <div class="text-slate-400 text-sm font-mono mt-1">Cohorte : ${currentSessionSafe?.session_code}</div>
            </div>
            
            <div class="my-auto flex justify-center items-center">
              <div class="scale-150 transform origin-center">
                ${originalContent}
              </div>
            </div>

            <div class="flex justify-between items-center text-xs text-slate-500 font-mono border-t border-slate-800/80 pt-4">
              <span>Généré le ${new Date().toLocaleDateString()}</span>
              <span>Propriété Exclusive & Confidentielle</span>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // DONNÉES UTILES POUR LE CARROUSEL DES MODALES
  const kpiCards = [
    {
      title: "👥 Effectif total",
      subtitle: "Nombre total de collaborateurs actifs enregistrés",
      value: `${totalStudents} apprenants`,
      desc: `Tous inscrits sur le code d'accès de session "${currentSessionSafe?.session_code}".`,
      renderGraphic: () => (
        <div className="flex flex-col items-center justify-center p-6 bg-slate-900 rounded-3xl border border-slate-800 text-white w-[380px]">
          <div className="text-6xl mb-2">👥</div>
          <div className="text-5xl font-black">{totalStudents}</div>
          <div className="text-xs text-indigo-400 uppercase tracking-widest mt-2 font-mono">Inscrits à la cohorte</div>
        </div>
      )
    },
    {
      title: "⚡ Expérience cumulée",
      subtitle: "Points d'expérience (XP) acquis par l'équipe",
      value: `${totalXP} XP`,
      desc: "Représente la somme cumulée de l'effort et de la validation des livrables pour la sélection d'apprenants active.",
      renderGraphic: () => (
        <div className="flex flex-col items-center justify-center p-6 bg-slate-900 rounded-3xl border border-slate-800 text-white w-[380px]">
          <div className="text-6xl mb-2">⚡</div>
          <div className="text-5xl font-black text-blue-400">{totalXP} XP</div>
          <div className="text-xs text-slate-400 uppercase tracking-widest mt-2 font-mono">Volume d'apprentissage global</div>
        </div>
      )
    },
    {
      title: "🎯 Taux d'Engagement",
      subtitle: "Ratio de collaborateurs ayant validé au moins un livrable",
      value: `${engagementRate}%`,
      desc: `Sur ${totalStudents} personnes inscrites, ${activeStudentsCount} ont déjà soumis des dossiers d'évaluation validés.`,
      renderGraphic: () => (
        <div className="flex flex-col items-center justify-center p-6 bg-slate-900 rounded-3xl border border-slate-800 text-white w-[380px] space-y-4">
          <div className="relative flex items-center justify-center h-28 w-28 rounded-full border-8 border-slate-800">
            <div className="absolute inset-0 rounded-full border-8 border-emerald-500 border-t-transparent animate-spin-slow" />
            <span className="text-2xl font-black text-emerald-400">{engagementRate}%</span>
          </div>
          <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Implication de la cohorte</div>
        </div>
      )
    },
    {
      title: "🏔️ Résolution par Palier",
      subtitle: "Pourcentage de complétion moyen des quêtes par palier de compétences",
      value: "Détail par paliers",
      desc: "Mesure la progression réelle globale. Pour chaque palier, calcul de la complétion effective par rapport au volume total de quêtes attendu.",
      renderGraphic: () => (
        <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 text-white w-[420px] space-y-3">
          {floorsWithProgress.map(floor => (
            <div key={floor.id} className="space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-300">{floor.name}</span>
                <span className="text-indigo-400 font-mono">{floor.progress}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${floor.progress}%` }} />
              </div>
            </div>
          ))}
        </div>
      )
    }
  ];

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
          {/* COMPTEURS ET INDICES DE PERFORMANCE (KPI) CLIQUABLES */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KPI 1 : Effectif */}
            <div 
              onClick={() => setActiveKpiIndex(0)}
              className="bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-slate-300 cursor-pointer transition-all duration-200 space-y-1 relative overflow-hidden flex flex-col justify-center group"
            >
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-slate-600">👥 Effectif total</div>
              <div className="text-2xl font-black text-slate-900">{totalStudents} <span className="text-[11px] font-mono text-slate-400 font-normal">collaborateurs</span></div>
              <div className="text-[9px] font-mono text-slate-400 flex justify-between">
                <span>Inscrits sur le code {currentSessionSafe.session_code}</span>
                <span className="text-indigo-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Zoom 🔍</span>
              </div>
            </div>

            {/* KPI 2 : XP */}
            <div 
              onClick={() => setActiveKpiIndex(1)}
              className="bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-slate-300 cursor-pointer transition-all duration-200 space-y-1 relative overflow-hidden flex flex-col justify-center group"
            >
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-slate-600">⚡ Expérience cumulée</div>
              <div className="text-2xl font-black text-blue-600">{totalXP} <span className="text-[11px] font-mono text-slate-400 font-normal">XP</span></div>
              <div className="text-[9px] font-mono text-slate-400 flex justify-between">
                <span>Total pour la sélection active</span>
                <span className="text-indigo-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Zoom 🔍</span>
              </div>
            </div>

            {/* KPI 3 : Engagement */}
            <div 
              onClick={() => setActiveKpiIndex(2)}
              className="bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-slate-300 cursor-pointer transition-all duration-200 space-y-1 relative overflow-hidden flex flex-col justify-center group"
            >
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-slate-600">🎯 Taux d'Engagement</div>
              <div className="text-2xl font-black text-emerald-600">{engagementRate}%</div>
              <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-1 relative">
                <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${engagementRate}%` }} />
              </div>
              <div className="text-[9px] font-mono text-indigo-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity text-right">
                Zoom 🔍
              </div>
            </div>

            {/* KPI 4 : Résolution par Palier */}
            <div 
              onClick={() => setActiveKpiIndex(3)}
              className="bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-indigo-300 cursor-pointer transition-all duration-200 relative overflow-hidden flex flex-col justify-between min-h-[110px] group"
            >
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex justify-between">
                <span>🏔️ Résolution par Palier</span>
                <span className="text-indigo-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Zoom 🔍</span>
              </div>
              <div className="space-y-2 overflow-y-auto max-h-[85px] pr-1">
                {floorsWithProgress.length === 0 ? (
                  <div className="text-[10px] italic text-slate-400 font-mono">Aucun palier disponible</div>
                ) : (
                  floorsWithProgress.map(floor => (
                    <div key={floor.id} className="space-y-0.5">
                      <div className="flex justify-between text-[9px] font-bold text-slate-600">
                        <span className="truncate max-w-[120px]">{floor.name}</span>
                        <span className="font-mono text-slate-900">{floor.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${floor.progress}%` }} 
                        />
                      </div>
                    </div>
                  ))
                )}
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
                      <span className="text-[10px] text-red-500 italic pl-1 py-1">Aucun collaborateur actif (dépôts masqués)</span>
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
                      <span className="text-[10px] text-red-500 italic pl-1 py-1">Aucune quête active (dépôts masqués)</span>
                    ) : (
                      activeSelectedQuests.map(q => (
                        <span key={q.id} className="bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          🎯 {q.name} 
                          <button type="button" onClick={() => setSelectedQuests(selectedQuests.filter(sq => String(sq.id) !== String(q.id)))} className="hover:text-purple-950 font-bold ml-0.5">✕</button>
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
                {uniqueProductionsGlobal.map(prod => {
                  const matchingQuest = sessionQuests.find(q => String(q.id) === String(prod.quest_id));
                  return (
                    <div key={prod.id} className="border rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between gap-2 relative overflow-hidden">
                      <div className="absolute top-0 bottom-0 left-0 w-1 bg-emerald-500" />
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-bold">
                          <span className="text-slate-900 font-black">👤 {sessionStudents.find(s => s.uid === prod.student_id)?.name || "Apprenant"}</span>
                          <span className="text-slate-400 font-mono">
                            {prod.created_at ? new Date(prod.created_at).toLocaleDateString() : "Date inconnue"}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-slate-800">
                          🎯 Quête : {matchingQuest ? matchingQuest.name : (prod.quest_name || "Quête Inconnue")}
                        </h4>
                        <p className="text-[11px] text-slate-600 italic bg-white p-2.5 rounded-xl border line-clamp-4 mt-2 font-medium leading-relaxed shadow-sm">
                          "{prod.content}"
                        </p>
                      </div>
                      <div className="text-[9px] font-mono text-slate-400 text-right pt-1 border-t border-slate-100">
                        ID Livrable : {prod.id}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* MODALE POP-UP KPI INTERACTIVE AVEC OPTION EXPORT GOOGLE SLIDES */}
      {activeKpiIndex !== null && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 transition-all duration-300">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl text-white overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
              <div>
                <h2 className="text-lg font-black tracking-tight text-white uppercase">{kpiCards[activeKpiIndex].title}</h2>
                <p className="text-xs text-slate-400 mt-1">{kpiCards[activeKpiIndex].subtitle}</p>
              </div>
              <button 
                onClick={() => setActiveKpiIndex(null)}
                className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-full transition-colors text-xs font-mono font-bold"
              >
                🅇 Fermer
              </button>
            </div>

            {/* Contenu Interactif (Slide Canvas) */}
            <div className="p-10 flex flex-col items-center justify-center space-y-8 bg-gradient-to-b from-slate-900 to-slate-950 min-h-[350px]">
              
              {/* Conteneur de rendu du graphique/compteur */}
              <div ref={slideRef} className="flex justify-center w-full">
                {kpiCards[activeKpiIndex].renderGraphic()}
              </div>

              {/* Zone d'explication de l'analyse */}
              <div className="text-center max-w-md">
                <div className="text-3xl font-black mb-1">{kpiCards[activeKpiIndex].value}</div>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  {kpiCards[activeKpiIndex].desc}
                </p>
              </div>
            </div>

            {/* Footer Navigation + Export */}
            <div className="p-6 border-t border-slate-800 bg-slate-950/50 flex justify-between items-center">
              
              {/* Bouton Export Google Slide */}
              <button
                type="button"
                onClick={() => handleDownloadSlide(kpiCards[activeKpiIndex].title)}
                className="bg-indigo-600 hover:bg-indigo-500 text-xs font-black tracking-wide uppercase px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 text-white"
              >
                <span>📊</span> Générer Slide (16:9)
              </button>

              {/* Navigation Carrousel */}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={activeKpiIndex === 0}
                  onClick={() => setActiveKpiIndex(prev => prev - 1)}
                  className="bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none px-3.5 py-2 rounded-xl text-sm font-black transition-colors"
                >
                  ◀ Précédent
                </button>
                <button
                  type="button"
                  disabled={activeKpiIndex === kpiCards.length - 1}
                  onClick={() => setActiveKpiIndex(prev => prev + 1)}
                  className="bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none px-3.5 py-2 rounded-xl text-sm font-black transition-colors"
                >
                  Suivant ▶
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
