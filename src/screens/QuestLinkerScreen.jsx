// src/screens/StudioScreen.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const getModuleBadgeStyle = (moduleItem) => {
  if (!moduleItem) return "bg-slate-50 text-slate-700 border-slate-200";
  if (Number(moduleItem.difficulty) === 3) return "bg-red-50 text-red-700 border-red-200"; // Niveau Avancé
  if (Number(moduleItem.difficulty) === 2) return "bg-orange-50 text-orange-700 border-orange-200"; // Niveau Intermédiaire
  switch (moduleItem.theme) {
    case 'social': return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case 'env': return "bg-teal-50 text-teal-700 border-teal-200";
    case 'tech': return "bg-indigo-50 text-indigo-700 border-indigo-200";
    default: return "bg-slate-50 text-slate-700 border-slate-200";
  }
};

export default function StudioScreen({ trees = {}, setTrees, quests = [], setQuests }) {
  const [currentUserId, setCurrentUserId] = useState(null);
  
  // États de sélection
  const [activeTreeId, setActiveTreeId] = useState("");
  
  // Module actuellement inspecté pour afficher ses détails
  const [inspectedModule, setInspectedModule] = useState(null);

  // Modale active ('module', 'tree', 'tree_browser', 'import_library' ou null)
  const [activeModal, setActiveModal] = useState(null); 

  // États des formulaires
  const [newModuleName, setNewModuleName] = useState('');
  const [newModuleDesc, setNewModuleDesc] = useState('');
  const [newModuleTheme, setNewModuleTheme] = useState('social');
  const [newModuleType, setNewModuleType] = useState('normal'); 
  const [newTreeName, setNewTreeName] = useState('');
  const [newFloorMode, setNewFloorMode] = useState('static');

  // Mode collaboratif
  const [isCollaborative, setIsCollaborative] = useState(false);
  const [requiredPartners, setRequiredPartners] = useState(2);

  // Recherche et filtres pour la modale d'importation globale/locale
  const [importSearchQuery, setImportSearchQuery] = useState('');
  const [importTheme, setImportTheme] = useState('all');
  const [importOrigin, setImportOrigin] = useState('all'); // 'all', 'global', 'local'

  // Gestion et exploration des parcours
  const [treeBrowserTab, setTreeBrowserTab] = useState('local'); // 'local' ou 'shared'
  const [treeSearchQuery, setTreeSearchQuery] = useState('');

  // 1. CHARGEMENT INITIAL
  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserId(session.user.id);
        fetchTrees();
      }
    };
    fetchInitialData();
  }, []);

  const fetchTrees = async () => {
    const { data, error } = await supabase
      .from('trees')
      .select('*');

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
  const isOwnerOfCurrentTree = currentTree && currentTree.owner_id === currentUserId;

  // Récupérer la liste des modules officiellement importés pour ce parcours.
  const getImportedModuleIds = () => {
    if (!currentTree) return [];
    const explicitImports = currentTree.imported_quests || [];
    const floorQuests = (currentTree.floors || []).flatMap(f => f.quests || []);
    return Array.from(new Set([...explicitImports, ...floorQuests]));
  };

  const importedModuleIds = getImportedModuleIds();

  // Liste des objets modules correspondants aux modules importés dans ce parcours
  const importedModulesList = (quests || []).filter(q => q && importedModuleIds.includes(q.id));

  // Liste de tous les autres modules existants (disponibles à l'importation)
  const availableToImportModules = (quests || []).filter(q => q && !importedModuleIds.includes(q.id));

  // Trouver tous les IDs de modules déjà positionnés dans une étape du parcours
  const getAssignedModuleIdsInCurrentTree = () => {
    if (!currentTree || !currentTree.floors) return [];
    return currentTree.floors.flatMap(f => f.quests || []);
  };

  const assignedModuleIds = getAssignedModuleIdsInCurrentTree();

  // Action d'importer un module vers le parcours
  const handleImportModuleToTree = async (moduleId) => {
    if (!currentTree || !isOwnerOfCurrentTree) return;
    const nextImported = Array.from(new Set([...(currentTree.imported_quests || []), moduleId]));

    const { error } = await supabase
      .from('trees')
      .update({ imported_quests: nextImported })
      .eq('id', currentTree.id);

    if (!error) {
      if (typeof setTrees === 'function') {
        setTrees(prev => ({
          ...prev,
          [currentTree.id]: { ...prev[currentTree.id], imported_quests: nextImported }
        }));
      }
    } else {
      alert(`❌ Erreur d'importation : ${error.message}`);
    }
  };

  // Action de retirer un module importé du parcours
  const handleRemoveModuleFromTree = async (moduleId) => {
    if (!currentTree || !isOwnerOfCurrentTree) return;
    const nextImported = (currentTree.imported_quests || []).filter(id => id !== moduleId);
    const nextFloors = (currentTree.floors || []).map(f => ({
      ...f,
      quests: (f.quests || []).filter(id => id !== moduleId)
    }));

    const { error } = await supabase
      .from('trees')
      .update({ imported_quests: nextImported, floors: nextFloors })
      .eq('id', currentTree.id);

    if (!error) {
      if (typeof setTrees === 'function') {
        setTrees(prev => ({
          ...prev,
          [currentTree.id]: { ...prev[currentTree.id], imported_quests: nextImported, floors: nextFloors }
        }));
      }
      if (inspectedModule?.id === moduleId) {
        setInspectedModule(null);
      }
    }
  };

  // Calcul automatique de la contrainte max de participants
  const recalculateAndSaveMaxTeamConstraint = async (treeId, floorsArray) => {
    if (!treeId || !floorsArray) return;
    const attachedModuleIds = floorsArray.flatMap(f => f.quests || []);
    const linkedModules = (quests || []).filter(q => attachedModuleIds.includes(q.id));

    const maxConstraint = linkedModules.reduce((max, q) => {
      if (q.is_collaborative || q.is_collaborative === 'true') {
        return Math.max(max, Number(q.required_partners) || 2);
      }
      return max;
    }, 1);

    await supabase
      .from('trees')
      .update({ max_team_constraint: maxConstraint })
      .eq('id', treeId);

    if (typeof setTrees === 'function') {
      setTrees(prev => {
        if (!prev[treeId]) return prev;
        return {
          ...prev,
          [treeId]: { ...prev[treeId], max_team_constraint: maxConstraint }
        };
      });
    }
  };

  // Sauvegarde globale du parcours
  const handleSaveChanges = async () => {
    if (currentTree) {
      if (!isOwnerOfCurrentTree) {
        alert("⚠️ Modification impossible : vous n'êtes pas propriétaire de ce parcours.");
        return;
      }

      const { error } = await supabase
        .from('trees')
        .update({ 
          floors: currentTree.floors || [],
          imported_quests: currentTree.imported_quests || []
        })
        .eq('id', currentTree.id);

      if (error) {
        alert(`❌ Erreur de sauvegarde : ${error.message}`);
      } else {
        await recalculateAndSaveMaxTeamConstraint(currentTree.id, currentTree.floors);
        alert(`🎉 Parcours "${currentTree.name}" enregistré avec succès !`);
      }
    } 
  };

  const handleShareTree = async () => {
    if (!currentTree || !isOwnerOfCurrentTree) return;
    const { error } = await supabase
      .from('trees')
      .update({ visibility: 'public' })
      .eq('id', currentTree.id);

    if (!error) {
      if (typeof setTrees === 'function') {
        setTrees(prev => ({
          ...prev,
          [currentTree.id]: { ...prev[currentTree.id], visibility: 'public' }
        }));
      }
      alert(`🌍 Le parcours "${currentTree.name}" est désormais public !`);
    }
  };

  const updateCurrentTreeInState = (updatedFields) => {
    if (!currentTree || !isOwnerOfCurrentTree) return; 
    if (typeof setTrees === 'function') {
      setTrees(prev => ({
        ...prev,
        [activeTreeId]: { ...currentTree, ...updatedFields }
      }));
    }
  };

  // Gestion des étapes
  const handleAddFloor = () => {
    if (!currentTree || !isOwnerOfCurrentTree) return;
    const floors = currentTree.floors ? [...currentTree.floors] : [];
    const nextFloorId = floors.length > 0 ? Math.max(...floors.map(f => f.floorId || 0)) + 1 : 1;

    const updatedFloors = [...floors, { 
      floorId: nextFloorId, 
      mode: newFloorMode, 
      quests: [], 
      count: 2, 
      allowedDifficulties: [1, 2, 3]
    }];

    updateCurrentTreeInState({ floors: updatedFloors });
  };

  const handleRemoveFloor = (floorId) => {
    if (!currentTree || !currentTree.floors || !isOwnerOfCurrentTree) return;
    const updatedFloors = currentTree.floors.filter(f => f.floorId !== floorId);
    updateCurrentTreeInState({ floors: updatedFloors });
  };

  const toggleFloorMode = (floorId) => {
    if (!currentTree || !currentTree.floors || !isOwnerOfCurrentTree) return;
    updateCurrentTreeInState({
      floors: currentTree.floors.map(f => 
        f.floorId === floorId ? { ...f, mode: f.mode === 'static' ? 'random' : 'static' } : f
      )
    });
  };

  const handleUpdateFloorCount = (floorId, newCount) => {
    if (!currentTree || !currentTree.floors || !isOwnerOfCurrentTree) return;
    const val = Math.max(1, parseInt(newCount, 10) || 1);
    updateCurrentTreeInState({
      floors: currentTree.floors.map(f => 
        f.floorId === floorId ? { ...f, count: val } : f
      )
    });
  };

  const handleToggleDifficultyInFloor = (floorId, diffLevel) => {
    if (!currentTree || !currentTree.floors || !isOwnerOfCurrentTree) return;
    updateCurrentTreeInState({
      floors: currentTree.floors.map(f => {
        if (f.floorId !== floorId) return f;
        const currentDiffs = f.allowedDifficulties || [1, 2, 3];
        const nextDiffs = currentDiffs.includes(Number(diffLevel))
          ? currentDiffs.filter(d => Number(d) !== Number(diffLevel))
          : [...currentDiffs, Number(diffLevel)];
        return { ...f, allowedDifficulties: nextDiffs.map(d => Number(d)) };
      })
    });
  };

  // EXCLUSION MUTUELLE STRICTE : Affectation à une seule étape à la fois
  const handleToggleModuleInFloor = (floorId, moduleId) => {
    if (!currentTree || !currentTree.floors || !isOwnerOfCurrentTree) return;
    
    const updatedFloors = currentTree.floors.map(f => {
      if (f.floorId === floorId) {
        const isSelected = (f.quests || []).includes(moduleId);
        return {
          ...f,
          quests: isSelected ? f.quests.filter(id => id !== moduleId) : [...(f.quests || []), moduleId]
        };
      }
      return {
        ...f,
        quests: (f.quests || []).filter(id => id !== moduleId)
      };
    });

    updateCurrentTreeInState({ floors: updatedFloors });
    recalculateAndSaveSaveMaxTeamConstraint = recalculateAndSaveMaxTeamConstraint(currentTree.id, updatedFloors);
  };

  const handleCreateTree = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newTreeName.trim()) return;

    const { data, error } = await supabase
      .from('trees')
      .insert([{ 
        name: newTreeName.trim(), 
        owner_id: currentUserId, 
        floors: [], 
        imported_quests: [],
        visibility: 'private', 
        max_team_constraint: 1 
      }])
      .select().single();

    if (!error && data) {
      if (typeof setTrees === 'function') setTrees(prev => ({ ...prev, [data.id]: data }));
      setActiveTreeId(data.id);
      setNewTreeName('');
      setActiveModal(null);
    }
  };

  const handleCreateModule = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newModuleName || !newModuleDesc) return;
    const calculatedDifficulty = newModuleType === 'boss' ? 3 : newModuleType === 'miniboss' ? 2 : 1;

    const { data, error } = await supabase
      .from('quests')
      .insert([{ 
        name: newModuleName, 
        desc: newModuleDesc, 
        theme: newModuleTheme, 
        difficulty: String(calculatedDifficulty), 
        owner_id: currentUserId, 
        visibility: 'private',
        is_collaborative: isCollaborative,
        required_partners: isCollaborative ? requiredPartners : 2
      }])
      .select().single(); 

    if (!error && data) {
      if (typeof setQuests === 'function') setQuests(prev => [...(prev || []), data]);
      if (currentTree) {
        handleImportModuleToTree(data.id);
      }
      setNewModuleName(''); 
      setNewModuleDesc(''); 
      setActiveModal(null);
    }
  };

  // Liste filtrée d'importation
  const filteredAvailableImports = availableToImportModules.filter(q => {
    const matchesSearch = q.name.toLowerCase().includes(importSearchQuery.toLowerCase()) || 
                          q.desc.toLowerCase().includes(importSearchQuery.toLowerCase());
    const matchesTheme = importTheme === 'all' || q.theme === importTheme;
    
    const isLocal = q.owner_id === currentUserId;
    const matchesOrigin = 
      importOrigin === 'all' || 
      (importOrigin === 'local' && isLocal) || 
      (importOrigin === 'global' && !isLocal);

    return matchesSearch && matchesTheme && matchesOrigin;
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 pr-16 space-y-6 relative">
      
      {/* BARRE LATÉRALE D'ACTIONS (ALIGNÉE À DROITE) */}
      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40 flex items-center group">
        <div className="w-1.5 h-20 bg-slate-300 rounded-l-md group-hover:bg-purple-500 transition-colors shadow-xs"></div>
        <div className="flex flex-col items-center justify-center gap-4 bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-r-2xl py-5 px-2.5 shadow-lg transition-all duration-300 translate-x-1 group-hover:translate-x-0 group-hover:bg-white group-hover:border-slate-300">
          
          {/* Nouveau parcours */}
          <div className="relative group/btn flex items-center justify-center">
            <button onClick={() => setActiveModal('tree')} className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 text-sm flex items-center justify-center shadow-2xs hover:bg-purple-50 hover:border-purple-400 hover:text-purple-600 transition-all cursor-pointer">📂</button>
            <div className="absolute right-12 scale-0 group-hover/btn:scale-100 opacity-0 group-hover/btn:opacity-100 transition-all duration-150 z-50 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg shadow-xl pointer-events-none whitespace-nowrap text-right text-white">
              <p className="text-[11px] font-black">Nouveau parcours</p>
            </div>
          </div>

          {/* Importer des modules */}
          <div className="relative group/btn flex items-center justify-center">
            <button onClick={() => setActiveModal('import_library')} className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 text-sm flex items-center justify-center shadow-2xs hover:bg-purple-50 hover:border-purple-400 hover:text-purple-600 transition-all cursor-pointer">📥</button>
            <div className="absolute right-12 scale-0 group-hover/btn:scale-100 opacity-0 group-hover/btn:opacity-100 transition-all duration-150 z-50 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg shadow-xl pointer-events-none whitespace-nowrap text-right text-white">
              <p className="text-[11px] font-black">Importer des modules</p>
              <p className="text-[9px] text-slate-400">Piocher dans les modules locaux ou partagés</p>
            </div>
          </div>

          {/* Nouveau module */}
          <div className="relative group/btn flex items-center justify-center">
            <button onClick={() => setActiveModal('quest')} className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 text-sm flex items-center justify-center shadow-2xs hover:bg-purple-50 hover:border-purple-400 hover:text-purple-600 transition-all cursor-pointer">📝</button>
            <div className="absolute right-12 scale-0 group-hover/btn:scale-100 opacity-0 group-hover/btn:opacity-100 transition-all duration-150 z-50 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg shadow-xl pointer-events-none whitespace-nowrap text-right text-white">
              <p className="text-[11px] font-black">Créer un Module</p>
            </div>
          </div>

          {currentTree && isOwnerOfCurrentTree && (
            <div className="relative group/btn flex items-center justify-center">
              <button onClick={handleShareTree} disabled={currentTree.visibility === 'public'} className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 text-sm flex items-center justify-center shadow-2xs hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 transition-all cursor-pointer disabled:opacity-40">🌍</button>
              <div className="absolute right-12 scale-0 group-hover/btn:scale-100 opacity-0 group-hover/btn:opacity-100 transition-all duration-150 z-50 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg shadow-xl pointer-events-none whitespace-nowrap text-right text-white">
                <p className="text-[11px] font-black">Rendre public</p>
              </div>
            </div>
          )}

          {currentTree && <div className="w-full border-t border-slate-200 my-1"></div>}

          {currentTree && (
            <div className="relative group/btn flex items-center justify-center">
              <button onClick={handleSaveChanges} disabled={!isOwnerOfCurrentTree} className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 text-sm flex items-center justify-center shadow-2xs hover:bg-emerald-600 hover:text-white transition-all cursor-pointer disabled:opacity-40">💾</button>
              <div className="absolute right-12 scale-0 group-hover/btn:scale-100 opacity-0 group-hover/btn:opacity-100 transition-all duration-150 z-50 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg shadow-xl pointer-events-none whitespace-nowrap text-right text-white">
                <p className="text-[11px] font-black font-extrabold">Enregistrer le Parcours</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* EN-TÊTE DE LA PAGE */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-xs gap-4">
        <div>
          <h1 className="text-sm font-black text-slate-950 uppercase tracking-wide">📂 Concepteur de Parcours de Formation</h1>
          <p className="text-[10px] text-slate-500 font-extrabold uppercase">Organisez vos modules d'apprentissage et structurez vos étapes</p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs font-bold">
          {currentTree && (
            <span className="text-purple-700 font-black bg-purple-100/80 px-3 py-1.5 rounded-lg border border-purple-200">
              👥 Taille d'équipe max : <span className="text-sm font-black">{currentTree.max_team_constraint || 1} pers.</span>
            </span>
          )}
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Parcours actif :</span>
            <button
              onClick={() => setActiveModal('tree_browser')}
              className="bg-purple-50 border border-purple-200 rounded-lg p-2 text-purple-900 text-left font-bold min-w-[180px] flex justify-between items-center hover:bg-purple-100 transition-all"
            >
              <span className="truncate">{currentTree ? currentTree.name : "-- Choisir --"}</span>
              <span className="text-[10px]">🔍 Parcourir</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLONNE GAUCHE & CENTRE : STRUCTURATION DES ÉTAPES */}
        <div className="lg:col-span-2 space-y-6">
          {currentTree ? (
            <div className="space-y-4">
              <div className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">⚙️ Configuration des étapes du parcours</div>
              
              {(currentTree.floors || []).map((floor) => {
                const allowedDiffs = (floor.allowedDifficulties || [1, 2, 3]).map(d => Number(d));
                return (
                  <div key={floor.floorId} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                    <div className="flex flex-wrap justify-between items-center border-b border-slate-100 pb-3 gap-3">
                      <div className="flex items-center gap-3">
                        <span className="bg-purple-700 text-white font-extrabold px-2.5 py-1 text-xs rounded-lg shadow-sm">ÉTAPE {floor.floorId}</span>
                        
                        {/* Mode de validation (Fixe ou Sélection aléatoire) */}
                        <button 
                          disabled={!isOwnerOfCurrentTree}
                          onClick={() => toggleFloorMode(floor.floorId)}
                          className={`text-xs font-bold px-3 py-1 rounded-full border transition-all ${
                            floor.mode === 'static' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {floor.mode === 'static' ? '📌 Fixe (Tous obligatoires)' : '🎲 Sélection aléatoire'}
                        </button>

                        {/* Nombre d'activités à valider */}
                        {floor.mode === 'random' && (
                          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                            <span className="text-[10px] font-black text-amber-800">Tirer au sort :</span>
                            <input 
                              type="number"
                              min="1"
                              max="10"
                              value={floor.count || 2}
                              disabled={!isOwnerOfCurrentTree}
                              onChange={(e) => handleUpdateFloorCount(floor.floorId, e.target.value)}
                              className="w-10 bg-white border border-amber-300 rounded text-center text-xs font-black text-amber-950 focus:ring-amber-500"
                            />
                            <span className="text-[10px] font-extrabold text-amber-800">modules</span>
                          </div>
                        )}

                        {/* Niveau d'apprentissage requis */}
                        <div className="flex items-center bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 gap-1" title="Niveaux requis acceptés">
                          {[1, 2, 3].map(level => {
                            const isChecked = allowedDiffs.includes(level);
                            const label = level === 1 ? 'B' : level === 2 ? 'I' : 'A'; // Basique, Intermédiaire, Avancé
                            const fullName = level === 1 ? 'Basique' : level === 2 ? 'Intermédiaire' : 'Avancé';
                            return (
                              <button
                                key={level}
                                title={`Accepter le niveau ${fullName}`}
                                disabled={!isOwnerOfCurrentTree}
                                onClick={() => handleToggleDifficultyInFloor(floor.floorId, level)}
                                className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-black transition-all ${
                                  isChecked ? 'bg-amber-400 text-amber-950 border border-amber-500 shadow-sm' : 'text-slate-400 hover:bg-slate-200'
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {isOwnerOfCurrentTree && (
                        <button onClick={() => handleRemoveFloor(floor.floorId)} className="text-slate-400 hover:text-red-500 text-xs font-bold">Supprimer l'étape</button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-500 uppercase">Modules attribués à cette étape :</div>
                      <div className="flex flex-wrap gap-2">
                        {importedModulesList
                          .filter(q => allowedDiffs.includes(Number(q.difficulty)))
                          .map(moduleItem => {
                            const isSelected = (floor.quests || []).includes(moduleItem.id);
                            const isOtherFloorSelected = assignedModuleIds.includes(moduleItem.id) && !isSelected;
                            const isCollab = moduleItem.is_collaborative || moduleItem.is_collaborative === 'true';
                            const diffLabel = Number(moduleItem.difficulty) === 1 ? 'Basique' : Number(moduleItem.difficulty) === 2 ? 'Intermédiaire' : 'Avancé';
                            
                            return (
                              <div key={moduleItem.id} className="flex items-center gap-1.5">
                                <button
                                  disabled={!isOwnerOfCurrentTree || isOtherFloorSelected}
                                  onClick={() => handleToggleModuleInFloor(floor.floorId, moduleItem.id)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1.5 cursor-pointer ${
                                    isSelected 
                                      ? 'bg-purple-700 text-white border-purple-800 shadow-sm' 
                                      : isOtherFloorSelected
                                        ? 'bg-slate-100 text-slate-400 border-slate-200 line-through opacity-50 cursor-not-allowed'
                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                  }`}
                                  title={isOtherFloorSelected ? "Déjà affecté à une autre étape" : "Cliquer pour affecter à cette étape"}
                                >
                                  <span>{moduleItem.name}</span>
                                  {isCollab && <span className="text-[10px]">👥 {moduleItem.required_partners}p</span>}
                                  <span className="text-[9px] opacity-60">({diffLabel})</span>
                                </button>
                                
                                {/* Détails rapides */}
                                <button 
                                  onClick={() => setInspectedModule(moduleItem)}
                                  className={`p-1 rounded border text-[10px] transition-all ${
                                    inspectedModule?.id === moduleItem.id ? 'bg-purple-100 border-purple-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-200'
                                  }`}
                                  title="Inspecter le module"
                                >
                                  👁️
                                </button>
                              </div>
                            );
                          })}

                        {importedModulesList.length === 0 && (
                          <p className="text-xs text-slate-400 font-bold italic">Aucun module n'a été rattaché à ce parcours. Importez-en depuis la bibliothèque (bouton 📥 à droite).</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isOwnerOfCurrentTree && (
                <div className="bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-600 uppercase">Nouvelle étape :</span>
                    <select value={newFloorMode} onChange={(e) => setNewFloorMode(e.target.value)} className="border rounded-lg p-1.5 bg-white text-xs font-bold">
                      <option value="static">📌 Fixe (Validation requise)</option>
                      <option value="random">🎲 Aléatoire (Sélection de modules)</option>
                    </select>
                  </div>
                  <button onClick={handleAddFloor} className="bg-purple-700 hover:bg-purple-800 text-white font-extrabold px-5 py-2 rounded-xl text-xs uppercase tracking-wider cursor-pointer">➕ Ajouter une Étape</button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 font-bold">Veuillez sélectionner un parcours d'apprentissage actif.</div>
          )}
        </div>

        {/* COLONNE DROITE : CATALOGUE DES MODULES ATTACHÉS & INSPECTION */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* INSPECTION DÉTAILLÉE */}
          {inspectedModule && (
            <div className="bg-purple-950 text-white border border-purple-800 rounded-xl p-5 shadow-md space-y-3 animate-fade-in">
              <div className="flex justify-between items-start gap-2">
                <span className="text-[9px] font-black uppercase tracking-wider bg-purple-800 text-purple-200 px-2 py-0.5 rounded border border-purple-700">SPÉCIFICATIONS DU MODULE</span>
                <button onClick={() => setInspectedModule(null)} className="text-purple-300 hover:text-white font-bold text-sm">×</button>
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wide">{inspectedModule.name}</h4>
                <div className="flex gap-1.5 items-center mt-1">
                  <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${getModuleBadgeStyle(inspectedModule)}`}>
                    {inspectedModule.theme} • {Number(inspectedModule.difficulty) === 1 ? 'Basique' : Number(inspectedModule.difficulty) === 2 ? 'Intermédiaire' : 'Avancé'}
                  </span>
                  {inspectedModule.is_collaborative && (
                    <span className="text-[8px] bg-purple-800 text-purple-100 font-black px-1.5 py-0.5 rounded border border-purple-700">👥 {inspectedModule.required_partners} pers.</span>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-purple-200 font-medium leading-relaxed bg-purple-900/40 p-3 rounded-lg border border-purple-900">{inspectedModule.desc}</p>
            </div>
          )}

          {/* LISTING DES MODULES IMPORTÉS */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">📦 Liste des modules intégrés ({importedModulesList.length})</h3>
                <p className="text-[9px] text-slate-400 font-bold">Modules configurés pour ce parcours</p>
              </div>
              <button 
                onClick={() => setActiveModal('import_library')}
                className="bg-purple-100 hover:bg-purple-200 text-purple-800 text-[10px] font-black px-2 py-1 rounded-lg border border-purple-200"
              >
                📥 Ajouter...
              </button>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {importedModulesList.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 font-bold italic">
                  Aucun module importé.<br />Intégrez des modules existants pour concevoir la formation.
                </div>
              ) : (
                importedModulesList.map((q) => {
                  const isAssigned = assignedModuleIds.includes(q.id);
                  const isInspected = inspectedModule?.id === q.id;
                  const diffLabel = Number(q.difficulty) === 1 ? 'Basique' : Number(q.difficulty) === 2 ? 'Intermédiaire' : 'Avancé';
                  return (
                    <div 
                      key={q.id} 
                      onClick={() => setInspectedModule(q)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        isInspected 
                          ? 'border-purple-500 bg-purple-50/50 ring-1 ring-purple-400' 
                          : 'border-slate-200 bg-slate-50/30 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-extrabold text-slate-900 text-xs leading-tight">{q.name}</span>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border whitespace-nowrap ${getModuleBadgeStyle(q)}`}>
                            {diffLabel} • {q.theme}
                          </span>
                          <span className={`text-[7px] font-black px-1 rounded ${q.owner_id === currentUserId ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                            {q.owner_id === currentUserId ? '🏠 personnel' : '🌍 public'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold pt-1 border-t border-slate-100">
                        <span className={isAssigned ? 'text-emerald-600' : 'text-amber-600'}>
                          {isAssigned ? '✅ Planifié dans une étape' : '⏳ Non attribué'}
                        </span>
                        
                        {isOwnerOfCurrentTree && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveModuleFromTree(q.id);
                            }}
                            className="text-slate-400 hover:text-red-600 font-bold text-[8px] uppercase tracking-wider bg-slate-100 hover:bg-red-50 px-1.5 py-0.5 rounded"
                            title="Retirer du parcours"
                          >
                            Détacher
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ==================== MODALES MODIFIÉES ==================== */}

      {/* MODALE BIBLIOTHÈQUE D'IMPORTATION */}
      {activeModal === 'import_library' && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-6 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 relative flex flex-col max-h-[80vh]">
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-extrabold text-lg">×</button>
            
            <div className="border-b pb-3 mb-4">
              <h3 className="text-md font-black text-slate-950 uppercase tracking-wide">📥 Importer des modules de formation</h3>
              <p className="text-[11px] text-slate-500 font-bold">Sélectionnez les modules disponibles à intégrer à votre plan d'apprentissage</p>
            </div>

            {/* FILTRES */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <input 
                type="text" 
                placeholder="Rechercher un module..." 
                value={importSearchQuery} 
                onChange={(e) => setImportSearchQuery(e.target.value)}
                className="border rounded-lg p-2 bg-slate-50 text-xs font-bold"
              />
              <select value={importTheme} onChange={(e) => setImportTheme(e.target.value)} className="border rounded-lg p-2 bg-white text-xs font-bold">
                <option value="all">Toutes les thématiques</option>
                <option value="social">Social</option>
                <option value="env">Environnement</option>
                <option value="tech">Technologie</option>
              </select>
              <select value={importOrigin} onChange={(e) => setImportOrigin(e.target.value)} className="border rounded-lg p-2 bg-white text-xs font-bold">
                <option value="all">Tous les types (Globaux & Personnels)</option>
                <option value="local">Uniquement mes modules personnels</option>
                <option value="global">Uniquement les modules partagés</option>
              </select>
            </div>

            {/* LISTE */}
            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {filteredAvailableImports.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 font-bold">Aucun autre module disponible selon ces critères.</div>
              ) : (
                filteredAvailableImports.map((q) => {
                  const isLocal = q.owner_id === currentUserId;
                  const diffLabel = Number(q.difficulty) === 1 ? 'Basique' : Number(q.difficulty) === 2 ? 'Intermédiaire' : 'Avancé';
                  return (
                    <div key={q.id} className="p-3 border rounded-xl flex justify-between items-center bg-slate-50/50 hover:bg-slate-50 transition-all">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 text-xs">{q.name}</span>
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${getModuleBadgeStyle(q)}`}>{diffLabel}</span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${isLocal ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-700'}`}>
                            {isLocal ? '🏠 Personnel' : '🌍 Public'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-1 mt-1">{q.desc}</p>
                      </div>
                      <button 
                        onClick={() => handleImportModuleToTree(q.id)}
                        className="bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-[10px] uppercase tracking-wide px-3 py-1.5 rounded-lg transition-all"
                      >
                        Ajouter
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* EXPLORATEUR DE PARCOURS */}
      {activeModal === 'tree_browser' && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl relative border flex flex-col max-h-[80vh]">
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-extrabold text-lg">×</button>
            
            <h3 className="text-md font-black text-slate-950 uppercase tracking-wide border-b pb-3 mb-4">🔍 Sélectionner un parcours d'apprentissage</h3>
            
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold mb-4">
              <button onClick={() => setTreeBrowserTab('local')} className={`flex-1 py-2 rounded-lg transition-all ${treeBrowserTab === 'local' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>📁 Mes parcours</button>
              <button onClick={() => setTreeBrowserTab('shared')} className={`flex-1 py-2 rounded-lg transition-all ${treeBrowserTab === 'shared' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>🌍 Parcours publics</button>
            </div>

            <div className="space-y-2 overflow-y-auto flex-1">
              {Object.values(trees || {})
                .filter(t => treeBrowserTab === 'local' ? t.owner_id === currentUserId : t.visibility === 'public')
                .map((tree) => {
                  const isCurrentlyActive = tree.id === activeTreeId;
                  return (
                    <div key={tree.id} className="p-3 border rounded-xl flex justify-between items-center bg-slate-50/50">
                      <span className="font-extrabold text-slate-900 text-xs">{tree.name}</span>
                      <button
                        onClick={() => {
                          setActiveTreeId(tree.id);
                          setActiveModal(null);
                        }}
                        disabled={isCurrentlyActive}
                        className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg border ${
                          isCurrentlyActive ? 'bg-slate-200 text-slate-400 border-transparent' : 'bg-slate-950 text-white'
                        }`}
                      >
                        {isCurrentlyActive ? 'Actif' : 'Ouvrir'}
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* CRÉATION DE PARCOURS */}
      {activeModal === 'tree' && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border">
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-extrabold text-lg">×</button>
            
            <h3 className="text-md font-black text-slate-950 uppercase tracking-wide">📂 Créer un nouveau parcours de formation</h3>
            <form onSubmit={handleCreateTree} className="space-y-4 text-xs mt-4">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Intitulé du parcours :</label>
                <input type="text" required placeholder="Ex: Parcours Cybersécurité et Réseaux..." value={newTreeName} onChange={(e) => setNewTreeName(e.target.value)} className="w-full border rounded-lg p-2.5 bg-slate-50 font-bold text-xs" />
              </div>
              <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl uppercase tracking-wider transition-all">Créer le parcours</button>
            </form>
          </div>
        </div>
      )}

      {/* CRÉATION DE MODULE */}
      {activeModal === 'quest' && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border">
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-extrabold text-lg">×</button>
            
            <h3 className="text-md font-black text-slate-950 uppercase tracking-wide">📝 Créer un module de formation</h3>
            <form onSubmit={handleCreateModule} className="space-y-4 text-xs mt-4">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Intitulé du module :</label>
                <input type="text" required placeholder="Ex: Introduction aux architectures cloud" value={newModuleName} onChange={(e) => setNewModuleName(e.target.value)} className="w-full border rounded-lg p-2.5 bg-slate-50 font-bold text-xs" />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">Objectifs d'apprentissage & livrables attendus :</label>
                <textarea required placeholder="Indiquez les consignes de validation, la méthodologie ou le support requis..." value={newModuleDesc} onChange={(e) => setNewModuleDesc(e.target.value)} className="w-full border rounded-lg p-2.5 bg-slate-50 font-semibold text-xs h-24" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Domaine thématique :</label>
                  <select value={newModuleTheme} onChange={(e) => setNewModuleTheme(e.target.value)} className="w-full border rounded-lg p-2 bg-slate-50 font-bold text-xs">
                    <option value="social">Social</option>
                    <option value="env">Environnement</option>
                    <option value="tech">Technologie</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Niveau d'exigence :</label>
                  <select value={newModuleType} onChange={(e) => setNewModuleType(e.target.value)} className="w-full border rounded-lg p-2 bg-slate-50 font-bold text-xs">
                    <option value="normal">🎓 Standard (Basique)</option>
                    <option value="miniboss">📈 Intermédiaire</option>
                    <option value="boss">🏆 Avancé / Spécialisation</option>
                  </select>
                </div>
              </div>

              {/* Paramétrage collaboratif */}
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-purple-950 font-extrabold text-xs">👥 Module de groupe (Collaboratif)</label>
                  </div>
                  <input type="checkbox" checked={isCollaborative} onChange={(e) => setIsCollaborative(e.target.checked)} className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 accent-purple-700" />
                </div>
                {isCollaborative && (
                  <div className="flex items-center justify-between gap-4 pt-1 border-t border-purple-200/40">
                    <span className="text-[10px] font-bold text-purple-900">Membres requis :</span>
                    <input type="number" min="2" max="10" value={requiredPartners} onChange={(e) => setRequiredPartners(Math.max(2, parseInt(e.target.value, 10) || 2))} className="w-16 border border-purple-300 rounded p-1 text-center font-black text-purple-950 bg-white" />
                  </div>
                )}
              </div>

              <button type="submit" className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-2.5 rounded-xl mt-2 transition-all">Créer le module</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
