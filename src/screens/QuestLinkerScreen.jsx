// src/screens/QuestLinkerScreen.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const getModuleBadgeStyle = (moduleItem) => {
  if (!moduleItem) return "bg-slate-50 text-slate-700 border-slate-200";
  if (Number(moduleItem.difficulty) === 3) return "bg-red-50 text-red-700 border-red-200";
  if (Number(moduleItem.difficulty) === 2) return "bg-orange-50 text-orange-700 border-orange-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
};

export default function QuestLinkerScreen({ trees = {}, setTrees, quests = [], setQuests }) {
  const [currentUserId, setCurrentUserId] = useState(null);
  const [activeTreeId, setActiveTreeId] = useState("");
  const [inspectedModule, setInspectedModule] = useState(null);
  const [activeModal, setActiveModal] = useState(null); 

  // Petit état pour rassurer l'utilisateur sur la sauvegarde auto
  const [saveStatus, setSaveStatus] = useState("Modifications enregistrées ✅");

  // États des formulaires
  const [newModuleName, setNewModuleName] = useState('');
  const [newModuleDesc, setNewModuleDesc] = useState('');
  const [newModuleTheme, setNewModuleTheme] = useState('Général');
  const [newModuleType, setNewModuleType] = useState('normal');
  const [newTreeName, setNewTreeName] = useState('');
  const [newFloorMode, setNewFloorMode] = useState('static');

  // Mode collaboratif
  const [isCollaborative, setIsCollaborative] = useState(false);
  const [requiredPartners, setRequiredPartners] = useState(2);

  // Filtres
  const [importSearchQuery, setImportSearchQuery] = useState('');
  const [importOrigin, setImportOrigin] = useState('all');
  const [importTreeFilter, setImportTreeFilter] = useState('all'); 
  const [catalogTypeFilter, setCatalogTypeFilter] = useState('all');
  const [treeBrowserTab, setTreeBrowserTab] = useState('local');

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
  const isOwnerOfCurrentTree = currentTree && currentTree.owner_id === currentUserId;

  const getImportedModuleIds = () => {
    if (!currentTree) return [];
    const explicitImports = currentTree.imported_quests || [];
    const floorQuests = (currentTree.floors || []).flatMap(f => f.quests || []);
    return Array.from(new Set([...explicitImports, ...floorQuests]));
  };

  const importedModuleIds = getImportedModuleIds();
  const importedModulesList = (quests || []).filter(q => q && importedModuleIds.includes(q.id));
  const availableToImportModules = (quests || []).filter(q => q && !importedModuleIds.includes(q.id));
  const assignedModuleIds = currentTree && currentTree.floors ? currentTree.floors.flatMap(f => f.quests || []) : [];

  // --- FONCTION CENTRALISÉE DE SAUVEGARDE INSTANTANÉE EN BD ---
  const persistTreeChanges = async (treeId, updatedFields) => {
    if (!isOwnerOfCurrentTree) return;
    setSaveStatus("Enregistrement... ⏳");
    
    // Si on met à jour les floors, on recalcule aussi la contrainte d'équipe max à la volée avant envoi
    let finalFields = { ...updatedFields };
    if (updatedFields.floors) {
      const attachedModuleIds = updatedFields.floors.flatMap(f => f.quests || []);
      const linkedModules = (quests || []).filter(q => attachedModuleIds.includes(q.id));
      const maxConstraint = linkedModules.reduce((max, q) => {
        if (q.is_collaborative || q.is_collaborative === 'true') {
          return Math.max(max, Number(q.required_partners) || 2);
        }
        return max;
      }, 1);
      finalFields.max_team_constraint = maxConstraint;
    }

    const { error } = await supabase
      .from('trees')
      .update(finalFields)
      .eq('id', treeId);

    if (!error) {
      if (typeof setTrees === 'function') {
        setTrees(prev => ({
          ...prev,
          [treeId]: { ...prev[treeId], ...finalFields }
        }));
      }
      setSaveStatus("Modifications enregistrées ✅");
    } else {
      setSaveStatus("❌ Erreur de sauvegarde");
      console.error(error);
    }
  };

  // ACTIONS DES MODULES (SAUVEGARDE DIRECTE)
  const handleImportModuleToTree = async (moduleId) => {
    if (!currentTree || !isOwnerOfCurrentTree) return;
    const nextImported = Array.from(new Set([...(currentTree.imported_quests || []), moduleId]));
    await persistTreeChanges(currentTree.id, { imported_quests: nextImported });
  };

  const handleRemoveModuleFromTree = async (moduleId) => {
    if (!currentTree || !isOwnerOfCurrentTree) return;
    const nextImported = (currentTree.imported_quests || []).filter(id => id !== moduleId);
    const nextFloors = (currentTree.floors || []).map(f => ({
      ...f,
      quests: (f.quests || []).filter(id => id !== moduleId)
    }));

    await persistTreeChanges(currentTree.id, { imported_quests: nextImported, floors: nextFloors });
    if (inspectedModule?.id === moduleId) setInspectedModule(null);
  };

  const handleShareTree = async () => {
    if (!currentTree || !isOwnerOfCurrentTree) return;
    await persistTreeChanges(currentTree.id, { visibility: 'public' });
    alert(`🌍 Le parcours "${currentTree.name}" est désormais public !`);
  };

  // GESTION DES ÉTAPES (SAUVEGARDE DIRECTE)
  const handleAddFloor = async () => {
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

    await persistTreeChanges(currentTree.id, { floors: updatedFloors });
  };

  const handleRemoveFloor = async (floorId) => {
    if (!currentTree || !currentTree.floors || !isOwnerOfCurrentTree) return;
    const updatedFloors = currentTree.floors.filter(f => f.floorId !== floorId);
    await persistTreeChanges(currentTree.id, { floors: updatedFloors });
  };

  const toggleFloorMode = async (floorId) => {
    if (!currentTree || !currentTree.floors || !isOwnerOfCurrentTree) return;
    const updatedFloors = currentTree.floors.map(f => 
      f.floorId === floorId ? { ...f, mode: f.mode === 'static' ? 'random' : 'static' } : f
    );
    await persistTreeChanges(currentTree.id, { floors: updatedFloors });
  };

  const handleUpdateFloorCount = async (floorId, newCount) => {
    if (!currentTree || !currentTree.floors || !isOwnerOfCurrentTree) return;
    const val = Math.max(1, parseInt(newCount, 10) || 1);
    const updatedFloors = currentTree.floors.map(f => 
      f.floorId === floorId ? { ...f, count: val } : f
    );
    await persistTreeChanges(currentTree.id, { floors: updatedFloors });
  };

  const handleToggleDifficultyInFloor = async (floorId, diffLevel) => {
    if (!currentTree || !currentTree.floors || !isOwnerOfCurrentTree) return;
    const updatedFloors = currentTree.floors.map(f => {
      if (f.floorId !== floorId) return f;
      const currentDiffs = f.allowedDifficulties || [1, 2, 3];
      const nextDiffs = currentDiffs.includes(Number(diffLevel))
        ? currentDiffs.filter(d => Number(d) !== Number(diffLevel))
        : [...currentDiffs, Number(diffLevel)];
      return { ...f, allowedDifficulties: nextDiffs.map(d => Number(d)) };
    });
    await persistTreeChanges(currentTree.id, { floors: updatedFloors });
  };

  const handleToggleModuleInFloor = async (floorId, moduleId) => {
    if (!currentTree || !currentTree.floors || !isOwnerOfCurrentTree) return;
    
    const updatedFloors = currentTree.floors.map(f => {
      if (f.floorId === floorId) {
        const isSelected = (f.quests || []).includes(moduleId);
        return {
          ...f,
          quests: isSelected ? f.quests.filter(id => id !== moduleId) : [...(f.quests || []), moduleId]
        };
      }
      return { ...f, quests: (f.quests || []).filter(id => id !== moduleId) };
    });

    await persistTreeChanges(currentTree.id, { floors: updatedFloors });
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
        const nextImported = Array.from(new Set([...(currentTree.imported_quests || []), data.id]));
        await persistTreeChanges(currentTree.id, { imported_quests: nextImported });
      }
      setNewModuleName(''); 
      setNewModuleDesc(''); 
      setActiveModal(null);
    }
  };

  // Filtrages de listes locaux (inchangés)
  const filteredAvailableImports = availableToImportModules.filter(q => {
    const matchesSearch = q.name.toLowerCase().includes(importSearchQuery.toLowerCase()) || q.desc.toLowerCase().includes(importSearchQuery.toLowerCase());
    let matchesTree = true;
    if (importTreeFilter !== 'all') {
      const targetTree = trees[importTreeFilter];
      matchesTree = targetTree ? (targetTree.imported_quests || []).includes(q.id) : false;
    }
    return matchesSearch && matchesTree && (importOrigin === 'all' || (importOrigin === 'local' && q.owner_id === currentUserId) || (importOrigin === 'global' && q.owner_id !== currentUserId));
  });

  const filteredImportedModulesList = importedModulesList.filter(q => {
    if (catalogTypeFilter === 'all') return true;
    const diffNum = Number(q.difficulty);
    return (catalogTypeFilter === 'normal' && diffNum === 1) || (catalogTypeFilter === 'miniboss' && diffNum === 2) || (catalogTypeFilter === 'boss' && diffNum === 3);
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 pr-16 space-y-6 relative">
      
      {/* BARRE LATÉRALE D'ACTIONS (SANS LE BOUTON DE SAUVEGARDE MANUELLE) */}
      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40 flex items-center group">
        <div className="w-1.5 h-20 bg-slate-300 rounded-l-md group-hover:bg-purple-500 transition-colors shadow-xs"></div>
        <div className="flex flex-col items-center justify-center gap-4 bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-r-2xl py-5 px-2.5 shadow-lg transition-all duration-300 translate-x-1 group-hover:translate-x-0 group-hover:bg-white group-hover:border-slate-300">
          
          <div className="relative group/btn flex items-center justify-center">
            <button onClick={() => setActiveModal('tree')} className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 text-sm flex items-center justify-center shadow-2xs hover:bg-purple-50 hover:border-purple-400 hover:text-purple-600 transition-all cursor-pointer">📂</button>
            <div className="absolute right-12 scale-0 group-hover/btn:scale-100 opacity-0 group-hover/btn:opacity-100 transition-all duration-150 z-50 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg shadow-xl pointer-events-none text-white whitespace-nowrap text-right"><p className="text-[11px] font-black">Nouveau parcours</p></div>
          </div>

          <div className="relative group/btn flex items-center justify-center">
            <button onClick={() => setActiveModal('import_library')} className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 text-sm flex items-center justify-center shadow-2xs hover:bg-purple-50 hover:border-purple-400 hover:text-purple-600 transition-all cursor-pointer">📥</button>
            <div className="absolute right-12 scale-0 group-hover/btn:scale-100 opacity-0 group-hover/btn:opacity-100 transition-all duration-150 z-50 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg shadow-xl pointer-events-none text-white whitespace-nowrap text-right"><p className="text-[11px] font-black">Importer des modules</p></div>
          </div>

          <div className="relative group/btn flex items-center justify-center">
            <button onClick={() => setActiveModal('quest')} className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 text-sm flex items-center justify-center shadow-2xs hover:bg-purple-50 hover:border-purple-400 hover:text-purple-600 transition-all cursor-pointer">📝</button>
            <div className="absolute right-12 scale-0 group-hover/btn:scale-100 opacity-0 group-hover/btn:opacity-100 transition-all duration-150 z-50 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg shadow-xl pointer-events-none text-white whitespace-nowrap text-right"><p className="text-[11px] font-black">Créer un Module</p></div>
          </div>

          {currentTree && isOwnerOfCurrentTree && (
            <div className="relative group/btn flex items-center justify-center">
              <button onClick={handleShareTree} disabled={currentTree.visibility === 'public'} className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 text-sm flex items-center justify-center shadow-2xs hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 transition-all cursor-pointer disabled:opacity-40">🌍</button>
              <div className="absolute right-12 scale-0 group-hover/btn:scale-100 opacity-0 group-hover/btn:opacity-100 transition-all duration-150 z-50 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg shadow-xl pointer-events-none text-white whitespace-nowrap text-right"><p className="text-[11px] font-black">Rendre public</p></div>
            </div>
          )}
        </div>
      </div>

      {/* EN-TÊTE AVEC LE PETIT STATUT DE SAUVEGARDE AUTOMATIQUE */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-xs gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-black text-slate-950 uppercase tracking-wide">📂 Concepteur de Parcours de Formation</h1>
            {currentTree && isOwnerOfCurrentTree && (
              <span className="text-[10px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md font-bold text-slate-600">
                {saveStatus}
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 font-extrabold uppercase">Vos modifications sont enregistrées en temps réel</p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs font-bold">
          {currentTree && (
            <span className="text-purple-700 font-black bg-purple-100/80 px-3 py-1.5 rounded-lg border border-purple-200">
              👥 Taille d'équipe max : <span className="text-sm font-black">{currentTree.max_team_constraint || 1} pers.</span>
            </span>
          )}
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Parcours actif :</span>
            <button onClick={() => setActiveModal('tree_browser')} className="bg-purple-50 border border-purple-200 rounded-lg p-2 text-purple-900 text-left font-bold min-w-[180px] flex justify-between items-center hover:bg-purple-100 transition-all">
              <span className="truncate">{currentTree ? currentTree.name : "-- Choisir --"}</span>
              <span className="text-[10px]">🔍 Parcourir</span>
            </button>
          </div>
        </div>
      </div>

      {/* REST DE L'INTERFACE (Identique à ton affichage, mais toutes les actions synchronisent la BD) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                        
                        <button disabled={!isOwnerOfCurrentTree} onClick={() => toggleFloorMode(floor.floorId)} className={`text-xs font-bold px-3 py-1 rounded-full border transition-all ${floor.mode === 'static' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {floor.mode === 'static' ? '📌 Fixe (Tous obligatoires)' : '🎲 Sélection aléatoire'}
                        </button>

                        {floor.mode === 'random' && (
                          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                            <span className="text-[10px] font-black text-amber-800">Tirer au sort :</span>
                            <input type="number" min="1" max="10" value={floor.count || 2} disabled={!isOwnerOfCurrentTree} onChange={(e) => handleUpdateFloorCount(floor.floorId, e.target.value)} className="w-10 bg-white border border-amber-300 rounded text-center text-xs font-black text-amber-950" />
                            <span className="text-[10px] font-extrabold text-amber-800">modules</span>
                          </div>
                        )}

                        <div className="flex items-center bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 gap-1">
                          {[1, 2, 3].map(level => (
                            <button key={level} disabled={!isOwnerOfCurrentTree} onClick={() => handleToggleDifficultyInFloor(floor.floorId, level)} className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-black transition-all ${allowedDiffs.includes(level) ? 'bg-amber-400 text-amber-950 border border-amber-500' : 'text-slate-400 hover:bg-slate-200'}`}>
                              {level === 1 ? 'N' : level === 2 ? 'M' : 'B'}
                            </button>
                          ))}
                        </div>
                      </div>
                      {isOwnerOfCurrentTree && <button onClick={() => handleRemoveFloor(floor.floorId)} className="text-slate-400 hover:text-red-500 text-xs font-bold">Supprimer l'étape</button>}
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-500 uppercase">Modules attribués :</div>
                      <div className="flex flex-wrap gap-2">
                        {importedModulesList.filter(q => allowedDiffs.includes(Number(q.difficulty))).map(moduleItem => {
                          const isSelected = (floor.quests || []).includes(moduleItem.id);
                          const isOtherFloorSelected = assignedModuleIds.includes(moduleItem.id) && !isSelected;
                          return (
                            <div key={moduleItem.id} className="flex items-center gap-1.5">
                              <button disabled={!isOwnerOfCurrentTree || isOtherFloorSelected} onClick={() => handleToggleModuleInFloor(floor.floorId, moduleItem.id)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1.5 cursor-pointer ${isSelected ? 'bg-purple-700 text-white border-purple-800' : isOtherFloorSelected ? 'bg-slate-100 text-slate-400 border-slate-200 line-through opacity-50 cursor-not-allowed' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
                                <span>{moduleItem.name}</span>
                                <span className="text-[9px] opacity-60">({Number(moduleItem.difficulty) === 1 ? 'Normal' : Number(moduleItem.difficulty) === 2 ? 'Miniboss' : 'Boss'})</span>
                              </button>
                              <button onClick={() => setInspectedModule(moduleItem)} className={`p-1 rounded border text-[10px] ${inspectedModule?.id === moduleItem.id ? 'bg-purple-100 border-purple-300' : 'bg-slate-100 border-slate-200'}`}>👁️</button>
                            </div>
                          );
                        })}
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
                  <button onClick={handleAddFloor} className="bg-purple-700 hover:bg-purple-800 text-white font-extrabold px-5 py-2 rounded-xl text-xs uppercase tracking-wider">➕ Ajouter une Étape</button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 font-bold">Veuillez sélectionner un parcours actif.</div>
          )}
        </div>

        {/* CATALOGUE DROITE */}
        <div className="lg:col-span-1 space-y-6">
          {inspectedModule && (
            <div className="bg-purple-950 text-white border border-purple-800 rounded-xl p-5 shadow-md space-y-3">
              <div className="flex justify-between items-start gap-2">
                <span className="text-[9px] font-black uppercase tracking-wider bg-purple-800 text-purple-200 px-2 py-0.5 rounded">SPÉCIFICATIONS</span>
                <button onClick={() => setInspectedModule(null)} className="text-purple-300 hover:text-white font-bold">×</button>
              </div>
              <h4 className="text-xs font-black uppercase">{inspectedModule.name}</h4>
              <p className="text-[11px] text-purple-200 bg-purple-900/40 p-3 rounded-lg border border-purple-900">{inspectedModule.desc}</p>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="border-b pb-3 flex justify-between items-center">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-800">📦 Modules intégrés ({filteredImportedModulesList.length})</h3>
              </div>
              <button onClick={() => setActiveModal('import_library')} className="bg-purple-100 text-purple-800 text-[10px] font-black px-2 py-1 rounded-lg">📥 Importer</button>
            </div>
            
            <select value={catalogTypeFilter} onChange={(e) => setCatalogTypeFilter(e.target.value)} className="w-full border border-slate-200 rounded-lg p-1.5 bg-slate-50 text-[10px] font-bold">
              <option value="all">📁 Filtrer par Type (Tous)</option>
              <option value="normal">🎓 Modules Normaux</option>
              <option value="miniboss">📈 Modules Miniboss</option>
              <option value="boss">🏆 Modules Boss</option>
            </select>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {filteredImportedModulesList.map((q) => (
                <div key={q.id} onClick={() => setInspectedModule(q)} className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col gap-1.5 ${inspectedModule?.id === q.id ? 'border-purple-500 bg-purple-50/50' : 'border-slate-200 bg-slate-50/30'}`}>
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-extrabold text-slate-900 text-xs">{q.name}</span>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${getModuleBadgeStyle(q)}`}>{Number(q.difficulty) === 1 ? 'Normal' : Number(q.difficulty) === 2 ? 'Miniboss' : 'Boss'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold pt-1 border-t">
                    <span className={assignedModuleIds.includes(q.id) ? 'text-emerald-600' : 'text-amber-600'}>{assignedModuleIds.includes(q.id) ? '✅ Planifié' : '⏳ Non attribué'}</span>
                    {isOwnerOfCurrentTree && <button onClick={(e) => { e.stopPropagation(); handleRemoveModuleFromTree(q.id); }} className="text-slate-400 hover:text-red-600 text-[8px] uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">Détacher</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODALE BIBLIOTHÈQUE */}
      {activeModal === 'import_library' && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[80vh]">
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-slate-400 font-extrabold text-lg">×</button>
            <h3 className="text-md font-black text-slate-950 uppercase border-b pb-3 mb-4">📥 Importer des modules</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <input type="text" placeholder="Rechercher..." value={importSearchQuery} onChange={(e) => setImportSearchQuery(e.target.value)} className="border rounded-lg p-2 bg-slate-50 text-xs font-bold" />
              <select value={importTreeFilter} onChange={(e) => setImportTreeFilter(e.target.value)} className="border rounded-lg p-2 bg-white text-xs font-bold">
                <option value="all">🌳 Toutes les formations</option>
                {Object.values(trees || {}).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select value={importOrigin} onChange={(e) => setImportOrigin(e.target.value)} className="border rounded-lg p-2 bg-white text-xs font-bold">
                <option value="all">Tous (Globaux & Personnels)</option>
                <option value="local">Uniquement mes modules</option>
                <option value="global">Uniquement partagés</option>
              </select>
            </div>
            <div className="space-y-2 overflow-y-auto flex-1">
              {filteredAvailableImports.map((q) => (
                <div key={q.id} className="p-3 border rounded-xl flex justify-between items-center bg-slate-50/50">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-xs">{q.name}</span>
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${getModuleBadgeStyle(q)}`}>{Number(q.difficulty) === 1 ? 'Normal' : Number(q.difficulty) === 2 ? 'Miniboss' : 'Boss'}</span>
                    </div>
                  </div>
                  <button onClick={() => handleImportModuleToTree(q.id)} className="bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-lg">Ajouter</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AUTRES MODALES (EXPLORATEUR, CRÉATION) */}
      {activeModal === 'tree_browser' && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl flex flex-col max-h-[80vh]">
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-slate-400 font-extrabold text-lg">×</button>
            <h3 className="text-md font-black text-slate-950 uppercase border-b pb-3 mb-4">🔍 Choisir un parcours</h3>
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold mb-4">
              <button onClick={() => setTreeBrowserTab('local')} className={`flex-1 py-2 rounded-lg ${treeBrowserTab === 'local' ? 'bg-white text-slate-900' : 'text-slate-500'}`}>Mes parcours</button>
              <button onClick={() => setTreeBrowserTab('shared')} className={`flex-1 py-2 rounded-lg ${treeBrowserTab === 'shared' ? 'bg-white text-slate-900' : 'text-slate-500'}`}>Publics</button>
            </div>
            <div className="space-y-2 overflow-y-auto flex-1">
              {Object.values(trees || {}).filter(t => treeBrowserTab === 'local' ? t.owner_id === currentUserId : t.visibility === 'public').map((tree) => (
                <div key={tree.id} className="p-3 border rounded-xl flex justify-between items-center">
                  <span className="font-extrabold text-slate-900 text-xs">{tree.name}</span>
                  <button onClick={() => { setActiveTreeId(tree.id); setActiveModal(null); }} disabled={tree.id === activeTreeId} className={`text-[10px] font-black px-3 py-1.5 rounded-lg ${tree.id === activeTreeId ? 'bg-slate-200 text-slate-400' : 'bg-slate-950 text-white'}`}>{tree.id === activeTreeId ? 'Actif' : 'Ouvrir'}</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CRÉATION DE PARCOURS */}
      {activeModal === 'tree' && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border">
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-slate-400 font-extrabold text-lg">×</button>
            <h3 className="text-md font-black text-slate-950 uppercase">📂 Créer un parcours</h3>
            <form onSubmit={handleCreateTree} className="space-y-4 text-xs mt-4">
              <input type="text" required placeholder="Ex: Parcours Cybersécurité..." value={newTreeName} onChange={(e) => setNewTreeName(e.target.value)} className="w-full border rounded-lg p-2.5 bg-slate-50 font-bold" />
              <button type="submit" className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl">Créer</button>
            </form>
          </div>
        </div>
      )}

      {/* CRÉATION DE MODULE */}
      {activeModal === 'quest' && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border">
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-slate-400 font-extrabold text-lg">×</button>
            <h3 className="text-md font-black text-slate-950 uppercase">📝 Créer un module</h3>
            <form onSubmit={handleCreateModule} className="space-y-4 text-xs mt-4">
              <input type="text" required placeholder="Intitulé..." value={newModuleName} onChange={(e) => setNewModuleName(e.target.value)} className="w-full border rounded-lg p-2.5 bg-slate-50 font-bold" />
              <textarea required placeholder="Objectifs..." value={newModuleDesc} onChange={(e) => setNewModuleDesc(e.target.value)} className="w-full border rounded-lg p-2.5 bg-slate-50 h-24" />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" required placeholder="Tag..." value={newModuleTheme} onChange={(e) => setNewModuleTheme(e.target.value)} className="w-full border rounded-lg p-2 bg-slate-50 font-bold" />
                <select value={newModuleType} onChange={(e) => setNewModuleType(e.target.value)} className="w-full border rounded-lg p-2 bg-slate-50 font-bold">
                  <option value="normal">🎓 Normal</option>
                  <option value="miniboss">📈 Miniboss</option>
                  <option value="boss">🏆 Boss</option>
                </select>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 flex justify-between items-center">
                <label className="text-purple-950 font-extrabold">👥 Collaboratif</label>
                <input type="checkbox" checked={isCollaborative} onChange={(e) => setIsCollaborative(e.target.checked)} className="accent-purple-700" />
              </div>
              <button type="submit" className="w-full bg-purple-700 text-white font-bold py-2.5 rounded-xl">Créer et importer</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
