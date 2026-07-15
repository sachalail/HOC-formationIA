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

// Fonction pour calculer l'heure de fin automatique selon la somme des durées des blocs du planning
const calculateEndTime = (startTime, blocks = []) => {
  if (!startTime) return '';
  
  const totalMinutes = blocks.reduce((acc, block) => {
    const duration = parseInt(block.duration || block.duration_minutes || 0, 10);
    return acc + (isNaN(duration) ? 0 : duration);
  }, 0);

  const [startHours, startMinutes] = startTime.split(':').map(Number);
  if (isNaN(startHours) || iSNaN(startMinutes)) return startTime;

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
  
  // États de sélection
  const [activeTreeId, setActiveTreeId] = useState("");
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState("");
  
  // Modale active ('quest', 'tree', 'session', 'tree_browser' ou null)
  const [activeModal, setActiveModal] = useState(null); 

  // États des formulaires
  const [newQuestName, setNewQuestName] = useState('');
  const [newQuestDesc, setNewQuestDesc] = useState('');
  const [newQuestTheme, setNewQuestTheme] = useState('social');
  const [newQuestType, setNewQuestType] = useState('normal'); 
  const [newSessionCode, setNewSessionCode] = useState('');
  const [newTreeName, setNewTreeName] = useState('');
  const [newFloorMode, setNewFloorMode] = useState('static');

  // Mode collaboratif
  const [isCollaborative, setIsCollaborative] = useState(false);
  const [requiredPartners, setRequiredPartners] = useState(2);

  // Index du palier en cours de déplacement (Drag & Drop Architecture Arbre)
  const [draggedFloorIndex, setDraggedFloorIndex] = useState(null);

  // Recherche RH & Cache de correspondance ID -> Email
  const [drhSearchQuery, setDrhSearchQuery] = useState('');
  const [drhSuggestions, setDrhSuggestions] = useState([]);

  // Recherche et filtres du Pool de Missions (à droite)
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTheme, setFilterTheme] = useState('all'); 
  const [filterDifficulty, setFilterDifficulty] = useState('all'); 

  // Gestion et exploration des arbres
  const [treeBrowserTab, setTreeBrowserTab] = useState('local'); // 'local' ou 'shared'
  const [treeSearchQuery, setTreeSearchQuery] = useState('');

  // --- NOUVEAUX ÉTATS POUR LE PLANNING DE SESSION ---
  // Un bloc personnalisé en cours de création dans la palette
  const [customBlockConfig, setCustomBlockConfig] = useState({
    name: 'Pause Café / Réflexion',
    desc: 'Un moment de débrief libre ou de pause active',
    color: '#3b82f6', // Bleu par défaut
    duration: 15
  });

  // dragItem tracker pour le planning de session
  // Peut être { source: 'palette-palier', data: floor } ou { source: 'palette-custom' } ou { source: 'timeline', index: number }
  const [draggedPlanningItem, setDraggedPlanningItem] = useState(null);
  // Pour le survol des zones de dépôt du planning
  const [activeDropIndex, setActiveDropIndex] = useState(null);

  // 1. CHARGEMENT INITIAL (USER, ARBRES & SESSIONS DEPUIS LA BDD)
  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserId(session.user.id);
        fetchSessions(session.user.id);
        fetchTrees();
      }
    };
    fetchInitialData();
  }, []);

  const fetchSessions = async (userId) => {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('id', { ascending: false }) 
    .eq('created_by', userId);

  if (data && !error) {
    // S'assurer que chaque session récupérée a bien un tableau pour 'planning'
    const mappedSessions = data.map(s => ({
      ...s,
      planning: s.planning || []
    }));
    setSessions(mappedSessions);
    
    const allDrhIds = mappedSessions.flatMap(s => s.drh_ids || []);
    if (allDrhIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, email').in('id', allDrhIds);
      if (profiles) {
        const emailCache = JSON.parse(localStorage.getItem('drh_emails') || '{}');
        profiles.forEach(p => { emailCache[p.id] = p.email; });
        localStorage.setItem('drh_emails', JSON.stringify(emailCache));
      }
    }
  }
};

  const fetchTrees = async () => {
    const { data, error } = await supabase.from('trees').select('*');
    if (data && !error && data.length > 0) {
      const treesMap = {};
      data.forEach(t => { treesMap[t.id] = t; });
      if (typeof setTrees === 'function') setTrees(treesMap);
      
      if (!activeTreeId) {
        const firstOwned = data.find(t => t.owner_id === currentUserId) || data[0];
        setActiveTreeId(firstOwned.id);
      }
    }
  };

  const currentTree = trees[activeTreeId];
  const currentSession = sessions.find(s => String(s.id) === String(activeSessionId));
  const isOwnerOfCurrentTree = currentTree && currentTree.owner_id === currentUserId;

  // Recherche dynamique de DRH
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

  // Filtrage des quêtes (Axe RSE à droite)
  const safeQuestsList = quests || [];
  const filteredQuests = safeQuestsList.filter(q => {
    if (!q) return false;
    const matchesSearch = (q.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (q.desc || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTheme = filterTheme === 'all' || q.theme === filterTheme;
    const matchesDifficulty = filterDifficulty === 'all' || Number(q.difficulty) === Number(filterDifficulty);
    return matchesSearch && matchesTheme && matchesDifficulty;
  }).sort((a, b) => (a.theme || '').localeCompare(b.theme || ''));  

  // Recalcul de la contrainte maximale d'équipe
  const recalculateAndSaveMaxTeamConstraint = async (treeId, floorsArray) => {
    if (!treeId || !floorsArray) return;
    const attachedQuestIds = floorsArray.flatMap(f => f.quests || []);
    const linkedQuests = safeQuestsList.filter(q => attachedQuestIds.includes(q.id));
    const maxConstraint = linkedQuests.reduce((max, q) => {
      if (q.is_collaborative || q.is_collaborative === 'true') return Math.max(max, Number(q.required_partners) || 2);
      return max;
    }, 1);

    await supabase.from('trees').update({ max_team_constraint: maxConstraint }).eq('id', treeId);
    if (typeof setTrees === 'function') {
      setTrees(prev => (!prev[treeId] ? prev : { ...prev, [treeId]: { ...prev[treeId], max_team_constraint: maxConstraint } }));
    }
  };

  // Sauvegarde globale
  const handleSaveChanges = async () => {
    if (activeTab === 'tree' && currentTree) {
      if (!isOwnerOfCurrentTree) {
        alert("⚠️ Mode lecture seule.");
        return;
      }
      const { error } = await supabase.from('trees').update({ floors: currentTree.floors || [] }).eq('id', currentTree.id);
      if (error) alert(`❌ Erreur : ${error.message}`);
      else {
        await recalculateAndSaveMaxTeamConstraint(currentTree.id, currentTree.floors);
        alert(`🎉 Arbre enregistré !`);
      }
    } 
    if (activeTab === 'sessions' && currentSession) {
      // Sauvegarde de l'arbre relié, des DRH, du planning et des horaires temporels
      const { error } = await supabase.from('sessions').update({ 
        tree_id: currentSession.tree_id, 
        drh_ids: currentSession.drh_ids || [],
        planning: currentSession.planning || [], // Sauvegarde directe du planning en colonne JSONB
        start_time: currentSession.start_time || '09:00',
        end_time_mode: currentSession.end_time_mode || 'auto',
        end_time: currentSession.end_time_mode === 'auto'
          ? calculateEndTime(currentSession.start_time || '09:00', currentSession.planning)
          : currentSession.end_time
      }).eq('id', currentSession.id);
      if (error) alert(`❌ Erreur : ${error.message}`);
      else alert(`🎉 Configuration de la session et planning enregistrés !`);
    }
  };

  const handleShareTree = async () => {
    if (!currentTree || !isOwnerOfCurrentTree) return;
    const { error } = await supabase.from('trees').update({ visibility: 'public' }).eq('id', currentTree.id);
    if (error) alert(error.message);
    else {
      if (typeof setTrees === 'function') setTrees(prev => ({ ...prev, [currentTree.id]: { ...prev[currentTree.id], visibility: 'public' } }));
      alert(`🌍 Arbre partagé !`);
    }
  };

  const handleDuplicateTreeAsLocal = async (treeToCopy) => {
    if (!treeToCopy) return;
    const { data, error } = await supabase.from('trees').insert([{ name: `${treeToCopy.name} (Copie locale)`, owner_id: currentUserId, floors: treeToCopy.floors || [], visibility: 'private', max_team_constraint: treeToCopy.max_team_constraint || 1 }]).select().single();
    if (error) return alert(error.message);
    if (typeof setTrees === 'function') setTrees(prev => ({ ...prev, [data.id]: data }));
    setActiveTreeId(data.id);
    setActiveModal(null);
  };

  const updateCurrentTreeInState = (updatedFields) => {
    if (!currentTree || !isOwnerOfCurrentTree) return;
    if (typeof setTrees === 'function') setTrees(prev => ({ ...prev, [activeTreeId]: { ...currentTree, ...updatedFields } }));
  };

  const updateCurrentSessionInState = (updatedFields) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== activeSessionId) return s;
      const merged = { ...s, ...updatedFields };
      const mode = merged.end_time_mode || 'auto';
      const finalEndTime = mode === 'auto' 
        ? calculateEndTime(merged.start_time || '09:00', merged.planning || []) 
        : merged.end_time;
      return { ...merged, end_time: finalEndTime };
    }));
  };

  // Paliers d'arbres & Drag and drop d'architecture (Onglet ARBRE)
  const handleAddFloor = () => {
    if (!currentTree || !isOwnerOfCurrentTree) return;
    const floors = currentTree.floors ? [...currentTree.floors] : [];
    const nextFloorId = floors.length > 0 ? Math.max(...floors.map(f => f.floorId || 0)) + 1 : 1;
    const updatedFloors = [...floors, { floorId: nextFloorId, mode: newFloorMode, quests: [], count: 2, allowedDifficulties: [1, 2, 3] }];
    updateCurrentTreeInState({ floors: updatedFloors });
    recalculateAndSaveMaxTeamConstraint(currentTree.id, updatedFloors);
  };

  const handleRemoveFloor = (floorId) => {
    if (!currentTree || !currentTree.floors || !isOwnerOfCurrentTree) return;
    const updatedFloors = currentTree.floors.filter(f => f.floorId !== floorId).map((f, i) => ({ ...f, floorId: i + 1 }));
    updateCurrentTreeInState({ floors: updatedFloors });
    recalculateAndSaveMaxTeamConstraint(currentTree.id, updatedFloors);
  };

  const handleDragStart = (index) => { if (isOwnerOfCurrentTree) setDraggedFloorIndex(index); };
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (index) => {
    if (draggedFloorIndex === null || draggedFloorIndex === index) return;
    const updatedFloors = [...currentTree.floors];
    const [draggedItem] = updatedFloors.splice(draggedFloorIndex, 1);
    updatedFloors.splice(index, 0, draggedItem);
    const reindexedFloors = updatedFloors.map((f, i) => ({ ...f, floorId: i + 1 }));
    updateCurrentTreeInState({ floors: reindexedFloors });
    recalculateAndSaveMaxTeamConstraint(currentTree.id, reindexedFloors);
    setDraggedFloorIndex(null);
  };

  const toggleFloorMode = (floorId) => {
    if (!currentTree || !currentTree.floors || !isOwnerOfCurrentTree) return;
    updateCurrentTreeInState({ floors: currentTree.floors.map(f => f.floorId === floorId ? { ...f, mode: f.mode === 'static' ? 'random' : 'static' } : f) });
  };

  const handleCountChange = (floorId, val) => {
    if (!currentTree || !currentTree.floors || !isOwnerOfCurrentTree) return;
    updateCurrentTreeInState({ floors: currentTree.floors.map(f => f.floorId === floorId ? { ...f, count: Math.max(1, parseInt(val, 10) || 1) } : f) });
  };

  const handleToggleDifficultyInFloor = (floorId, diffLevel) => {
    if (!currentTree || !currentTree.floors || !isOwnerOfCurrentTree) return;
    updateCurrentTreeInState({
      floors: currentTree.floors.map(f => {
        if (f.floorId !== floorId) return f;
        const currentDiffs = f.allowedDifficulties || [1, 2, 3];
        const nextDiffs = currentDiffs.includes(Number(diffLevel)) ? currentDiffs.filter(d => Number(d) !== Number(diffLevel)) : [...currentDiffs, Number(diffLevel)];
        return { ...f, allowedDifficulties: nextDiffs.map(d => Number(d)) };
      })
    });
  };

  const handleToggleQuestInFloor = (floorId, questId) => {
    if (!currentTree || !currentTree.floors || !isOwnerOfCurrentTree) return;
    const updatedFloors = currentTree.floors.map(f => {
      if (f.floorId !== floorId) return f;
      const currentQuests = f.quests || [];
      return { ...f, quests: currentQuests.includes(questId) ? currentQuests.filter(id => id !== questId) : [...currentQuests, questId] };
    });
    updateCurrentTreeInState({ floors: updatedFloors });
    recalculateAndSaveMaxTeamConstraint(currentTree.id, updatedFloors);
  };

  // Créations formulaires modales
  const handleCreateTree = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newTreeName.trim()) return;
    const { data, error } = await supabase.from('trees').insert([{ name: newTreeName.trim(), owner_id: currentUserId, floors: [], visibility: 'private', max_team_constraint: 1, max_user: 100 }]).select().single();
    if (error) return;
    if (typeof setTrees === 'function') setTrees(prev => ({ ...prev, [data.id]: data }));
    setActiveTreeId(data.id);
    setNewTreeName('');
    setActiveModal(null);
  };

  const handleCreateQuest = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newQuestName || !newQuestDesc) return;
    const calculatedDifficulty = newQuestType === 'boss' ? 3 : newQuestType === 'miniboss' ? 2 : 1;
    const { data, error } = await supabase.from('quests').insert([{ name: newQuestName, desc: newQuestDesc, theme: newQuestTheme, difficulty: String(calculatedDifficulty), owner_id: currentUserId, visibility: 'private', is_collaborative: isCollaborative, required_partners: isCollaborative ? (requiredPartners || 2) : 2 }]).select().single();
    if (error) return;
    if (typeof setQuests === 'function') setQuests(prev => [...(prev || []), data]);
    setNewQuestName(''); setNewQuestDesc(''); setIsCollaborative(false); setActiveModal(null);
  };

  const handleCreateSession = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const code = newSessionCode.trim().toUpperCase();
    if (!code) return;
    const { data, error } = await supabase.from('sessions').insert([{ session_code: code, created_by: currentUserId, manager_id: currentUserId, tree_id: activeTreeId || null, drh_ids: [], planning: [], start_time: '09:00', end_time_mode: 'auto', end_time: '09:00' }]).select().single();
    if (error) return alert(error.message);
    setSessions(prev => [data, ...prev]);
    setActiveSessionId(data.id);
    setNewSessionCode(''); 
    setActiveModal(null);
  };

  const handleAddDRH = (drhUser) => {
    if (!currentSession) return;
    const currentDrhIds = currentSession.drh_ids || [];
    if (currentDrhIds.includes(drhUser.id)) return;
    updateCurrentSessionInState({ drh_ids: [...currentDrhIds, drhUser.id] });
    const emailCache = JSON.parse(localStorage.getItem('drh_emails') || '{}');
    emailCache[drhUser.id] = drhUser.email;
    localStorage.setItem('drh_emails', JSON.stringify(emailCache));
    setDrhSearchQuery(''); setDrhSuggestions([]);
  };

  const handleRemoveDRH = (drhId) => {
    if (!currentSession) return;
    updateCurrentSessionInState({ drh_ids: (currentSession.drh_ids || []).filter(id => id !== drhId) });
  };

  const filteredBrowsedTrees = Object.values(trees || {}).filter(t => {
    if (!t) return false;
    const matchesSearch = (t.name || '').toLowerCase().includes(treeSearchQuery.toLowerCase());
    return treeBrowserTab === 'local' ? (matchesSearch && t.owner_id === currentUserId) : (matchesSearch && t.visibility === 'public');
  });

  // --- LOGIQUE ET VALIDATEURS DRAG & DROP DU PLANNING SESSIONS ---
  const checkPlacementValidity = (floorId, targetIndex, timeline) => {
    if (!floorId) return true; // Les blocs personnalisés n'ont pas de contrainte de palier
    
    // Trouver le palier le plus haut placé AVANT le point de dépôt
    let prevMaxFloor = -1;
    for (let i = 0; i < targetIndex; i++) {
      if (timeline[i]?.type === 'palier') {
        prevMaxFloor = Math.max(prevMaxFloor, timeline[i].floorId);
      }
    }

    // Trouver le palier le plus bas placé APRÈS le point de dépôt
    let nextMinFloor = 999;
    for (let i = targetIndex; i < timeline.length; i++) {
      if (timeline[i]?.type === 'palier') {
        nextMinFloor = Math.min(nextMinFloor, timeline[i].floorId);
      }
    }

    // Le palier courant doit être strictement supérieur aux précédents, et strictement inférieur aux suivants
    return floorId > prevMaxFloor && floorId < nextMinFloor;
  };

  const handleTimelineDrop = (targetIndex) => {
    if (!currentSession || !draggedPlanningItem) return;
    const timeline = currentSession.planning ? [...currentSession.planning] : [];

    if (draggedPlanningItem.source === 'palette-palier') {
      const floor = draggedPlanningItem.data;
      if (!checkPlacementValidity(floor.floorId, targetIndex, timeline)) {
        alert(`🚫 Ordre incorrect : Le Palier ${floor.floorId} ne respecte pas la chronologie d'exécution des paliers.`);
        setActiveDropIndex(null);
        setDraggedPlanningItem(null);
        return;
      }
      const newBlock = {
        id: `palier-${floor.floorId}-${Date.now()}`,
        type: 'palier',
        floorId: floor.floorId,
        name: `🎯 Palier ${floor.floorId}`,
        desc: `Passage obligatoire par les paliers de l'arbre associé.`,
        color: '#7c3aed', // Violet royal pour paliers
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
      
      // Si c'est un palier, on re-vérifie la cohérence du nouvel emplacement
      if (movedBlock.type === 'palier' && !checkPlacementValidity(movedBlock.floorId, targetIndex, timeline)) {
        alert(`🚫 Mouvement invalide : Re-positionnement impossible.`);
        setActiveDropIndex(null);
        setDraggedPlanningItem(null);
        return;
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

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 pl-24 space-y-6 relative">
      {/* SÉLECTEUR D'ONGLETS ET EN-TÊTE PRINCIPAL */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-xs gap-4">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button 
            onClick={() => setActiveTab('tree')}
            className={`px-4 py-2 rounded-lg transition-all ${activeTab === 'tree' ? 'bg-white text-purple-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            🌳 Architecture de l'Arbre
          </button>
          <button 
            onClick={() => {
              setActiveTab('sessions');
              setActiveSessionId(''); // Permet de ré-afficher la grille de sélection
            }}
            className={`px-4 py-2 rounded-lg transition-all ${activeTab === 'sessions' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            🔗 Liaison & Planning Sessions ({sessions.length})
          </button>
        </div>

        {activeTab === 'tree' && currentTree && (
          <div className="flex items-center gap-2 text-xs font-bold w-full sm:w-auto justify-end">
            <span className="text-purple-700 font-black bg-purple-100/80 px-3 py-1.5 rounded-lg border border-purple-200">
              👥 Taille groupe max : <span className="text-sm font-black text-purple-900">{currentTree.max_team_constraint || 1}</span>
            </span>
            <button 
              onClick={() => setActiveModal('tree_browser')}
              className="bg-purple-50 border border-purple-200 rounded-lg p-2 text-purple-900 font-bold min-w-[180px] flex justify-between items-center hover:bg-purple-100"
            >
              <span className="truncate">{currentTree.name}</span>
              <span className="text-[10px] ml-2">🔍 Changer...</span>
            </button>
          </div>
        )}
      </div>

      {activeTab === 'tree' && currentTree && !isOwnerOfCurrentTree && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 font-bold flex justify-between items-center">
          <span>🔒 Mode Lecture Seule (Propriétaire distant).</span>
          <button onClick={() => handleDuplicateTreeAsLocal(currentTree)} className="bg-amber-600 text-white font-extrabold px-3 py-1.5 rounded-lg text-[11px] uppercase transition-all">Dupliquer en local</button>
        </div>
      )}

      {/* ZONE DE CONTENU PRINCIPALE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* COLONNE GAUCHE/CENTRE */}
        <div className="lg:col-span-2 space-y-6">
          {/* ONGLET ARCHITECTURE DE L'ARBRE */}
          {activeTab === 'tree' && (
            currentTree ? (
              <div className="space-y-4">
                {(currentTree.floors || []).map((floor, index) => {
                  const allowedDiffs = (floor.allowedDifficulties || [1, 2, 3]).map(d => Number(d));
                  return (
                    <div 
                      key={floor.floorId}
                      draggable={isOwnerOfCurrentTree}
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(index)}
                      className={`bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 transition-all ${draggedFloorIndex === index ? 'opacity-40 border-dashed border-purple-400 scale-[0.99]' : ''}`}
                    >
                      <div className="flex flex-wrap justify-between items-center border-b border-slate-100 pb-3 gap-3">
                        <div className="flex items-center gap-3">
                          {isOwnerOfCurrentTree && <span className="text-slate-400 cursor-grab active:cursor-grabbing font-bold text-base px-1 select-none">⠿</span>}
                          <span className="bg-purple-700 text-white font-extrabold px-2.5 py-1 text-xs rounded-lg">PALIER {floor.floorId}</span>
                          <button 
                            disabled={!isOwnerOfCurrentTree}
                            onClick={() => toggleFloorMode(floor.floorId)}
                            className={`text-xs font-bold px-3 py-1 rounded-full border ${floor.mode === 'static' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}
                          >
                            {floor.mode === 'static' ? '📌 Statique' : '🎲 Aléatoire'}
                          </button>
                        </div>
                        {isOwnerOfCurrentTree && (
                          <button 
                            onClick={() => handleRemoveFloor(floor.floorId)}
                            className="text-[10px] text-red-500 hover:text-red-700 font-bold uppercase tracking-wider bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg border border-red-200"
                          >
                            🗑️ Supprimer ce palier
                          </button>
                        )}
                      </div>

                      {/* Options du Palier */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                        {/* Option Statique : Sélection manuelle des quêtes */}
                        {floor.mode === 'static' ? (
                          <div className="space-y-2 col-span-2">
                            <span className="block font-black text-slate-900 uppercase tracking-wider text-[10px]">🎯 Missions associées au palier :</span>
                            <div className="flex flex-wrap gap-2">
                              {safeQuestsList.map(q => {
                                const isLinked = (floor.quests || []).includes(q.id);
                                return (
                                  <button
                                    key={q.id}
                                    disabled={!isOwnerOfCurrentTree}
                                    onClick={() => handleToggleQuestInFloor(floor.floorId, q.id)}
                                    className={`px-3 py-1.5 rounded-xl border transition-all text-[11px] font-bold flex items-center gap-1.5 ${
                                      isLinked 
                                        ? 'bg-purple-700 text-white border-purple-800 shadow-xs' 
                                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                                    }`}
                                  >
                                    <span>{q.name}</span>
                                    {isLinked && <span>✓</span>}
                                  </button>
                                );
                              })}
                              {safeQuestsList.length === 0 && (
                                <span className="text-slate-400 italic">Aucune mission disponible dans votre pool global.</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          // Option Aléatoire
                          <>
                            <div className="space-y-1">
                              <label className="block text-slate-500 font-bold uppercase tracking-wider text-[10px]">Nombre de quêtes aléatoires proposées :</label>
                              <input 
                                type="number" 
                                min="1"
                                disabled={!isOwnerOfCurrentTree}
                                value={floor.count || 2}
                                onChange={(e) => handleCountChange(floor.floorId, e.target.value)}
                                className="w-full border rounded-lg p-2 font-black text-slate-900 bg-white"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="block text-slate-500 font-bold uppercase tracking-wider text-[10px]">Difficultés autorisées :</label>
                              <div className="flex items-center gap-4 py-1.5">
                                {[1, 2, 3].map(diff => (
                                  <label key={diff} className="flex items-center gap-1.5 font-bold text-slate-700 cursor-pointer">
                                    <input 
                                      type="checkbox"
                                      disabled={!isOwnerOfCurrentTree}
                                      checked={allowedDiffs.includes(diff)}
                                      onChange={() => handleToggleDifficultyInFloor(floor.floorId, diff)}
                                      className="rounded border-slate-300 text-purple-700 focus:ring-purple-500"
                                    />
                                    <span>{diff === 3 ? '🔥 Boss' : diff === 2 ? '⚡ Miniboss' : '📄 Std'}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}

                {isOwnerOfCurrentTree && (
                  <div className="flex justify-between items-center bg-slate-50/50 p-4 rounded-xl border border-dashed border-slate-300">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-600">Nouveau palier :</label>
                      <select 
                        value={newFloorMode}
                        onChange={(e) => setNewFloorMode(e.target.value)}
                        className="border rounded-lg p-1.5 text-xs bg-white font-bold"
                      >
                        <option value="static">📌 Statique</option>
                        <option value="random">🎲 Aléatoire</option>
                      </select>
                    </div>
                    <button 
                      onClick={handleAddFloor}
                      className="bg-purple-700 hover:bg-purple-800 text-white font-black text-xs uppercase tracking-wider px-4 py-2 rounded-lg transition-all"
                    >
                      ➕ Ajouter un Palier
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-4">
                <span className="text-3xl block">🌳</span>
                <p className="text-sm font-bold text-slate-500">Aucun arbre sélectionné. Créez un arbre ou explorez les modèles partagés.</p>
                <button onClick={() => setActiveModal('tree')} className="bg-purple-700 text-white text-xs font-black uppercase tracking-wider px-4 py-2 rounded-lg">Initialiser un Arbre</button>
              </div>
            )
          )}

          {/* ONGLET LIAISON & PLANNING SESSIONS */}
          {activeTab === 'sessions' && (
            !currentSession ? (
              // Sélection de la session
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">Vos sessions actives</h3>
                  <button onClick={() => setActiveModal('session')} className="bg-blue-700 hover:bg-blue-800 text-white font-black text-xs uppercase tracking-wider px-4 py-2 rounded-lg transition-all">Initialiser une session</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sessions.map(s => {
                    const linkedTree = trees[s.tree_id];
                    return (
                      <div 
                        key={s.id}
                        onClick={() => setActiveSessionId(String(s.id))}
                        className="bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-500 hover:shadow-md cursor-pointer transition-all space-y-4"
                      >
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                          <span className="font-mono font-black text-sm text-blue-900 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 tracking-wider uppercase">{s.session_code}</span>
                          <span className="text-[10px] text-slate-400 font-bold">Lancer configuration ➔</span>
                        </div>
                        <div className="text-xs text-slate-600 space-y-1">
                          <p>🌲 Arbre relié : <span className="font-extrabold text-slate-800">{linkedTree ? linkedTree.name : 'Aucun arbre lié'}</span></p>
                          <p>🔗 Éléments du planning : <span className="font-extrabold text-blue-700">{s.planning?.length || 0} étapes</span></p>
                          <p>⏰ Horaires : <span className="font-extrabold text-slate-800 font-mono">{(s.start_time || '09:00')} - {(s.end_time || 'Calculé')}</span></p>
                          <p>👥 DRH : <span className="font-extrabold text-slate-800">{(s.drh_ids || []).length} invités</span></p>
                        </div>
                      </div>
                    );
                  })}

                  {sessions.length === 0 && (
                    <div className="col-span-2 bg-slate-50 rounded-xl border border-dashed border-slate-300 p-8 text-center space-y-3">
                      <span className="text-2xl block">💡</span>
                      <p className="text-xs font-bold text-slate-500">Aucune session n'est encore configurée pour cet espace.</p>
                      <button onClick={() => setActiveModal('session')} className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-lg">Générer ma première session</button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Configuration de la session active
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <button 
                    onClick={() => setActiveSessionId('')}
                    className="text-xs font-extrabold text-slate-500 hover:text-slate-900 flex items-center gap-1.5"
                  >
                    ← Retourner à la liste des sessions
                  </button>
                  <span className="font-mono font-black text-xs text-blue-900 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 uppercase tracking-wider">
                    Session Active : {currentSession.session_code}
                  </span>
                </div>

                {/* CONFIGURATION TEMPORELLE */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 my-4">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    ⏰ Horaires de la session
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Heure de début */}
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Heure de début</label>
                      <input 
                        type="time" 
                        value={currentSession.start_time || '09:00'} 
                        onChange={(e) => updateCurrentSessionInState({ start_time: e.target.value })}
                        className="w-full border rounded-lg p-2 bg-white font-mono text-sm"
                      />
                    </div>

                    {/* Mode Heure de fin */}
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Calcul de fin</label>
                      <select 
                        value={currentSession.end_time_mode || 'auto'} 
                        onChange={(e) => updateCurrentSessionInState({ end_time_mode: e.target.value })}
                        className="w-full border rounded-lg p-2 bg-white text-xs font-bold"
                      >
                        <option value="auto">🔄 Auto (calculé)</option>
                        <option value="lock">🔒 Verrouillé (fixe)</option>
                      </select>
                    </div>

                    {/* Heure de fin */}
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Heure de fin</label>
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
                        className={`w-full border rounded-lg p-2 font-mono text-sm ${
                          currentSession.end_time_mode === 'auto' || !(currentSession.end_time_mode)
                            ? 'bg-slate-100 text-slate-500 cursor-not-allowed' 
                            : 'bg-white text-slate-900'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs bg-slate-50 p-5 rounded-xl border border-slate-200">
                  <div className="space-y-2">
                    <label className="block font-black text-slate-900 uppercase tracking-wider text-[10px]">🌲 Arbre de compétences associé :</label>
                    <select 
                      value={currentSession.tree_id || ''}
                      onChange={(e) => updateCurrentSessionInState({ tree_id: e.target.value || null })}
                      className="w-full border rounded-lg p-2 bg-white font-bold"
                    >
                      <option value="">-- Aucun arbre lié --</option>
                      {Object.values(trees || {}).map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <span className="text-[10px] text-slate-400 font-bold block">Associer un arbre permet d'utiliser ses paliers pour le planning ci-dessous.</span>
                  </div>

                  {/* AJOUT DRH DYNAMIQUE */}
                  <div className="space-y-3 border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-6">
                    <label className="block font-black text-slate-900 uppercase tracking-wider text-[10px]">Invite DRH (Observateurs) :</label>
                    <div className="relative">
                      <input 
                        type="text"
                        placeholder="Saisir l'e-mail du DRH..."
                        value={drhSearchQuery}
                        onChange={(e) => setDrhSearchQuery(e.target.value)}
                        className="w-full border rounded-lg p-2 bg-white text-xs font-bold"
                      />
                      {drhSuggestions.length > 0 && (
                        <div className="absolute z-50 left-0 right-0 top-full bg-white border rounded-lg mt-1 shadow-lg max-h-40 overflow-y-auto">
                          {drhSuggestions.map(s => (
                            <button
                              key={s.id}
                              onClick={() => handleAddDRH(s)}
                              className="w-full text-left p-2 hover:bg-slate-100 text-xs font-bold text-slate-700 block border-b border-slate-50"
                            >
                              {s.email}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {(currentSession.drh_ids || []).map(id => {
                        const emailCache = JSON.parse(localStorage.getItem('drh_emails') || '{}');
                        const email = emailCache[id] || id;
                        return (
                          <div key={id} className="bg-slate-200 text-slate-700 font-bold py-1 px-2.5 rounded-lg flex items-center gap-1.5 text-[11px] border border-slate-300">
                            <span className="truncate max-w-[140px]">{email}</span>
                            <button onClick={() => handleRemoveDRH(id)} className="text-red-500 hover:text-red-700 font-black">×</button>
                          </div>
                        );
                      })}
                      {(currentSession.drh_ids || []).length === 0 && (
                        <span className="text-slate-400 italic text-[10px]">Aucun observateur DRH n'est rattaché.</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* TIMELINE DE CONSTRUCTION DU PLANNING */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Agenda de la Session</h4>
                  <p className="text-[10px] text-slate-400 font-bold">Glissez-déposez les paliers de l'arbre (à gauche) ou des blocs personnalisés (à droite) pour assembler la chronologie.</p>
                  
                  <div className="space-y-1">
                    {/* Zone de dépôt supérieure si vide */}
                    {(currentSession.planning || []).length === 0 && (
                      <div 
                        onDragOver={(e) => { e.preventDefault(); setActiveDropIndex(0); }}
                        onDragLeave={() => setActiveDropIndex(null)}
                        onDrop={() => handleTimelineDrop(0)}
                        className={`p-10 border-2 border-dashed rounded-xl text-center text-xs font-bold transition-all ${
                          activeDropIndex === 0 ? 'bg-blue-50 border-blue-400 text-blue-700 scale-[0.99]' : 'bg-slate-50 border-slate-300 text-slate-400'
                        }`}
                      >
                        Déposez le premier bloc ici pour initialiser l'agenda
                      </div>
                    )}

                    {(currentSession.planning || []).map((block, index) => {
                      return (
                        <React.Fragment key={block.id}>
                          {/* Point de dépôt avant le bloc */}
                          <div 
                            onDragOver={(e) => { e.preventDefault(); setActiveDropIndex(index); }}
                            onDragLeave={() => setActiveDropIndex(null)}
                            onDrop={() => handleTimelineDrop(index)}
                            className={`h-2 rounded transition-all ${
                              activeDropIndex === index ? 'bg-blue-500 my-1' : 'bg-transparent'
                            }`}
                          />
                          
                          {/* Rendu du bloc */}
                          <div 
                            draggable
                            onDragStart={() => setDraggedPlanningItem({ source: 'timeline', index })}
                            className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between gap-4 transition-all"
                            style={{ borderLeftWidth: '6px', borderLeftColor: block.color || '#94a3b8' }}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-slate-400 cursor-grab active:cursor-grabbing font-bold text-sm">⠿</span>
                              <div className="min-w-0">
                                <h5 className="font-extrabold text-slate-800 text-xs truncate flex items-center gap-1.5">
                                  {block.name}
                                  {block.type === 'palier' && (
                                    <span className="text-[10px] bg-purple-100 text-purple-700 font-black px-1.5 py-0.5 rounded-full">
                                      Palier {block.floorId}
                                    </span>
                                  )}
                                </h5>
                                <p className="text-[10px] text-slate-400 font-bold truncate">{block.desc}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 flex-shrink-0">
                              <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border">
                                <label className="text-[9px] font-black text-slate-500 uppercase">Durée :</label>
                                <input 
                                  type="number" 
                                  min="1"
                                  value={block.duration || 15}
                                  onChange={(e) => updatePlanningBlockDuration(block.id, e.target.value)}
                                  className="w-12 text-center bg-white border rounded p-0.5 font-black text-slate-900 text-xs"
                                />
                                <span className="text-[10px] font-black text-slate-500">min</span>
                              </div>
                              <button 
                                onClick={() => removePlanningBlock(block.id)}
                                className="text-red-500 hover:text-red-700 font-bold text-xs bg-red-50 hover:bg-red-100 p-1 rounded-lg"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}

                    {/* Point de dépôt après le dernier bloc */}
                    {(currentSession.planning || []).length > 0 && (
                      <div 
                        onDragOver={(e) => { e.preventDefault(); setActiveDropIndex(currentSession.planning.length); }}
                        onDragLeave={() => setActiveDropIndex(null)}
                        onDrop={() => handleTimelineDrop(currentSession.planning.length)}
                        className={`h-4 rounded transition-all ${
                          activeDropIndex === currentSession.planning.length ? 'bg-blue-500 my-1' : 'bg-transparent'
                        }`}
                      />
                    )}
                  </div>
                </div>
              </div>
            )
          )}
        </div>

        {/* COLONNE DROITE : LE POOL GLOBAL DE MISSIONS & PALETTE DE PLANNING */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">💾 Actions d'Enregistrement</h3>
            <div className="space-y-2">
              <button 
                onClick={handleSaveChanges}
                className="w-full bg-slate-950 hover:bg-slate-800 text-white font-extrabold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-xs cursor-pointer"
              >
                💾 Enregistrer {activeTab === 'tree' ? "l'Arbre" : 'la Session'}
              </button>
              {activeTab === 'tree' && currentTree && isOwnerOfCurrentTree && currentTree.visibility !== 'public' && (
                <button 
                  onClick={handleShareTree}
                  className="w-full bg-purple-50 hover:bg-purple-100 text-purple-700 font-extrabold py-2 px-4 rounded-xl text-xs uppercase tracking-wider transition-all border border-purple-200 cursor-pointer"
                >
                  🌍 Publier cet arbre
                </button>
              )}
            </div>
          </div>

          {/* SÉPARATION SUIVANT L'ONGLET ACTIF (POOL DE MISSIONS vs PALETTE DE PLANNING) */}
          {activeTab === 'tree' ? (
            // CONTENU ONGLET ARBRE : POOL DE MISSIONS
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">🎨 Pool de Missions</h3>
                <button 
                  onClick={() => setActiveModal('quest')}
                  className="text-purple-700 font-extrabold text-[11px] uppercase bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 rounded-lg border border-purple-200 transition-all"
                >
                  ➕ Créer
                </button>
              </div>

              {/* Barre de Recherche dans le Pool */}
              <div className="space-y-3">
                <input 
                  type="text" 
                  placeholder="Rechercher une mission..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-xs font-bold"
                />
                
                <div className="grid grid-cols-2 gap-2">
                  <select 
                    value={filterTheme}
                    onChange={(e) => setFilterTheme(e.target.value)}
                    className="border rounded-lg p-2 text-[10px] bg-white font-extrabold"
                  >
                    <option value="all">🎨 Tous thèmes</option>
                    <option value="social">🟢 Social</option>
                    <option value="env">🔵 Env</option>
                    <option value="tech">🟣 Tech</option>
                  </select>
                  <select 
                    value={filterDifficulty}
                    onChange={(e) => setFilterDifficulty(e.target.value)}
                    className="border rounded-lg p-2 text-[10px] bg-white font-extrabold"
                  >
                    <option value="all">⭐ Toutes diff.</option>
                    <option value="1">📄 Std (1★)</option>
                    <option value="2">⚡ Miniboss (2★)</option>
                    <option value="3">🔥 Boss (3★)</option>
                  </select>
                </div>
              </div>

              {/* Liste des Missions */}
              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                {filteredQuests.map(q => {
                  const badgeClass = getQuestBadgeStyle(q);
                  return (
                    <div 
                      key={q.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-2 hover:bg-slate-100 transition-all"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-extrabold text-xs text-slate-800 line-clamp-2 leading-tight">{q.name}</span>
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeClass} flex-shrink-0`}>
                          {Number(q.difficulty) === 3 ? '🔥 3★' : Number(q.difficulty) === 2 ? '⚡ 2★' : '📄 1★'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold line-clamp-2 leading-normal">{q.desc}</p>
                      
                      <div className="flex justify-between items-center border-t border-slate-100 pt-2 text-[10px] font-black">
                        {q.is_collaborative || q.is_collaborative === 'true' ? (
                          <span className="text-emerald-700">👥 Duo ({q.required_partners || 2}p)</span>
                        ) : (
                          <span className="text-slate-500">👤 Solo</span>
                        )}
                        <span className="text-slate-400 uppercase tracking-widest text-[9px]">{q.theme}</span>
                      </div>
                    </div>
                  );
                })}

                {filteredQuests.length === 0 && (
                  <span className="text-slate-400 italic text-center block py-6 text-xs font-bold">Aucune mission correspondante.</span>
                )}
              </div>
            </div>
          ) : (
            // CONTENU ONGLET SESSIONS : PALETTE DE PLANNING
            <div className="space-y-6">
              {/* Palette d'Éléments d'Arbre (Si arbre lié) */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">🎯 Paliers de l'arbre relié</h3>
                <p className="text-[10px] text-slate-400 font-bold">Glissez ces paliers de progression vers l'agenda de votre session.</p>
                
                {currentSession && currentSession.tree_id && trees[currentSession.tree_id] ? (
                  <div className="space-y-2">
                    {(trees[currentSession.tree_id].floors || []).map(floor => (
                      <div
                        key={floor.floorId}
                        draggable
                        onDragStart={() => setDraggedPlanningItem({ source: 'palette-palier', data: floor })}
                        className="bg-purple-50 border border-purple-200 hover:bg-purple-100/80 p-3 rounded-xl cursor-grab active:cursor-grabbing flex justify-between items-center transition-all shadow-2xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-purple-400 font-black">⠿</span>
                          <span className="font-extrabold text-xs text-purple-900">Palier {floor.floorId}</span>
                        </div>
                        <span className="text-[10px] bg-purple-700 text-white font-extrabold px-2 py-0.5 rounded-md">45 min</span>
                      </div>
                    ))}
                    {(trees[currentSession.tree_id].floors || []).length === 0 && (
                      <p className="text-[11px] text-slate-400 italic">L'arbre lié ne possède aucun palier de compétences.</p>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-xl p-3 text-center border border-dashed border-slate-300">
                    <p className="text-[11px] text-slate-400 italic">Veuillez lier un arbre à cette session pour faire apparaître ses paliers.</p>
                  </div>
                )}
              </div>

              {/* Création et palette de blocs sur-mesure */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">⚡ Blocs sur-mesure</h3>
                <p className="text-[10px] text-slate-400 font-bold">Configurez un élément d'animation (Ex: Débrief, Pause) et glissez-le.</p>
                
                {/* Formulaire de pré-configuration de bloc */}
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  <div className="space-y-1">
                    <label className="block text-slate-500 font-bold text-[9px] uppercase tracking-wider">Nom du bloc :</label>
                    <input 
                      type="text"
                      value={customBlockConfig.name}
                      onChange={(e) => setCustomBlockConfig({ ...customBlockConfig, name: e.target.value })}
                      className="w-full border rounded-lg p-2 bg-white font-extrabold text-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-slate-500 font-bold text-[9px] uppercase tracking-wider">Durée par défaut :</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number"
                        min="1"
                        value={customBlockConfig.duration}
                        onChange={(e) => setCustomBlockConfig({ ...customBlockConfig, duration: Math.max(1, parseInt(e.target.value, 10) || 15) })}
                        className="w-20 border rounded-lg p-2 bg-white font-black text-slate-900"
                      />
                      <span className="font-bold text-slate-500">minutes</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-slate-500 font-bold text-[9px] uppercase tracking-wider">Couleur thématique :</label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="color"
                        value={customBlockConfig.color}
                        onChange={(e) => setCustomBlockConfig({ ...customBlockConfig, color: e.target.value })}
                        className="w-8 h-8 rounded-md border-0 cursor-pointer"
                      />
                      <span className="font-mono text-[10px] font-black text-slate-600">{customBlockConfig.color}</span>
                    </div>
                  </div>
                </div>

                {/* Bloc généré glissable */}
                <div 
                  draggable
                  onDragStart={() => setDraggedPlanningItem({ source: 'palette-custom' })}
                  className="bg-white hover:bg-slate-50 p-3 rounded-xl cursor-grab active:cursor-grabbing flex justify-between items-center transition-all shadow-xs"
                  style={{ borderLeftWidth: '6px', borderLeftColor: customBlockConfig.color }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-slate-400 font-black">⠿</span>
                    <span className="font-extrabold text-xs text-slate-800 truncate">{customBlockConfig.name || 'Bloc personnalisé'}</span>
                  </div>
                  <span className="text-[10px] bg-slate-100 text-slate-600 border font-extrabold px-2 py-0.5 rounded-md flex-shrink-0">{customBlockConfig.duration} min</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- MODALES & OVERLAYS --- */}
      {activeModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-slate-100">
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-extrabold text-lg"
            >
              ×
            </button>
            
            {activeModal === 'tree_browser' && (
              <>
                <h3 className="text-md font-black text-slate-950 uppercase tracking-wide">🔍 Sélectionner un Arbre</h3>
                
                {/* Sélecteurs onglet de navigation d'arbre */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-[10px] font-bold my-4">
                  <button 
                    onClick={() => setTreeBrowserTab('local')}
                    className={`flex-1 px-3 py-1.5 rounded-lg transition-all ${treeBrowserTab === 'local' ? 'bg-white text-purple-950 shadow-xs' : 'text-slate-500'}`}
                  >
                    📂 Vos Arbres Locaux
                  </button>
                  <button 
                    onClick={() => setTreeBrowserTab('shared')}
                    className={`flex-1 px-3 py-1.5 rounded-lg transition-all ${treeBrowserTab === 'shared' ? 'bg-white text-purple-950 shadow-xs' : 'text-slate-500'}`}
                  >
                    🌍 Bibliothèque Partagée
                  </button>
                </div>

                <input 
                  type="text" 
                  placeholder="Filtrer les arbres..."
                  value={treeSearchQuery}
                  onChange={(e) => setTreeSearchQuery(e.target.value)}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-xs font-bold mb-4"
                />

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {filteredBrowsedTrees.map(t => (
                    <div 
                      key={t.id}
                      className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-extrabold text-slate-800 truncate block">{t.name}</span>
                        <span className="text-[10px] text-slate-400 font-bold">{(t.floors || []).length} paliers configurés</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {treeBrowserTab === 'shared' && t.owner_id !== currentUserId ? (
                          <button 
                            onClick={() => handleDuplicateTreeAsLocal(t)}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-2.5 py-1.5 rounded-lg text-[10px] uppercase tracking-wider"
                          >
                            📥 Copier
                          </button>
                        ) : (
                          <button 
                            onClick={() => { setActiveTreeId(t.id); setActiveModal(null); }}
                            className="bg-purple-700 hover:bg-purple-800 text-white font-extrabold px-2.5 py-1.5 rounded-lg text-[10px] uppercase tracking-wider"
                          >
                            ⚡ Choisir
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredBrowsedTrees.length === 0 && (
                    <span className="text-slate-400 italic text-center block py-8 font-bold text-xs">Aucun modèle disponible.</span>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-4 mt-4 flex justify-end">
                  <button onClick={() => setActiveModal('tree')} className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-lg">➕ Créer un nouvel arbre</button>
                </div>
              </>
            )}

            {activeModal === 'tree' && (
              <>
                <h3 className="text-md font-black text-slate-950 uppercase tracking-wide">🌳 Initialiser un Nouvel Arbre</h3>
                <form onSubmit={handleCreateTree} className="space-y-4 text-xs mt-4">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Dénomination de l'Arbre :</label>
                    <input type="text" required placeholder="Ex: Arbre de compétences RSE - RH" value={newTreeName} onChange={(e) => setNewTreeName(e.target.value)} className="w-full border rounded-lg p-2.5 bg-slate-50 font-bold" />
                  </div>
                  <button type="submit" className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl uppercase tracking-wider transition-all">Créer l'Arbre de Compétences</button>
                </form>
              </>
            )}

            {activeModal === 'quest' && (
              <>
                <h3 className="text-md font-black text-slate-950 uppercase tracking-wide">🎨 Générer une Mission de Base</h3>
                <form onSubmit={handleCreateQuest} className="space-y-3 text-xs mt-4">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Nom de la mission :</label>
                    <input type="text" required placeholder="Ex: Analyser le bilan carbone" value={newQuestName} onChange={(e) => setNewQuestName(e.target.value)} className="w-full border rounded-lg p-2 bg-slate-50 font-bold" />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Description / Objectifs :</label>
                    <textarea rows="2" required placeholder="Décrivez les livrables attendus..." value={newQuestDesc} onChange={(e) => setNewQuestDesc(e.target.value)} className="w-full border rounded-lg p-2 bg-slate-50 font-bold"></textarea>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">Axe thématique :</label>
                      <select value={newQuestTheme} onChange={(e) => setNewQuestTheme(e.target.value)} className="w-full border rounded-lg p-2 bg-white font-bold">
                        <option value="social">🟢 Social (Diversité/inclusion)</option>
                        <option value="env">🔵 Environnement (Climat/déchets)</option>
                        <option value="tech">🟣 Technologie (Éthique/RGPD)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">Type de quête :</label>
                      <select value={newQuestType} onChange={(e) => setNewQuestType(e.target.value)} className="w-full border rounded-lg p-2 bg-white font-bold">
                        <option value="normal">📄 Standard (1★)</option>
                        <option value="miniboss">⚡ Miniboss (2★)</option>
                        <option value="boss">🔥 Boss (3★)</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-purple-700 text-white font-bold py-2.5 rounded-xl uppercase tracking-wider transition-all">Créer la mission</button>
                </form>
              </>
            )}

            {activeModal === 'session' && (
              <>
                <h3 className="text-md font-black text-slate-950 uppercase tracking-wide">💡 Initialiser un Espace Session</h3>
                <form onSubmit={handleCreateSession} className="space-y-4 text-xs mt-4">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Code d'accès (ex: AIRBUS-26) :</label>
                    <input type="text" required placeholder="AIRBUS-LILLE-26" value={newSessionCode} onChange={(e) => setNewSessionCode(e.target.value)} className="w-full border rounded-lg p-2.5 bg-slate-50 font-mono font-bold uppercase tracking-wider text-center text-sm" />
                  </div>
                  <button type="submit" className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl uppercase tracking-wider transition-all">Générer la session</button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
