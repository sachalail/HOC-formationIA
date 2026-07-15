// src/screens/StudioScreen.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const getQuestBadgeStyle = (quest) => {
  if (!quest) return "bg-slate-50 text-slate-700 border-slate-200";
  if (Number(quest.difficulty) === 3) return "bg-orange-50 text-orange-700 border-orange-200";
  if (Number(quest.difficulty) === 2) return "bg-red-50 text-red-700 border-red-200";
  switch (quest.theme) {
    case 'social': return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case 'env': return "bg-teal-50 text-teal-700 border-teal-200";
    case 'tech': return "bg-indigo-50 text-indigo-700 border-indigo-200";
    default: return "bg-slate-50 text-slate-700 border-slate-200";
  }
};

// Calcule l'heure de fin selon les durées cumulées
const calculateEndTime = (startTime, blocks = []) => {
  if (!startTime) return '';
  
  const totalMinutes = blocks.reduce((acc, block) => {
    const duration = parseInt(block.duration || block.duration_minutes || 0, 10);
    return acc + (isNaN(duration) ? 0 : duration);
  }, 0);

  const [startHours, startMinutes] = startTime.split(':').map(Number);
  if (isNaN(startHours) || isNaN(startMinutes)) return startTime;

  const totalStartMinutes = startHours * 60 + startMinutes;
  const finalMinutes = totalStartMinutes + totalMinutes;

  const endHours = Math.floor(finalMinutes / 60) % 24;
  const endMinutes = finalMinutes % 60;

  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
};

export default function StudioScreen({ trees = {}, setTrees, quests = [], setQuests }) {
  const [currentUserId, setCurrentUserId] = useState(null);
  
  // Navigation par onglet interne au Studio
  const [activeTab, setActiveTab] = useState('tree'); // 'tree' ou 'sessions'
  
  // États de sélection (Arbres)
  const [activeTreeId, setActiveTreeId] = useState("");
  const [activeFloorId, setActiveFloorId] = useState(null);
  
  // États de sélection (Sessions)
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [viewMode, setViewMode] = useState("view"); // "view" ou "edit"
  
  // Zoom sur un palier pour en inspecter le contenu
  const [selectedInspectFloor, setSelectedInspectFloor] = useState(null);

  // États des formulaires et modales
  const [activeModal, setActiveModal] = useState(null); 
  const [newTreeName, setNewTreeName] = useState('');
  const [newSessionCode, setNewSessionCode] = useState('');
  const [newSessionDate, setNewSessionDate] = useState(new Date().toISOString().split('T')[0]);

  // Recherche RH & Cache d'emails local
  const [drhSearchQuery, setDrhSearchQuery] = useState('');
  const [drhSuggestions, setDrhSuggestions] = useState([]);
  const [drhEmailsCache, setDrhEmailsCache] = useState({});

  // Config des blocs personnalisés
  const [customBlockConfig, setCustomBlockConfig] = useState({
    name: 'Pause Café / Réflexion',
    desc: 'Un moment de débrief libre ou de pause active',
    color: '#3b82f6',
    duration: 15
  });

  const [draggedPlanningItem, setDraggedPlanningItem] = useState(null);
  const [activeDropIndex, setActiveDropIndex] = useState(null);

  // --- ÉTATS DÉDIÉS À LA CRÉATION DE MISSION (ONGLET ARBRE) ---
  const [newQuestTitle, setNewQuestTitle] = useState('');
  const [newQuestDesc, setNewQuestDesc] = useState('');
  const [newQuestPoints, setNewQuestPoints] = useState(100);
  const [newQuestTheme, setNewQuestTheme] = useState('tech');
  const [newQuestDifficulty, setNewQuestDifficulty] = useState('1');

  // CHARGEMENT INITIAL
  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserId(session.user.id);
        await fetchSessions(session.user.id);
        await fetchTrees();
      }
    };
    fetchInitialData();
  }, []);

  // Charger le dictionnaire des profils pour résoudre ID -> Email
  const loadDrhEmailsCache = async (drhIds) => {
    if (!drhIds || drhIds.length === 0) return;
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', drhIds);
    
    if (profiles && !error) {
      const newCache = { ...drhEmailsCache };
      profiles.forEach(p => {
        newCache[p.id] = p.email;
      });
      setDrhEmailsCache(newCache);
    }
  };

  const fetchSessions = async (userId) => {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('created_by', userId);

    if (data && !error) {
      const sortedData = data.sort((a, b) => {
        const dateA = new Date(a.formation_date || '1970-01-01');
        const dateB = new Date(b.formation_date || '1970-01-01');
        return dateB - dateA;
      });

      const mappedSessions = sortedData.map(s => ({
        ...s,
        planning: s.planning || []
      }));
      setSessions(mappedSessions);

      const allDrhIds = [...new Set(mappedSessions.flatMap(s => s.drh_ids || []))];
      if (allDrhIds.length > 0) {
        await loadDrhEmailsCache(allDrhIds);
      }
    }
  };

  const fetchTrees = async () => {
    const { data, error } = await supabase.from('trees').select('*');
    if (data && !error && data.length > 0) {
      const treesMap = {};
      data.forEach(t => { treesMap[t.id] = t; });
      if (typeof setTrees === 'function') setTrees(treesMap);
    }
  };

  // Sélections actives
  const activeTree = trees[activeTreeId] || null;
  const currentSession = sessions.find(s => String(s.id) === String(activeSessionId));
  const linkedTree = currentSession ? trees[currentSession.tree_id] : null;

  // Recherche dynamique DRH
  useEffect(() => {
    const searchDRH = async () => {
      if (drhSearchQuery.trim().length < 2) {
        setDrhSuggestions([]);
        return;
      }
      try {
        let query = supabase.from('profiles').select('id, email, role').ilike('email', `%${drhSearchQuery}%`);
        const currentDrhIds = Array.isArray(currentSession?.drh_ids) ? currentSession.drh_ids.filter(id => id && String(id).trim() !== "") : [];
        if (currentDrhIds.length > 0) {
          query = query.not('id', 'in', `(${currentDrhIds.join(',')})`);
        }
        const { data, error } = await query.limit(5);
        if (data && !error) setDrhSuggestions(data);
      } catch (err) {
        console.error(err);
      }
    };
    const delayDebounce = setTimeout(() => searchDRH(), 300);
    return () => clearTimeout(delayDebounce);
  }, [drhSearchQuery, currentSession?.drh_ids]);

  // --- REQUÊTES SAUVEGARDES ET ACTIONS (ARBRE COMPÉTENCES) ---
  const handleCreateTree = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newTreeName.trim()) return;
    const defaultFloors = [
      { floorId: 1, name: "Palier d'initiation", quests: [], skills: ["Comprendre les bases"] },
      { floorId: 2, name: "Palier de consolidation", quests: [], skills: ["Appliquer les méthodes"] },
      { floorId: 3, name: "Palier de maîtrise", quests: [], skills: ["Résoudre des cas complexes"] }
    ];
    const { data, error } = await supabase.from('trees').insert([{ name: newTreeName.trim(), floors: defaultFloors }]).select().single();
    if (error) return alert(error.message);
    
    setTrees(prev => ({ ...prev, [data.id]: data }));
    setActiveTreeId(data.id);
    setNewTreeName('');
    setActiveModal(null);
  };

  const handleUpdateTreeFloors = async (updatedFloors) => {
    if (!activeTree) return;
    const { error } = await supabase.from('trees').update({ floors: updatedFloors }).eq('id', activeTree.id);
    if (error) alert(error.message);
    else {
      setTrees(prev => ({ ...prev, [activeTree.id]: { ...activeTree, floors: updatedFloors } }));
    }
  };

  const handleCreateQuest = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!activeTree || !activeFloorId) return;

    const newQuest = {
      id: `q-${Date.now()}`,
      title: newQuestTitle.trim(),
      description: newQuestDesc.trim(),
      points: Number(newQuestPoints),
      theme: newQuestTheme,
      difficulty: newQuestDifficulty,
      floorId: activeFloorId
    };

    const updatedFloors = activeTree.floors.map(f => {
      if (f.floorId === activeFloorId) {
        return { ...f, quests: [...(f.quests || []), newQuest] };
      }
      return f;
    });

    await handleUpdateTreeFloors(updatedFloors);

    setNewQuestTitle('');
    setNewQuestDesc('');
    setNewQuestPoints(100);
    setActiveModal(null);
  };

  const handleDeleteQuest = async (floorId, questId) => {
    if (!activeTree) return;
    const updatedFloors = activeTree.floors.map(f => {
      if (f.floorId === floorId) {
        return { ...f, quests: (f.quests || []).filter(q => q.id !== questId) };
      }
      return f;
    });
    await handleUpdateTreeFloors(updatedFloors);
  };

  const handleAddSkillToFloor = async (floorId, skillText) => {
    if (!skillText.trim() || !activeTree) return;
    const updatedFloors = activeTree.floors.map(f => {
      if (f.floorId === floorId) {
        const currentSkills = f.skills || [];
        if (currentSkills.includes(skillText.trim())) return f;
        return { ...f, skills: [...currentSkills, skillText.trim()] };
      }
      return f;
    });
    await handleUpdateTreeFloors(updatedFloors);
  };

  const handleRemoveSkillFromFloor = async (floorId, skillText) => {
    if (!activeTree) return;
    const updatedFloors = activeTree.floors.map(f => {
      if (f.floorId === floorId) {
        return { ...f, skills: (f.skills || []).filter(s => s !== skillText) };
      }
      return f;
    });
    await handleUpdateTreeFloors(updatedFloors);
  };

  const handleAddFloor = async () => {
    if (!activeTree) return;
    const nextId = (activeTree.floors || []).reduce((max, f) => Math.max(max, f.floorId), 0) + 1;
    const newFloor = { floorId: nextId, name: `Palier de perfectionnement ${nextId}`, quests: [], skills: [] };
    await handleUpdateTreeFloors([...(activeTree.floors || []), newFloor]);
  };

  const handleRenameFloor = async (floorId, newName) => {
    if (!newName.trim() || !activeTree) return;
    const updatedFloors = activeTree.floors.map(f => {
      if (f.floorId === floorId) return { ...f, name: newName.trim() };
      return f;
    });
    await handleUpdateTreeFloors(updatedFloors);
  };

  // --- SAUVEGARDE ET ACTIONS DE L'AGENDA (SESSIONS) ---
  const handleSaveChanges = async () => {
    if (!currentSession) return;
    
    const calculatedEnd = currentSession.end_time_mode === 'auto'
      ? calculateEndTime(currentSession.start_time || '09:00', currentSession.planning)
      : currentSession.end_time;

    const { error } = await supabase.from('sessions').update({ 
      tree_id: currentSession.tree_id, 
      drh_ids: currentSession.drh_ids || [],
      planning: currentSession.planning || [],
      start_time: currentSession.start_time || '09:00',
      end_time_mode: currentSession.end_time_mode || 'auto',
      formation_date: currentSession.formation_date || null,
      end_time: calculatedEnd
    }).eq('id', currentSession.id);

    if (error) {
      alert(`❌ Erreur : ${error.message}`);
    } else {
      alert(`🎉 Session "${currentSession.session_code}" enregistrée avec succès !`);
      setViewMode("view");
    }
  };

  const updateCurrentSessionInState = (updatedFields) => {
    setSessions(prevSessions => {
      return prevSessions.map(s => {
        if (String(s.id) !== String(activeSessionId)) return s;
        
        const merged = { ...s, ...updatedFields };
        const mode = merged.end_time_mode || 'auto';
        merged.end_time = mode === 'auto' 
          ? calculateEndTime(merged.start_time || '09:00', merged.planning || []) 
          : merged.end_time;
          
        return merged;
      });
    });
  };

  const handleCreateSession = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const code = newSessionCode.trim().toUpperCase();
    if (!code) return;
    const { data, error } = await supabase.from('sessions').insert([{ 
      session_code: code, 
      created_by: currentUserId, 
      manager_id: currentUserId, 
      tree_id: null, 
      drh_ids: [], 
      planning: [], 
      start_time: '09:00', 
      end_time_mode: 'auto', 
      end_time: '09:00',
      formation_date: newSessionDate
    }]).select().single();
    
    if (error) return alert(error.message);
    
    setSessions(prev => [data, ...prev].sort((a, b) => new Date(b.formation_date) - new Date(a.formation_date)));
    setActiveSessionId(data.id);
    setViewMode("edit");
    setNewSessionCode(''); 
    setActiveModal(null);
  };

  const handleAddDRH = (drhUser) => {
    if (!currentSession) return;
    const currentDrhIds = currentSession.drh_ids || [];
    if (currentDrhIds.includes(drhUser.id)) return;
    
    setDrhEmailsCache(prev => ({ ...prev, [drhUser.id]: drhUser.email }));
    updateCurrentSessionInState({ drh_ids: [...currentDrhIds, drhUser.id] });
    setDrhSearchQuery(''); 
    setDrhSuggestions([]);
  };

  const handleRemoveDRH = (drhId) => {
    if (!currentSession) return;
    updateCurrentSessionInState({ drh_ids: (currentSession.drh_ids || []).filter(id => id !== drhId) });
  };

  // --- VALIDATIONS DE PLACEMENT DRAG & DROP ---
  const getPlacementValidation = (floorId, targetIndex, timeline) => {
    if (!floorId) return { isValid: true };
    
    let prevMaxFloor = -1;
    for (let i = 0; i < targetIndex; i++) {
      if (timeline[i]?.type === 'palier') prevMaxFloor = Math.max(prevMaxFloor, timeline[i].floorId);
    }
    
    let nextMinFloor = 999;
    for (let i = targetIndex; i < timeline.length; i++) {
      if (timeline[i]?.type === 'palier') nextMinFloor = Math.min(nextMinFloor, timeline[i].floorId);
    }

    const isValid = floorId > prevMaxFloor && floorId < nextMinFloor;
    return {
      isValid,
      prevMaxFloor: prevMaxFloor === -1 ? null : prevMaxFloor,
      nextMinFloor: nextMinFloor === 999 ? null : nextMinFloor
    };
  };

  const handleTimelineDrop = (targetIndex) => {
    if (!currentSession || !draggedPlanningItem) return;
    const timeline = currentSession.planning ? JSON.parse(JSON.stringify(currentSession.planning)) : [];

    if (draggedPlanningItem.source === 'palette-palier') {
      const floor = draggedPlanningItem.data;
      const { isValid, prevMaxFloor, nextMinFloor } = getPlacementValidation(floor.floorId, targetIndex, timeline);
      
      if (!isValid) {
        alert(`🚫 Placement invalide.\nLe Palier ${floor.floorId} doit être planifié après le palier ${prevMaxFloor || 'précédent'} et avant le palier ${nextMinFloor || 'suivant'}.`);
        setActiveDropIndex(null); 
        setDraggedPlanningItem(null);
        return;
      }
      const newBlock = {
        id: `palier-${floor.floorId}-${Date.now()}`,
        type: 'palier',
        floorId: floor.floorId,
        duration: 45
      };
      timeline.splice(targetIndex, 0, newBlock);
    } 
    else if (draggedPlanningItem.source === 'palette-custom') {
      const newBlock = {
        id: `custom-${Date.now()}`,
        type: 'custom',
        name: customBlockConfig.name,
        desc: customBlockConfig.desc,
        color: customBlockConfig.color,
        duration: customBlockConfig.duration
      };
      timeline.splice(targetIndex, 0, newBlock);
    } 
    else if (draggedPlanningItem.source === 'timeline') {
      const sourceIndex = draggedPlanningItem.index;
      const [movedBlock] = timeline.splice(sourceIndex, 1);
      
      if (movedBlock.type === 'palier') {
        const { isValid } = getPlacementValidation(movedBlock.floorId, targetIndex, timeline);
        if (!isValid) {
          alert(`🚫 Déplacement invalide pour le Palier ${movedBlock.floorId} (L'ordre chronologique doit être préservé).`);
          setActiveDropIndex(null); 
          setDraggedPlanningItem(null);
          return;
        }
      }
      timeline.splice(targetIndex, 0, movedBlock);
    }

    updateCurrentSessionInState({ planning: timeline });
    setActiveDropIndex(null);
    setDraggedPlanningItem(null);
  };

  const removePlanningBlock = (blockId) => {
    if (!currentSession) return;
    const filtered = (currentSession.planning || []).filter(b => b.id !== blockId);
    updateCurrentSessionInState({ planning: filtered });
  };

  const updatePlanningBlockDuration = (blockId, value) => {
    if (!currentSession) return;
    const mins = Math.max(1, parseInt(value, 10) || 15);
    const updated = (currentSession.planning || []).map(b => b.id === blockId ? { ...b, duration: mins } : b);
    updateCurrentSessionInState({ planning: updated });
  };

  // Convertit les étapes brutes en étapes formatées avec horaires dynamiques et noms résolus de l'arbre
  const getTimelineWithHours = (sessionObj = currentSession) => {
    if (!sessionObj) return [];
    let currentMinutes = 0;
    const [startHours, startMinutes] = (sessionObj.start_time || '09:00').split(':').map(Number);
    if (!isNaN(startHours) && !isNaN(startMinutes)) {
      currentMinutes = startHours * 60 + startMinutes;
    }

    const sTree = trees[sessionObj.tree_id];

    return (sessionObj.planning || []).map(block => {
      const hr = Math.floor(currentMinutes / 60) % 24;
      const min = currentMinutes % 60;
      const timeString = `${String(hr).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      currentMinutes += parseInt(block.duration || 0, 10);

      // Résolution dynamique du nom du palier d'après l'arbre actif de la session
      let finalName = block.name;
      let finalDesc = block.desc;
      let finalColor = block.color;

      if (block.type === 'palier') {
        const matchedFloor = sTree?.floors?.find(f => f.floorId === block.floorId);
        finalName = matchedFloor 
          ? `🎯 Palier ${block.floorId} : ${matchedFloor.name || 'Sans nom'}` 
          : `🎯 Palier ${block.floorId} : (Arbre non associé / vide)`;
        finalDesc = matchedFloor 
          ? `${(matchedFloor.quests || []).length} activités associées.` 
          : 'Aucune donnée.';
        finalColor = '#7c3aed';
      }

      return { 
        ...block, 
        name: finalName,
        desc: finalDesc,
        color: finalColor,
        startTimeFormatted: timeString 
      };
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 pl-24 space-y-6 relative">
      
      {/* HEADER PRINCIPAL ET ONGLETS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-xl border border-slate-200 shadow-xs gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">💼 Espace Formateur</h1>
          <p className="text-xs text-slate-500 font-bold">Configurez les arbres de compétences et planifiez vos sessions de formation.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl border">
          <button 
            onClick={() => setActiveTab('tree')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'tree' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            🌲 Gestion de l'Arbre
          </button>
          <button 
            onClick={() => setActiveTab('sessions')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'sessions' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            📅 Planification Sessions
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ===================== ONGLET 1 : EDITEUR D'ARBRE ======================== */}
      {/* ========================================================================= */}
      {activeTab === 'tree' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* SÉLECTEUR D'ARBRE (GAUCHE) */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">Vos structures d'arbres</h3>
                <button 
                  onClick={() => setActiveModal('tree')} 
                  className="text-blue-700 hover:text-blue-900 font-bold text-xs"
                >
                  ➕ Nouveau
                </button>
              </div>
              
              <div className="space-y-2">
                {Object.values(trees || {}).map(tree => {
                  const isActive = tree.id === activeTreeId;
                  return (
                    <button
                      key={tree.id}
                      onClick={() => {
                        setActiveTreeId(tree.id);
                        setActiveFloorId(null);
                      }}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        isActive 
                          ? 'bg-blue-50/50 border-blue-500 ring-1 ring-blue-400 font-bold' 
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="font-extrabold text-xs text-slate-900 truncate">🌲 {tree.name}</div>
                      <div className="text-[10px] text-slate-500 font-semibold mt-1">
                        {tree.floors?.length || 0} paliers de progression
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* DÉTAIL DE L'ARBRE (DROITE) */}
          <div className="lg:col-span-2">
            {activeTree ? (
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Arbre : {activeTree.name}</h2>
                    <p className="text-xs text-slate-500 font-bold">Ajoutez des missions de type Quête, Boss ou Miniboss sur vos paliers.</p>
                  </div>
                  <button 
                    onClick={handleAddFloor}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-3 py-2 rounded-xl text-[11px] uppercase"
                  >
                    ➕ Ajouter un palier
                  </button>
                </div>

                {/* LISTE DES PALIERS */}
                <div className="space-y-6">
                  {([...(activeTree.floors || [])].sort((a,b) => a.floorId - b.floorId)).map(floor => (
                    <div key={floor.floorId} className="border border-slate-100 rounded-xl bg-slate-50/50 p-5 space-y-4">
                      
                      {/* EN-TÊTE PALIER */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200/50 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="bg-purple-100 text-purple-800 font-black text-xs px-2.5 py-1 rounded-lg border border-purple-200">
                            Palier {floor.floorId}
                          </span>
                          <input 
                            type="text" 
                            value={floor.name} 
                            onChange={(e) => handleRenameFloor(floor.floorId, e.target.value)}
                            className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-800 focus:outline-none font-extrabold text-slate-800 text-xs py-0.5 px-1"
                          />
                        </div>
                        <button
                          onClick={() => {
                            setActiveFloorId(floor.floorId);
                            setActiveModal('quest');
                          }}
                          className="bg-purple-700 hover:bg-purple-800 text-white font-extrabold px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider"
                        >
                          ⚔️ Ajouter une mission
                        </button>
                      </div>

                      {/* COMPÉTENCES ASSOCIÉES */}
                      <div className="space-y-1">
                        <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">🧠 Compétences visées</span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(floor.skills || []).map((skill, sIdx) => (
                            <span key={sIdx} className="bg-blue-50 text-blue-800 font-bold text-[10px] px-2 py-0.5 rounded-md border border-blue-200 flex items-center gap-1">
                              <span>{skill}</span>
                              <button onClick={() => handleRemoveSkillFromFloor(floor.floorId, skill)} className="text-red-500 font-black">×</button>
                            </span>
                          ))}
                          <button
                            onClick={() => {
                              const skillText = prompt("Saisir la nouvelle compétence :");
                              if (skillText) handleAddSkillToFloor(floor.floorId, skillText);
                            }}
                            className="text-[10px] font-black text-blue-700 bg-white hover:bg-blue-50 px-2.5 py-0.5 rounded-md border border-dashed border-blue-300"
                          >
                            ➕ Ajouter compétence
                          </button>
                        </div>
                      </div>

                      {/* QUÊTES/MISSIONS DU PALIER */}
                      <div className="space-y-2">
                        <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">🎯 Missions ({ (floor.quests || []).length })</span>
                        {(floor.quests || []).length === 0 ? (
                          <div className="text-center py-4 bg-white border border-slate-100 rounded-xl text-slate-400 font-semibold text-[11px] italic">
                            Aucune mission configurée sur ce palier de compétences.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {floor.quests.map(quest => (
                              <div key={quest.id} className="bg-white border border-slate-200 rounded-xl p-3 flex justify-between items-start gap-4 shadow-2xs">
                                <div className="space-y-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`px-2 py-0.5 rounded border font-bold text-[9px] uppercase ${getQuestBadgeStyle(quest)}`}>
                                      {quest.difficulty === '3' ? '🔥 Boss' : quest.difficulty === '2' ? '⚡ Miniboss' : '⚔️ Quête'}
                                    </span>
                                    <h4 className="font-extrabold text-xs text-slate-800 truncate">{quest.title}</h4>
                                  </div>
                                  <p className="text-[10px] text-slate-500 font-semibold truncate leading-relaxed">{quest.description}</p>
                                  <div className="text-[9px] font-extrabold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 inline-block">
                                    💎 {quest.points || 100} XP
                                  </div>
                                </div>
                                <button 
                                  onClick={() => handleDeleteQuest(floor.floorId, quest.id)}
                                  className="text-red-500 hover:text-red-700 font-bold text-xs p-1 bg-red-50 hover:bg-red-100 rounded-md"
                                  title="Supprimer la mission"
                                >
                                  🗑️
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-4">
                <span className="text-4xl block">👈</span>
                <h3 className="text-sm font-black text-slate-800 uppercase">Aucun arbre sélectionné</h3>
                <p className="text-xs text-slate-400 font-bold max-w-md mx-auto">Veuillez sélectionner une structure de compétences à gauche ou en créer une nouvelle pour structurer vos paliers d'apprentissage.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ===================== ONGLET 2 : AGENDA & SESSIONS ====================== */}
      {/* ========================================================================= */}
      {activeTab === 'sessions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COLONNE GAUCHE : LISTE DES SESSIONS */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">📅 Liste des sessions</h3>
                <button 
                  onClick={() => setActiveModal('session')} 
                  className="bg-blue-700 hover:bg-blue-800 text-white font-black text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all"
                >
                  ➕ Nouvelle
                </button>
              </div>
              
              <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
                {sessions.map(s => {
                  const isSelected = String(s.id) === String(activeSessionId);
                  const sTree = trees[s.tree_id];
                  const formattedDate = s.formation_date 
                    ? new Date(s.formation_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                    : "Sans date";

                  // Détection des sessions "incomplètes/vides" pour l'alerte visuelle
                  const isPlanningEmpty = !s.planning || s.planning.length === 0;
                  const isTreeEmptyOrMissing = !sTree || !sTree.floors || sTree.floors.length === 0;
                  const hasFinTimeIssue = isPlanningEmpty || isTreeEmptyOrMissing || !s.end_time;

                  return (
                    <div 
                      key={s.id}
                      className={`p-4 rounded-xl border transition-all space-y-4 ${
                        isSelected 
                          ? 'bg-blue-50/50 border-blue-500 shadow-sm ring-1 ring-blue-400' 
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-mono font-black text-xs text-blue-900 bg-blue-100/60 px-2.5 py-1 rounded-md border border-blue-200/50 tracking-wider uppercase">
                          {s.session_code}
                        </span>
                        <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded border">
                          📅 {formattedDate}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-600 space-y-1">
                        <p>🌲 Arbre : <span className="font-extrabold text-slate-800">{sTree ? sTree.name : 'Non associé'}</span></p>
                        
                        {/* ALERTE ROUGE VIF SI AGENDA VIDE OU SANS FIN DEFINIE */}
                        {hasFinTimeIssue ? (
                          <p className="font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded mt-1 text-[10px] animate-pulse inline-block">
                            ⚠️ Incomplet (Arbre ou planning vide)
                          </p>
                        ) : (
                          <p>⏰ Agenda : <span className="font-extrabold text-slate-800 font-mono">{(s.start_time || '09:00')} - {s.end_time_mode === 'auto' ? calculateEndTime(s.start_time, s.planning) : (s.end_time || 'Calculé')}</span></p>
                        )}
                        <p>🔗 Étapes : <span className="font-extrabold text-blue-700">{s.planning?.length || 0} blocs</span></p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => {
                            setActiveSessionId(String(s.id));
                            setViewMode("view");
                          }}
                          className={`py-1.5 px-3 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
                            isSelected && viewMode === "view"
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          👁️ Voir
                        </button>
                        <button
                          onClick={() => {
                            setActiveSessionId(String(s.id));
                            setViewMode("edit");
                          }}
                          className={`py-1.5 px-3 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
                            isSelected && viewMode === "edit"
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          ✏️ Modifier
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* COLONNE DROITE : PRÉVISUALISATION OU MODIFICATION */}
          <div className="lg:col-span-2">
            {currentSession ? (
              <div className="space-y-6">
                
                {/* ==================== MODE LECTURE PLANNING ==================== */}
                {viewMode === "view" && (
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
                    <div className="flex justify-between items-center border-b pb-4">
                      <div>
                        <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">Aperçu de l'agenda</span>
                        <h2 className="text-lg font-black text-slate-900 mt-1">Planning : {currentSession.session_code}</h2>
                        <p className="text-xs text-slate-500 font-bold">📅 Date : {currentSession.formation_date || 'Non planifiée'} | Arbre : {linkedTree ? linkedTree.name : 'Aucun'}</p>
                      </div>
                      <button 
                        onClick={() => setViewMode("edit")}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold px-4 py-2 rounded-xl text-xs uppercase tracking-wider"
                      >
                        ✏️ Éditer le planning
                      </button>
                    </div>

                    <div className="space-y-4 relative pl-4 border-l-2 border-slate-100">
                      {getTimelineWithHours().length === 0 ? (
                        <div className="text-center py-8 text-xs text-slate-400 font-bold">
                          Aucune étape configurée dans cet agenda. Cliquez sur "Éditer" pour structurer la journée.
                        </div>
                      ) : (
                        getTimelineWithHours().map((block) => (
                          <div key={block.id} className="flex items-start gap-4 relative group">
                            <div className="font-mono text-xs font-black text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md border shrink-0">
                              {block.startTimeFormatted}
                            </div>

                            <div 
                              className="bg-white border rounded-xl p-4 shadow-2xs flex-1 transition-all hover:shadow-md cursor-pointer"
                              style={{ borderLeftWidth: '5px', borderLeftColor: block.color || '#cbd5e1' }}
                              onClick={() => {
                                if (block.type === 'palier') {
                                  const matchedFloor = linkedTree?.floors?.find(f => f.floorId === block.floorId);
                                  if (matchedFloor) setSelectedInspectFloor(matchedFloor);
                                }
                              }}
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div>
                                  <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 flex-wrap">
                                    {block.name}
                                    {block.type === 'palier' && (
                                      <span className="text-[9px] bg-purple-100 text-purple-700 font-black px-1.5 py-0.2 rounded border border-purple-200">
                                        🔍 Inspecter le contenu
                                      </span>
                                    )}
                                  </h4>
                                  <p className="text-[10px] text-slate-500 font-semibold mt-1">{block.desc}</p>
                                </div>
                                <span className="text-[11px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                                  ⏱️ {block.duration} min
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* ==================== MODE MODIFIER : DRAG & DROP ==================== */}
                {viewMode === "edit" && (
                  <div className="space-y-6">
                    
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">Édition en cours</span>
                        <h2 className="text-lg font-black text-slate-900 mt-1">Éditeur de {currentSession.session_code}</h2>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={() => setViewMode("view")}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold py-2 px-4 rounded-xl text-xs uppercase"
                        >
                          Annuler
                        </button>
                        <button 
                          type="button"
                          onClick={handleSaveChanges}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2 px-4 rounded-xl text-xs uppercase tracking-wider shadow-xs"
                        >
                          💾 Sauvegarder
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-[10px] uppercase font-black text-slate-500 mb-1">📅 Date</label>
                          <input 
                            type="date" 
                            value={currentSession.formation_date || ''} 
                            onChange={(e) => updateCurrentSessionInState({ formation_date: e.target.value })}
                            className="w-full border rounded-lg p-2 bg-white font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-black text-slate-500 mb-1">⏰ Début</label>
                          <input 
                            type="time" 
                            value={currentSession.start_time || '09:00'} 
                            onChange={(e) => updateCurrentSessionInState({ start_time: e.target.value })}
                            className="w-full border rounded-lg p-2 bg-white font-mono text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-black text-slate-500 mb-1">Calcul Fin</label>
                          <select 
                            value={currentSession.end_time_mode || 'auto'} 
                            onChange={(e) => updateCurrentSessionInState({ end_time_mode: e.target.value })}
                            className="w-full border rounded-lg p-2 bg-white text-xs font-bold"
                          >
                            <option value="auto">🔄 Auto</option>
                            <option value="lock">🔒 Fixe</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-black text-slate-500 mb-1">⏰ Fin</label>
                          <input 
                            type="time" 
                            disabled={currentSession.end_time_mode === 'auto' || !(currentSession.end_time_mode)} 
                            value={
                              currentSession.end_time_mode === 'auto' || !(currentSession.end_time_mode)
                                ? calculateEndTime(currentSession.start_time || '09:00', currentSession.planning)
                                : (currentSession.end_time || '')
                            } 
                            onChange={(e) => {
                              if (currentSession.end_time_mode === 'lock') {
                                updateCurrentSessionInState({ end_time: e.target.value });
                              }
                            }}
                            className="w-full border rounded-lg p-2 font-mono text-xs font-bold bg-white disabled:bg-slate-100 disabled:text-slate-400"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t">
                        <div className="space-y-1">
                          <label className="block font-black text-slate-700 text-[10px] uppercase">🌲 Associer un Arbre :</label>
                          <select 
                            value={currentSession.tree_id || ''}
                            onChange={(e) => updateCurrentSessionInState({ tree_id: e.target.value || null })}
                            className="w-full border rounded-lg p-2 bg-white text-xs font-bold"
                          >
                            <option value="">-- Aucun arbre lié --</option>
                            {Object.values(trees || {}).map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1 relative">
                          <label className="block font-black text-slate-700 text-[10px] uppercase">DRH Associés :</label>
                          <input 
                            type="text"
                            placeholder="Rechercher un e-mail..."
                            value={drhSearchQuery}
                            onChange={(e) => setDrhSearchQuery(e.target.value)}
                            className="w-full border rounded-lg p-2 bg-white text-xs"
                          />
                          {drhSuggestions.length > 0 && (
                            <div className="absolute z-50 left-0 right-0 top-full bg-white border rounded shadow-md mt-1 max-h-32 overflow-y-auto">
                              {drhSuggestions.map(s => (
                                <button 
                                  key={s.id} 
                                  type="button"
                                  onClick={() => handleAddDRH(s)} 
                                  className="block w-full text-left p-2 text-xs font-bold hover:bg-slate-100 border-b"
                                >
                                  {s.email}
                                </button>
                              ))}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {(currentSession.drh_ids || []).map(id => {
                              const matchedEmail = drhEmailsCache[id] || id; 
                              return (
                                <div key={id} className="bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                                  <span>{matchedEmail}</span>
                                  <button type="button" onClick={() => handleRemoveDRH(id)} className="text-red-500 font-black">×</button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* TIMELINE ACTIVE (2/3) */}
                      <div className="md:col-span-2 space-y-3">
                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Plan de la journée (Glissez-déposez pour ordonner)</h4>
                        
                        <div className="space-y-1">
                          {(currentSession.planning || []).length === 0 && (
                            <div 
                              onDragOver={(e) => { e.preventDefault(); setActiveDropIndex(0); }}
                              onDragLeave={() => setActiveDropIndex(null)}
                              onDrop={() => handleTimelineDrop(0)}
                              className={`p-10 border-2 border-dashed rounded-xl text-center text-xs font-bold transition-all ${
                                activeDropIndex === 0 ? 'bg-blue-50 border-blue-400 text-blue-700' : 'bg-slate-50 border-slate-300 text-slate-400'
                              }`}
                            >
                              Déposez des blocs ici pour commencer à planifier.
                            </div>
                          )}

                          {getTimelineWithHours().map((block, index) => {
                            // Évaluation de la validité
                            let isTargetIndexValid = true;
                            let explanationText = "";

                            if (draggedPlanningItem) {
                              let dragFloorId = null;
                              if (draggedPlanningItem.source === 'palette-palier') {
                                dragFloorId = draggedPlanningItem.data?.floorId;
                              } else if (draggedPlanningItem.source === 'timeline') {
                                const sourceBlock = currentSession.planning[draggedPlanningItem.index];
                                if (sourceBlock?.type === 'palier') dragFloorId = sourceBlock.floorId;
                              }

                              if (dragFloorId) {
                                const validation = getPlacementValidation(dragFloorId, index, currentSession.planning);
                                isTargetIndexValid = validation.isValid;
                                if (!isTargetIndexValid) {
                                  explanationText = `Doit être placé après le Palier ${validation.prevMaxFloor || '0'}`;
                                  if (validation.nextMinFloor) {
                                    explanationText += ` et avant le Palier ${validation.nextMinFloor}`;
                                  }
                                }
                              }
                            }

                            return (
                              <React.Fragment key={block.id}>
                                
                                <div 
                                  onDragOver={(e) => { e.preventDefault(); setActiveDropIndex(index); }}
                                  onDragLeave={() => setActiveDropIndex(null)}
                                  onDrop={() => handleTimelineDrop(index)}
                                  className={`transition-all rounded-xl border-2 border-dashed flex items-center justify-center font-bold text-[11px] ${
                                    activeDropIndex === index 
                                      ? isTargetIndexValid 
                                        ? 'bg-emerald-50/90 border-emerald-500 text-emerald-700 h-14 my-2'
                                        : 'bg-red-50/90 border-red-500 text-red-700 h-14 my-2'
                                      : draggedPlanningItem 
                                        ? 'border-slate-300/40 bg-slate-50/20 h-6 my-1 text-slate-400/80 hover:bg-slate-100' 
                                        : 'bg-transparent h-2 border-none'
                                  }`}
                                >
                                  {activeDropIndex === index && (
                                    <span>
                                      {isTargetIndexValid 
                                        ? '🟢 Déposer ici (Valide)' 
                                        : `❌ Position interdite (${explanationText})`
                                      }
                                    </span>
                                  )}
                                </div>
                                
                                <div 
                                  draggable
                                  onDragStart={() => setDraggedPlanningItem({ source: 'timeline', index })}
                                  onDragEnd={() => { setDraggedPlanningItem(null); setActiveDropIndex(null); }}
                                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex items-center justify-between gap-4 transition-all"
                                  style={{ borderLeftWidth: '6px', borderLeftColor: block.color || '#94a3b8' }}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-slate-400 cursor-grab active:cursor-grabbing font-bold text-sm">⠿</span>
                                    <div className="min-w-0">
                                      <h5 className="font-extrabold text-slate-800 text-xs truncate flex items-center gap-1.5 flex-wrap">
                                        {block.name}
                                        {block.type === 'palier' && (
                                          <button 
                                            type="button"
                                            onClick={() => {
                                              const matchedFloor = linkedTree?.floors?.find(f => f.floorId === block.floorId);
                                              if (matchedFloor) setSelectedInspectFloor(matchedFloor);
                                            }}
                                            className="text-[9px] text-purple-600 bg-purple-50 hover:bg-purple-100 border px-1.5 py-0.5 rounded font-black cursor-pointer"
                                          >
                                            🔍 Inspecter
                                          </button>
                                        )}
                                      </h5>
                                      <p className="text-[10px] text-slate-400 font-bold truncate">{block.desc}</p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3 flex-shrink-0">
                                    <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border">
                                      <input 
                                        type="number" 
                                        min="1"
                                        value={block.duration || 15}
                                        onChange={(e) => updatePlanningBlockDuration(block.id, e.target.value)}
                                        className="w-10 text-center bg-white border rounded p-0.5 font-black text-slate-900 text-xs"
                                      />
                                      <span className="text-[10px] font-black text-slate-400">min</span>
                                    </div>
                                    <button 
                                      type="button"
                                      onClick={() => removePlanningBlock(block.id)} 
                                      className="text-red-500 hover:text-red-700 font-bold text-xs bg-red-50 p-1 rounded-lg"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </div>
                              </React.Fragment>
                            );
                          })}

                          {/* ZONE DE CHUTE EN FIN DE PLANNING */}
                          {(currentSession.planning || []).length > 0 && (
                            (() => {
                              const lastIndex = currentSession.planning.length;
                              let isTargetIndexValid = true;
                              let explanationText = "";

                              if (draggedPlanningItem) {
                                let dragFloorId = null;
                                if (draggedPlanningItem.source === 'palette-palier') {
                                  dragFloorId = draggedPlanningItem.data?.floorId;
                                } else if (draggedPlanningItem.source === 'timeline') {
                                  const sourceBlock = currentSession.planning[draggedPlanningItem.index];
                                  if (sourceBlock?.type === 'palier') dragFloorId = sourceBlock.floorId;
                                }

                                if (dragFloorId) {
                                  const validation = getPlacementValidation(dragFloorId, lastIndex, currentSession.planning);
                                  isTargetIndexValid = validation.isValid;
                                  if (!isTargetIndexValid) {
                                    explanationText = `Doit s'insérer après le Palier ${validation.prevMaxFloor || '0'}`;
                                  }
                                }
                              }

                              return (
                                <div 
                                  onDragOver={(e) => { e.preventDefault(); setActiveDropIndex(lastIndex); }}
                                  onDragLeave={() => setActiveDropIndex(null)}
                                  onDrop={() => handleTimelineDrop(lastIndex)}
                                  className={`transition-all rounded-xl border-2 border-dashed flex items-center justify-center font-bold text-[11px] ${
                                    activeDropIndex === lastIndex 
                                      ? isTargetIndexValid 
                                        ? 'bg-emerald-50/90 border-emerald-500 text-emerald-700 h-14 my-2'
                                        : 'bg-red-50/90 border-red-500 text-red-700 h-14 my-2'
                                      : draggedPlanningItem 
                                        ? 'border-slate-300/40 bg-slate-50/20 h-6 my-1 text-slate-400/80 hover:bg-slate-100' 
                                        : 'bg-transparent h-2 border-none'
                                  }`}
                                >
                                  {activeDropIndex === lastIndex && (
                                    <span>
                                      {isTargetIndexValid 
                                        ? '🟢 Déposer en fin d\'agenda (Valide)' 
                                        : `❌ Position interdite (${explanationText})`
                                      }
                                    </span>
                                  )}
                                </div>
                              );
                            })()
                          )}
                        </div>
                      </div>

                      {/* PALETTE D'ACTIVITES (1/3) : BLOC PERSONNALISÉ EN PREMIER */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">🛠️ Palette</h4>
                        
                        {/* BLOC PERSO */}
                        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs">
                          <span className="block text-[10px] font-black uppercase text-blue-700">Bloc personnalisé</span>
                          <input 
                            type="text"
                            placeholder="Ex: Pause Café, Restitution..."
                            value={customBlockConfig.name}
                            onChange={(e) => setCustomBlockConfig({ ...customBlockConfig, name: e.target.value })}
                            className="w-full border rounded p-1.5 bg-slate-50 font-extrabold text-xs"
                          />
                          <div 
                            draggable
                            onDragStart={() => setDraggedPlanningItem({ source: 'palette-custom' })}
                            onDragEnd={() => { setDraggedPlanningItem(null); setActiveDropIndex(null); }}
                            className="bg-white hover:bg-slate-50 p-2.5 rounded-lg border border-dashed border-slate-300 cursor-grab active:cursor-grabbing flex justify-between items-center transition-all shadow-3xs"
                            style={{ borderLeftWidth: '5px', borderLeftColor: customBlockConfig.color }}
                          >
                            <span className="font-extrabold text-xs truncate">{customBlockConfig.name}</span>
                            <span className="text-[10px] bg-slate-100 px-1.5 py-0.2 rounded font-bold">{customBlockConfig.duration}m</span>
                          </div>
                        </div>

                        {/* LISTE DES PALIERS DE L'ARBRE ASSOCIE */}
                        {linkedTree ? (
                          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-2xs">
                            <span className="block text-[10px] font-black uppercase text-purple-700">Paliers ({linkedTree.name})</span>
                            {(linkedTree.floors || []).map(floor => (
                              <div
                                key={floor.floorId}
                                draggable
                                onDragStart={() => setDraggedPlanningItem({ source: 'palette-palier', data: floor })}
                                onDragEnd={() => { setDraggedPlanningItem(null); setActiveDropIndex(null); }}
                                className="bg-purple-50 border border-purple-200 hover:bg-purple-100 p-2.5 rounded-lg cursor-grab active:cursor-grabbing flex justify-between items-center transition-all"
                              >
                                <div className="min-w-0">
                                  <span className="font-extrabold text-xs text-purple-900 block truncate">🎯 Palier {floor.floorId} : {floor.name || 'Sans nom'}</span>
                                  <span className="text-[9px] text-purple-500 font-bold">{(floor.quests || []).length} activités</span>
                                </div>
                                <span className="text-[10px] bg-purple-700 text-white font-extrabold px-2 py-0.5 rounded-md shrink-0 ml-1">45m</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-slate-100 rounded-xl p-4 text-center text-[10px] font-bold text-slate-500">
                            Associez un arbre ci-dessus pour débloquer ses paliers.
                          </div>
                        )}
                      </div>

                    </div>

                  </div>
                )}

              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-4">
                <span className="text-4xl block">👈</span>
                <h3 className="text-sm font-black text-slate-800 uppercase">Aucune session sélectionnée</h3>
                <p className="text-xs text-slate-400 font-bold max-w-md mx-auto">Choisissez une session dans le panneau de gauche.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* ==================== INSPECTEUR DE CONTENU PALIER ======================= */}
      {/* ========================================================================= */}
      {selectedInspectFloor && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-end z-50 transition-all">
          <div className="bg-white h-full max-w-lg w-full p-6 shadow-2xl overflow-y-auto border-l flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b pb-4 mb-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">🔍 Inspecteur de Contenu</span>
                  <h3 className="text-sm font-black text-slate-900 mt-1">Palier {selectedInspectFloor.floorId} : {selectedInspectFloor.name || 'Général'}</h3>
                </div>
                <button 
                  onClick={() => setSelectedInspectFloor(null)} 
                  className="text-slate-400 hover:text-slate-600 font-black text-xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <h4 className="font-bold text-slate-500 uppercase text-[10px] mb-2">🎯 Quêtes & Exercices de ce palier :</h4>
                  {(() => {
                    const inlineQuests = selectedInspectFloor.quests || [];
                    const linkedGlobalQuests = (quests || []).filter(
                      q => String(q.floor_id) === String(selectedInspectFloor.floorId) || 
                           String(q.floorId) === String(selectedInspectFloor.floorId)
                    );

                    const allMergedQuests = [...inlineQuests];
                    linkedGlobalQuests.forEach(gq => {
                      if (!allMergedQuests.some(iq => String(iq.id) === String(gq.id))) {
                        allMergedQuests.push(gq);
                      }
                    });

                    if (allMergedQuests.length === 0) {
                      return (
                        <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-400 italic">
                          Aucune quête trouvée pour ce palier.
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2">
                        {allMergedQuests.map((q, qIndex) => (
                          <div key={q.id || qIndex} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                            <div className="flex justify-between items-start gap-2">
                              <p className="font-extrabold text-slate-900">
                                ⚔️ {q.title || q.name || "Activité sans titre"}
                              </p>
                              {q.level && (
                                <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-mono font-bold">
                                  Niv. {q.level}
                                </span>
                              )}
                            </div>
                            <p className="text-slate-500 text-[10px] leading-relaxed">
                              {q.description || q.desc || "Pas de description fournie."}
                            </p>
                            {(q.points || q.xp) && (
                              <span className="inline-block text-[9px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded mt-1">
                                💎 {q.points || q.xp} XP
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {selectedInspectFloor.skills && selectedInspectFloor.skills.length > 0 && (
                  <div>
                    <h4 className="font-bold text-slate-500 uppercase text-[10px] mb-2">🧠 Compétences évaluées :</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedInspectFloor.skills.map((skill, sIdx) => (
                        <span key={sIdx} className="bg-blue-50 text-blue-700 font-bold px-2 py-1 rounded-md border border-blue-200 text-[10px]">
                          💡 {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t pt-4 mt-6">
              <button 
                onClick={() => setSelectedInspectFloor(null)}
                className="w-full bg-slate-950 text-white font-extrabold py-2.5 rounded-xl text-xs uppercase tracking-wider"
              >
                Fermer l'inspecteur
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ========================= MODALES CONFIGURATION ========================= */}
      {/* ========================================================================= */}
      
      {/* MODALE ARBRE */}
      {activeModal === 'tree' && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border">
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-extrabold text-lg">×</button>
            <h3 className="text-md font-black text-slate-950 uppercase tracking-wide mb-4">🌲 Nouveau Modèle d'Arbre</h3>
            <form onSubmit={handleCreateTree} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Nom de la structure :</label>
                <input type="text" required placeholder="Ex: Devenir Scrum Master, Soft Skills..." value={newTreeName} onChange={(e) => setNewTreeName(e.target.value)} className="w-full border rounded-lg p-2.5 bg-slate-50 font-bold" />
              </div>
              <button type="submit" className="w-full bg-blue-700 text-white font-bold py-2.5 rounded-xl uppercase tracking-wider">Créer le modèle</button>
            </form>
          </div>
        </div>
      )}

      {/* MODALE CRÉATION QUÊTE/MISSION */}
      {activeModal === 'quest' && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border">
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-extrabold text-lg">×</button>
            <h3 className="text-md font-black text-slate-950 uppercase tracking-wide mb-4">⚔️ Nouvelle Mission (Palier {activeFloorId})</h3>
            <form onSubmit={handleCreateQuest} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Titre de la mission :</label>
                <input type="text" required placeholder="Ex: Mettre en place un Daily Standup" value={newQuestTitle} onChange={(e) => setNewQuestTitle(e.target.value)} className="w-full border rounded-lg p-2.5 bg-slate-50 font-bold" />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">Description / Objectif :</label>
                <textarea required placeholder="Décrire le déroulement ou les critères de validation..." value={newQuestDesc} onChange={(e) => setNewQuestDesc(e.target.value)} className="w-full border rounded-lg p-2.5 bg-slate-50 font-semibold" rows={3} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">XP :</label>
                  <input type="number" value={newQuestPoints} onChange={(e) => setNewQuestPoints(e.target.value)} className="w-full border rounded-lg p-2 bg-slate-50 font-bold text-center" />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Thématique :</label>
                  <select value={newQuestTheme} onChange={(e) => setNewQuestTheme(e.target.value)} className="w-full border rounded-lg p-2 bg-slate-50 font-bold">
                    <option value="tech">💻 Technique</option>
                    <option value="social">🤝 Soft-Skills</option>
                    <option value="env">🌱 Impact</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Type :</label>
                  <select value={newQuestDifficulty} onChange={(e) => setNewQuestDifficulty(e.target.value)} className="w-full border rounded-lg p-2 bg-slate-50 font-bold">
                    <option value="1">⚔️ Quête standard</option>
                    <option value="2">⚡ Miniboss</option>
                    <option value="3">🔥 Boss final</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full bg-purple-700 text-white font-bold py-2.5 rounded-xl uppercase tracking-wider">Créer la mission</button>
            </form>
          </div>
        </div>
      )}

      {/* MODALE CRÉATION SESSION */}
      {activeModal === 'session' && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border">
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-extrabold text-lg">×</button>
            <h3 className="text-md font-black text-slate-950 uppercase tracking-wide">💡 Créer une Session</h3>
            <form onSubmit={handleCreateSession} className="space-y-4 text-xs mt-4">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Code d'accès unique :</label>
                <input type="text" required placeholder="QALIOPI" value={newSessionCode} onChange={(e) => setNewSessionCode(e.target.value)} className="w-full border rounded-lg p-2.5 bg-slate-50 font-mono font-bold uppercase tracking-wider text-center text-sm" />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">Date de la formation :</label>
                <input type="date" value={newSessionDate} onChange={(e) => setNewSessionDate(e.target.value)} className="w-full border rounded-lg p-2.5 bg-slate-50 font-bold text-xs" />
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl uppercase tracking-wider transition-all">Générer la session</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
