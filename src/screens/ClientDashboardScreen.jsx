// src/screens/ClientDashboardScreen.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

export default function ClientDashboardScreen({ trees = {}, quests = [] }) {
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
  const [activeKpiIndex, setActiveKpiIndex] = useState(null); 
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

        // Récupération des sessions où l'utilisateur connecté fait partie de "drh_ids"
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

        // Récupération globale de toutes les productions
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
          // On récupère les profils associés au code de session
          const { data: profiles, error: pError } = await supabase
            .from('profiles')
            .select('id, email, unlocked_floors')
            .contains('session_codes', JSON.stringify([currentSessionSafe.session_code]));

          if (pError) throw pError;

          if (profiles) {
            const formattedStudents = profiles.map(p => {
              // Lecture de unlocked_floors stocké en base de données pour cet arbre précis
              let maxFloor = 1;
              if (p.unlocked_floors && typeof p.unlocked_floors === 'object') {
                const floorVal = p.unlocked_floors[currentSessionSafe.tree_id];
                if (floorVal !== undefined) {
                  maxFloor = parseInt(floorVal, 10) + 1; 
                }
              }
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
          // On s'adapte à l'objet trees passé en props (qui est un dictionnaire {} dans StudentDashboard)
          // Si trees est une liste, on cherche l'arbre, sinon on y accède par clé ou on le fetch depuis Supabase
          let floorsObj = null;
          const propTree = Array.isArray(trees) 
            ? trees.find(t => String(t.id) === String(currentSessionSafe.tree_id))
            : trees[currentSessionSafe.tree_id];

          if (propTree && propTree.floors) {
            floorsObj = propTree.floors;
          } else {
            const { data: treeData, error: tError } = await supabase
              .from('trees')
              .select('floors')
              .eq('id', currentSessionSafe.tree_id)
              .single();
            if (!tError && treeData && treeData.floors) {
              floorsObj = treeData.floors;
            }
          }

          if (floorsObj) {
            const extractedQuestIds = [];
            const parsedFloors = typeof floorsObj === 'string' ? JSON.parse(floorsObj) : floorsObj;
            let normalizedFloors = [];

            if (Array.isArray(parsedFloors)) {
              normalizedFloors = parsedFloors.map((floor, index) => {
                const qIds = floor && Array.isArray(floor.quests) ? floor.quests.map(String) : [];
                extractedQuestIds.push(...qIds);
                return { id: index + 1, name: floor.name || `Palier ${index + 1}`, questIds: qIds };
              });
            } else if (typeof parsedFloors === 'object' && parsedFloors !== null) {
              normalizedFloors = Object.entries(parsedFloors).map(([key, floor]) => {
                const qIds = floor && Array.isArray(floor.quests) ? floor.quests.map(String) : [];
                extractedQuestIds.push(...qIds);
                return { id: key, name: floor.name || `Palier ${key}`, questIds: qIds };
              });
            }

            setSessionFloors(normalizedFloors);

            if (extractedQuestIds.length > 0) {
              const uniqueQuestIds = [...new Set(extractedQuestIds)];
              // On peut d'abord tenter de récupérer les quêtes depuis les props (quests) filtrées
              const propQuestsFiltered = quests.filter(q => uniqueQuestIds.includes(String(q.id)));
              
              if (propQuestsFiltered.length > 0) {
                setSessionQuests(propQuestsFiltered);
                const savedQuests = sessionStorage.getItem('drh_filter_quests');
                if (!savedQuests || JSON.parse(savedQuests).length === 0) {
                  setSelectedQuests(propQuestsFiltered);
                }
              } else {
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
        }
      } catch (err) {
        console.error("Erreur extraction quêtes :", err);
      }
    };

    fetchCohortContext();
  }, [currentSessionSafe?.id, currentSessionSafe?.session_code, currentSessionSafe?.tree_id, trees, quests]);

  if (loading) {
    return <div className="max-w-7xl mx-auto px-8 py-8 text-center text-xs font-mono text-amber-600">Chargement de l'espace de pilotage...</div>;
  }

  // 3. LOGIQUE KPI & CALCULS EN TEMPS RÉEL (ALIGNEE SUR LE PORTFOLIO)
  const studentIdsInCurrentSession = sessionStudents.map(s => s.uid);
  const sessionQuestIdsOnly = sessionQuests.map(q => String(q.id));

  const activeSelectedStudents = selectedStudents.filter(s => studentIdsInCurrentSession.includes(s.uid));
  const activeSelectedQuests = selectedQuests.filter(q => sessionQuestIdsOnly.includes(String(q.id)));

  // CORRECTION : On identifie les productions des étudiants de la session 
  // sans tester p.session_code car il n'est pas inséré par l'étudiant, 
  // mais on restreint le filtrage aux quêtes (quest_id) de l'arbre associé.
  const filteredProductions = allProductions.filter(p => {
    if (!p || !currentSessionSafe) return false;
    const isStudentInSession = studentIdsInCurrentSession.includes(p.student_id);
    const isQuestInSessionTree = sessionQuestIdsOnly.includes(String(p.quest_id));
    
    if (!isStudentInSession || !isQuestInSessionTree) return false;
    if (activeSelectedStudents.length === 0 || activeSelectedQuests.length === 0) return false;

    return activeSelectedStudents.some(s => s.uid === p.student_id) && 
           activeSelectedQuests.some(q => String(q.id) === String(p.quest_id));
  });

  // On exclut les imports et on ignore les productions collaboratives encore en attente 
  // pour n'afficher que les travaux aboutis
  const uniqueProductionsGlobal = filteredProductions.filter(p => 
    !p.content?.startsWith("[Importé") && !p.content?.includes('[EN_ATTENTE_COLLAB]')
  );

  let totalXP = 0;
  const studentsProgress = sessionStudents.map(student => {
    // Liste des productions validées de l'étudiant faisant partie de l'arbre de cette session
    const studentProds = allProductions.filter(p => 
      p.student_id === student.uid && 
      !p.content?.includes('[EN_ATTENTE_COLLAB]') &&
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
          !p.content?.includes('[EN_ATTENTE_COLLAB]')
        );
        if (hasSubmitted) completedCount++;
      });
    });
    const totalPossible = sessionStudents.length * questIds.length;
    return { ...floor, progress: Math.round((completedCount / totalPossible) * 100), questCount: questIds.length };
  });

  const totalStudents = sessionStudents.length;
  const activeStudentsCount = studentsProgress.filter(s => s.livrablesCount > 0).length;
  const engagementRate = totalStudents > 0 ? Math.round((activeStudentsCount / totalStudents) * 100) : 0;

  const availableStudents = [...sessionStudents].filter(st => !activeSelectedStudents.some(sel => sel.uid === st.uid));
  const availableQuests = [...sessionQuests].filter(q => !activeSelectedQuests.some(sel => String(sel.id) === String(q.id)));

  // 4. EXPORT SLIDE HARMONISÉ AMBRE / BLANC
  const handleDownloadSlide = (kpiTitle) => {
    const originalContent = slideRef.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=1280,height=720');
    printWindow.document.write(`
      <html>
        <head>
          <title>Export Slide - ${kpiTitle}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
            body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; background-color: #ffffff; color: #1e293b; }
            .slide-canvas { width: 1280px; height: 720px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; padding: 60px; position: relative; background: radial-gradient(circle at 90% 10%, #fff7ed 0%, #ffffff 100%); border: 1px solid #fed7aa; }
          </style>
        </head>
        <body>
          <div class="slide-canvas">
            <div>
              <div class="text-amber-600 font-mono text-xs uppercase tracking-widest mb-1 font-bold">EcoLearn - Pilotage & Données</div>
              <h1 class="text-4xl font-black text-slate-900 tracking-tight uppercase">${kpiTitle}</h1>
              <div class="text-slate-500 text-sm font-mono mt-1">Cohorte : ${currentSessionSafe?.session_code}</div>
            </div>
            <div class="my-auto flex justify-center items-center">
              <div class="scale-125 transform origin-center">
                ${originalContent}
              </div>
            </div>
            <div class="flex justify-between items-center text-xs text-slate-400 font-mono border-t border-slate-100 pt-4">
              <span>Rapport généré le ${new Date().toLocaleDateString('fr-FR')}</span>
              <span class="font-bold text-amber-600">CONFIDENTIEL DRH</span>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const kpiCards = [
    {
      title: "Progression par Palier",
      render: () => (
        <div className="space-y-4 w-[500px]">
          {floorsWithProgress.map(floor => (
            <div key={floor.id} className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>🌳 {floor.name} ({floor.questCount} quêtes)</span>
                <span className="font-mono text-amber-600 font-black">{floor.progress}% de réussite globale</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border">
                <div 
                  className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${floor.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )
    },
    {
      title: "Classement d'Engagement de l'Équipe",
      render: () => (
        <div className="space-y-3 w-[600px] max-h-[300px] overflow-y-auto pr-2">
          {studentsProgress.map((student, idx) => (
            <div key={student.uid} className="flex justify-between items-center bg-slate-50 border p-3 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-black text-slate-400">#{(idx + 1).toString().padStart(2, '0')}</span>
                <div>
                  <div className="text-xs font-black text-slate-800">{student.name}</div>
                  <div className="text-[10px] font-mono text-slate-400">{student.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xs font-black text-slate-900">{student.xp} XP</div>
                  <div className="text-[10px] text-slate-400 font-medium">{student.livrablesCount} livrables validés</div>
                </div>
                <div className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-1 rounded-lg">
                  Niveau {student.maxFloor}
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6 text-slate-800 antialiased pl-24">
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

      {/* STATS GENERALES / KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm space-y-1">
          <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest font-mono">Engagement Global</div>
          <div className="text-2xl font-black">{engagementRate}%</div>
          <div className="text-[10px] text-slate-400">{activeStudentsCount} / {totalStudents} apprenants actifs</div>
        </div>
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Score de Cohorte</div>
          <div className="text-2xl font-black text-slate-900">{totalXP} XP</div>
          <div className="text-[10px] text-slate-500">XP cumulé pour la sélection active</div>
        </div>
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Livrables Validés</div>
          <div className="text-2xl font-black text-amber-600">{uniqueProductionsGlobal.length}</div>
          <div className="text-[10px] text-slate-500">Travaux d'équipe validés</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* COLONNE FILTRES (1/3) */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">⚙️ Filtres de pilotage</h3>

          {/* ÉTUDIANTS */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700">Apprenants ({activeSelectedStudents.length})</h4>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1 border rounded-xl bg-slate-50/50">
              {activeSelectedStudents.map(student => (
                <span 
                  key={student.uid} 
                  onClick={() => setSelectedStudents(selectedStudents.filter(s => s.uid !== student.uid))}
                  className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-1 rounded-lg cursor-pointer hover:bg-red-100 hover:text-red-800 transition-all"
                >
                  👤 {student.name} ×
                </span>
              ))}
              {availableStudents.map(student => (
                <span 
                  key={student.uid} 
                  onClick={() => setSelectedStudents([...selectedStudents, student])}
                  className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-lg cursor-pointer hover:bg-slate-200 transition-all"
                >
                  + {student.name}
                </span>
              ))}
            </div>
          </div>

          {/* QUÊTES */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700">Missions / Quêtes ({activeSelectedQuests.length})</h4>
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1 border rounded-xl bg-slate-50/50">
              {activeSelectedQuests.map(quest => (
                <span 
                  key={quest.id} 
                  onClick={() => setSelectedQuests(selectedQuests.filter(q => String(q.id) !== String(quest.id)))}
                  className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-1 rounded-lg cursor-pointer hover:bg-red-100 hover:text-red-800 transition-all"
                >
                  🎯 {quest.name.substring(0, 20)}... ×
                </span>
              ))}
              {availableQuests.map(quest => (
                <span 
                  key={quest.id} 
                  onClick={() => setSelectedQuests([...selectedQuests, quest])}
                  className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-lg cursor-pointer hover:bg-slate-200 transition-all"
                >
                  + {quest.name.substring(0, 20)}...
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* COLONNE RÉSULTATS & LIVRABLES (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* PRÉSENTATION DE SLIDES KPI INTERACTIFS */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-100 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xs font-black text-amber-800 uppercase tracking-widest pl-1">📺 Module Slide DRH</h3>
                <p className="text-[11px] text-amber-600 font-medium">Visualisez et exportez les statistiques clés en format de présentation.</p>
              </div>
              <div className="flex gap-1.5">
                {kpiCards.map((_, index) => (
                  <button 
                    key={index}
                    onClick={() => setActiveKpiIndex(index)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${activeKpiIndex === index ? 'bg-amber-600 scale-125' : 'bg-slate-200 hover:bg-slate-300'}`}
                  />
                ))}
                {activeKpiIndex !== null && (
                  <button onClick={() => setActiveKpiIndex(null)} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 ml-2">Fermer ×</button>
                )}
              </div>
            </div>

            {activeKpiIndex === null ? (
              <div 
                onClick={() => setActiveKpiIndex(0)}
                className="bg-white border border-amber-200/60 p-6 rounded-2xl flex items-center justify-center cursor-pointer hover:border-amber-400 hover:shadow-md transition-all group"
              >
                <div className="text-center space-y-1">
                  <div className="text-2xl group-hover:scale-110 transition-transform">📺</div>
                  <div className="text-xs font-black text-slate-800 uppercase">Activer le mode Présentation / Slide</div>
                  <div className="text-[10px] text-slate-400">Générez des rapports imprimables au format 16:9</div>
                </div>
              </div>
            ) : (
              <div className="bg-white border rounded-2xl p-6 shadow-inner space-y-6 relative overflow-hidden flex flex-col justify-between min-h-[300px]">
                <div ref={slideRef} className="w-full flex justify-center py-2">
                  {kpiCards[activeKpiIndex].render()}
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <button
                    onClick={() => handleDownloadSlide(kpiCards[activeKpiIndex].title)}
                    className="bg-amber-500 hover:bg-amber-600 text-xs font-black tracking-wide uppercase px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 text-white"
                  >
                    <span>📺</span> Exporter en Slide (16:9)
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={activeKpiIndex === 0}
                      onClick={() => setActiveKpiIndex(prev => prev - 1)}
                      className="bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none px-3.5 py-2 rounded-xl text-xs font-bold transition-colors text-slate-700"
                    >
                      ◀ Précédent
                    </button>
                    <button
                      type="button"
                      disabled={activeKpiIndex === kpiCards.length - 1}
                      onClick={() => setActiveKpiIndex(prev => prev + 1)}
                      className="bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none px-3.5 py-2 rounded-xl text-xs font-bold transition-colors text-slate-700"
                    >
                      Suivant ▶
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1 mb-4">📂 Livrables soumis ({uniqueProductionsGlobal.length})</h3>
            
            {uniqueProductionsGlobal.length === 0 ? (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-8 rounded-2xl text-center text-xs text-slate-400 italic">
                Aucune production validée ne correspond aux filtres de sélection.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {uniqueProductionsGlobal.map(prod => {
                  const studentName = sessionStudents.find(s => s.uid === prod.student_id)?.name || "Apprenant";
                  const formattedDate = prod.created_at ? new Date(prod.created_at).toLocaleDateString('fr-FR') : "Date inconnue";
                  return (
                    <div key={prod.id} className="border rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between gap-2 relative overflow-hidden">
                      <div className="absolute top-0 bottom-0 left-0 w-1 bg-amber-500" />
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-bold">
                          <span className="text-slate-900 font-black">👤 {studentName}</span>
                          <span className="text-slate-400 font-mono">{formattedDate}</span>
                        </div>
                        <h4 className="font-bold text-xs text-slate-800">🎯 Quête : {prod.quest_name}</h4>
                        <p className="text-[11px] text-slate-600 italic bg-white p-2.5 rounded-xl border line-clamp-4 mt-2 font-medium leading-relaxed shadow-sm">
                          "{prod.content}"
                        </p>
                      </div>
                      
                      {/* Affichage du document joint s'il existe */}
                      {prod.file_url && (
                        <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center">
                          <span className="text-[10px] text-slate-400">📎 Pièce jointe intégrée</span>
                          <a 
                            href={prod.file_url} 
                            download={`Livrable_${prod.quest_name.replace(/\s+/g, '_')}_${studentName}`}
                            className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[9px] px-2 py-1 rounded transition-colors"
                          >
                            Télécharger ⬇
                          </a>
                        </div>
                      )}

                      <div className="text-[9px] font-mono text-slate-400 text-right pt-1 border-t border-slate-100">
                        ID Livrable : {prod.id}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
