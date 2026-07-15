// src/screens/StudioScreen.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

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
  
  // États de sélection et modes
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [viewMode, setViewMode] = useState("view"); // "view" (lecture seule) ou "edit" (modification)
  const [activeModal, setActiveModal] = useState(null); 
  
  // Zoom sur un palier pour en inspecter le contenu
  const [selectedInspectFloor, setSelectedInspectFloor] = useState(null);

  // États des formulaires
  const [newSessionCode, setNewSessionCode] = useState('');
  const [newSessionDate, setNewSessionDate] = useState(new Date().toISOString().split('T')[0]);

  // Recherche RH & Cache
  const [drhSearchQuery, setDrhSearchQuery] = useState('');
  const [drhSuggestions, setDrhSuggestions] = useState([]);

  // Config des blocs personnalisés
  const [customBlockConfig, setCustomBlockConfig] = useState({
    name: 'Pause Café / Réflexion',
    desc: 'Un moment de débrief libre ou de pause active',
    color: '#3b82f6',
    duration: 15
  });

  const [draggedPlanningItem, setDraggedPlanningItem] = useState(null);
  const [activeDropIndex, setActiveDropIndex] = useState(null);

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

  const handleSaveChanges = async () => {
    if (currentSession) {
      const { error } = await supabase.from('sessions').update({ 
        tree_id: currentSession.tree_id, 
        drh_ids: currentSession.drh_ids || [],
        planning: currentSession.planning || [],
        start_time: currentSession.start_time || '09:00',
        end_time_mode: currentSession.end_time_mode || 'auto',
        formation_date: currentSession.formation_date || null,
        end_time: currentSession.end_time_mode === 'auto'
          ? calculateEndTime(currentSession.start_time || '09:00', currentSession.planning)
          : currentSession.end_time
      }).eq('id', currentSession.id);

      if (error) alert(`❌ Erreur : ${error.message}`);
      else {
        alert(`🎉 Session enregistrée avec succès !`);
        setViewMode("view"); // Repasse automatiquement en mode lecture seule après sauvegarde
      }
    }
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
    updateCurrentSessionInState({ drh_ids: [...currentDrhIds, drhUser.id] });
    setDrhSearchQuery(''); setDrhSuggestions([]);
  };

  const handleRemoveDRH = (drhId) => {
    if (!currentSession) return;
    updateCurrentSessionInState({ drh_ids: (currentSession.drh_ids || []).filter(id => id !== drhId) });
  };

  // --- DRAG & DROP LOGIQUE ---
  const checkPlacementValidity = (floorId, targetIndex, timeline) => {
    if (!floorId) return true;
    let prevMaxFloor = -1;
    for (let i = 0; i < targetIndex; i++) {
      if (timeline[i]?.type === 'palier') prevMaxFloor = Math.max(prevMaxFloor, timeline[i].floorId);
    }
    let nextMinFloor = 999;
    for (let i = targetIndex; i < timeline.length; i++) {
      if (timeline[i]?.type === 'palier') nextMinFloor = Math.min(nextMinFloor, timeline[i].floorId);
    }
    return floorId > prevMaxFloor && floorId < nextMinFloor;
  };

  const handleTimelineDrop = (targetIndex) => {
    if (!currentSession || !draggedPlanningItem) return;
    const timeline = currentSession.planning ? [...currentSession.planning] : [];

    if (draggedPlanningItem.source === 'palette-palier') {
      const floor = draggedPlanningItem.data;
      if (!checkPlacementValidity(floor.floorId, targetIndex, timeline)) {
        alert(`🚫 Le Palier ${floor.floorId} doit respecter l'ordre chronologique.`);
        setActiveDropIndex(null); setDraggedPlanningItem(null);
        return;
      }
      const newBlock = {
        id: `palier-${floor.floorId}-${Date.now()}`,
        type: 'palier',
        floorId: floor.floorId,
        name: `🎯 Palier ${floor.floorId} : ${floor.name || 'Sans nom'}`,
        desc: `${(floor.quests || []).length} activités associées à ce niveau.`,
        color: '#7c3aed',
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
      
      if (movedBlock.type === 'palier' && !checkPlacementValidity(movedBlock.floorId, targetIndex, timeline)) {
        alert(`🚫 Mouvement invalide.`);
        setActiveDropIndex(null); setDraggedPlanningItem(null);
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
    updateCurrentSessionInState({ planning: (currentSession.planning || []).filter(b => b.id !== blockId) });
  };

  const updatePlanningBlockDuration = (blockId, value) => {
    if (!currentSession) return;
    const mins = Math.max(1, parseInt(value, 10) || 15);
    updateCurrentSessionInState({ planning: (currentSession.planning || []).map(b => b.id === blockId ? { ...b, duration: mins } : b) });
  };

  // Calcule les horaires défilants pour l'aperçu du planning
  const getTimelineWithHours = () => {
    if (!currentSession) return [];
    let currentMinutes = 0;
    const [startHours, startMinutes] = (currentSession.start_time || '09:00').split(':').map(Number);
    if (!isNaN(startHours) && !isNaN(startMinutes)) {
      currentMinutes = startHours * 60 + startMinutes;
    }

    return (currentSession.planning || []).map(block => {
      const hr = Math.floor(currentMinutes / 60) % 24;
      const min = currentMinutes % 60;
      const timeString = `${String(hr).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      currentMinutes += parseInt(block.duration || 0, 10);
      return { ...block, startTimeFormatted: timeString };
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 pl-24 space-y-6 relative">
      
      {/* EN-TÊTE PRINCIPAL */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">💼 Espace Formateur</h1>
          <p className="text-xs text-slate-500 font-bold">Consultez l'agenda de votre journée ou éditez la structure de vos sessions.</p>
        </div>
        <button 
          onClick={() => setActiveModal('session')} 
          className="bg-blue-700 hover:bg-blue-800 text-white font-black text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition-all shadow-sm"
        >
          ➕ Nouvelle session
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLONNE GAUCHE : LISTE DES SESSIONS */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">📅 Liste des sessions</h3>
            
            <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
              {sessions.map(s => {
                const isSelected = String(s.id) === String(activeSessionId);
                const sTree = trees[s.tree_id];
                const formattedDate = s.formation_date 
                  ? new Date(s.formation_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                  : "Sans date";

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
                      <p>⏰ Agenda : <span className="font-extrabold text-slate-800 font-mono">{(s.start_time || '09:00')} - {s.end_time_mode === 'auto' ? 'Calculé' : (s.end_time || 'Calculé')}</span></p>
                      <p>🔗 Étapes : <span className="font-extrabold text-blue-700">{s.planning?.length || 0} blocs</span></p>
                    </div>

                    {/* ACTIONS SUR CHAQUE SESSION */}
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
              
              {/* ==================== MODE 👁️ VOIR : JUSTE LE PLANNING (PROPRE & CHRONOLOGIQUE) ==================== */}
              {viewMode === "view" && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
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

                  {/* TIMELINE DE LECTURE SEULE */}
                  <div className="space-y-4 relative pl-4 border-l-2 border-slate-100">
                    {getTimelineWithHours().length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400 font-bold">
                        Aucune étape configurée dans cet agenda. Cliquez sur "Éditer" pour structurer la journée.
                      </div>
                    ) : (
                      getTimelineWithHours().map((block) => (
                        <div 
                          key={block.id}
                          className="flex items-start gap-4 relative group"
                        >
                          {/* Point Horaire */}
                          <div className="font-mono text-xs font-black text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md border shrink-0">
                            {block.startTimeFormatted}
                          </div>

                          {/* Bloc d'activité */}
                          <div 
                            className="bg-white border rounded-xl p-4 shadow-xs flex-1 transition-all hover:shadow-md cursor-pointer"
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
                                <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
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

              {/* ==================== MODE ✏️ MODIFIER : ÉDITION ET DRAG & DROP ==================== */}
              {viewMode === "edit" && (
                <div className="space-y-6">
                  
                  {/* EN-TÊTE CONFIGURATION */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">Édition en cours</span>
                      <h2 className="text-lg font-black text-slate-900 mt-1">Éditeur de {currentSession.session_code}</h2>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setViewMode("view")}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold py-2 px-4 rounded-xl text-xs uppercase"
                      >
                        Annuler
                      </button>
                      <button 
                        onClick={handleSaveChanges}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2 px-4 rounded-xl text-xs uppercase tracking-wider shadow-sm"
                      >
                        💾 Sauvegarder
                      </button>
                    </div>
                  </div>

                  {/* CONFIGURATION PARAMÈTRES (Date, Heures, Arbre, DRH) */}
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

                      <div className="space-y-1">
                        <label className="block font-black text-slate-700 text-[10px] uppercase">DRH Associés :</label>
                        <input 
                          type="text"
                          placeholder="Rechercher un e-mail..."
                          value={drhSearchQuery}
                          onChange={(e) => setDrhSearchQuery(e.target.value)}
                          className="w-full border rounded-lg p-2 bg-white text-xs"
                        />
                        {drhSuggestions.length > 0 && (
                          <div className="absolute z-50 bg-white border rounded shadow-md mt-1 max-h-32 overflow-y-auto">
                            {drhSuggestions.map(s => (
                              <button key={s.id} onClick={() => handleAddDRH(s)} className="block w-full text-left p-1.5 text-xs font-bold hover:bg-slate-100">{s.email}</button>
                            ))}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {(currentSession.drh_ids || []).map(id => (
                            <div key={id} className="bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                              <span>{id}</span>
                              <button onClick={() => handleRemoveDRH(id)} className="text-red-500">×</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* DRAG AND DROP DES ETAPES */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* TIMELINE ACTIVE (2/3) */}
                    <div className="md:col-span-2 space-y-3">
                      <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Plan de la journée (Glissez-déposez pour réorganiser)</h4>
                      
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
                            Déposez des blocs ici pour créer la journée de formation.
                          </div>
                        )}

                        {(currentSession.planning || []).map((block, index) => (
                          <React.Fragment key={block.id}>
                            <div 
                              onDragOver={(e) => { e.preventDefault(); setActiveDropIndex(index); }}
                              onDragLeave={() => setActiveDropIndex(null)}
                              onDrop={() => handleTimelineDrop(index)}
                              className={`h-2 rounded transition-all ${activeDropIndex === index ? 'bg-blue-500 my-1' : 'bg-transparent'}`}
                            />
                            
                            <div 
                              draggable
                              onDragStart={() => setDraggedPlanningItem({ source: 'timeline', index })}
                              className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between gap-4 transition-all"
                              style={{ borderLeftWidth: '6px', borderLeftColor: block.color || '#94a3b8' }}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="text-slate-400 cursor-grab active:cursor-grabbing font-bold text-sm">⠿</span>
                                <div className="min-w-0">
                                  <h5 className="font-extrabold text-slate-800 text-xs truncate flex items-center gap-1.5">
                                    {block.name}
                                    {block.type === 'palier' && (
                                      <button 
                                        type="button"
                                        onClick={() => {
                                          const matchedFloor = linkedTree?.floors?.find(f => f.floorId === block.floorId);
                                          if (matchedFloor) setSelectedInspectFloor(matchedFloor);
                                        }}
                                        className="text-[9px] text-purple-600 bg-purple-50 hover:bg-purple-100 border px-1.5 py-0.5 rounded font-black"
                                      >
                                        🔍 Voir contenu
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
                                <button onClick={() => removePlanningBlock(block.id)} className="text-red-500 hover:text-red-700 font-bold text-xs bg-red-50 p-1 rounded-lg">🗑️</button>
                              </div>
                            </div>
                          </React.Fragment>
                        ))}

                        {(currentSession.planning || []).length > 0 && (
                          <div 
                            onDragOver={(e) => { e.preventDefault(); setActiveDropIndex(currentSession.planning.length); }}
                            onDragLeave={() => setActiveDropIndex(null)}
                            onDrop={() => handleTimelineDrop(currentSession.planning.length)}
                            className={`h-4 rounded transition-all ${activeDropIndex === currentSession.planning.length ? 'bg-blue-500 my-1' : 'bg-transparent'}`}
                          />
                        )}
                      </div>
                    </div>

                    {/* PALETTE D'ACTIVITES (1/3) */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">🛠️ Palette</h4>
                      
                      {linkedTree ? (
                        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                          <span className="block text-[10px] font-black uppercase text-purple-700">Paliers de l'arbre ({linkedTree.name})</span>
                          {(linkedTree.floors || []).map(floor => (
                            <div
                              key={floor.floorId}
                              draggable
                              onDragStart={() => setDraggedPlanningItem({ source: 'palette-palier', data: floor })}
                              className="bg-purple-50 border border-purple-200 hover:bg-purple-100 p-2.5 rounded-lg cursor-grab active:cursor-grabbing flex justify-between items-center transition-all"
                            >
                              <div className="min-w-0">
                                <span className="font-extrabold text-xs text-purple-900 block truncate">🎯 Palier {floor.floorId}</span>
                                <span className="text-[9px] text-purple-500 font-bold">{(floor.quests || []).length} activités</span>
                              </div>
                              <span className="text-[10px] bg-purple-700 text-white font-extrabold px-2 py-0.5 rounded-md">45m</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-slate-100 rounded-xl p-4 text-center text-[10px] font-bold text-slate-500">
                          Associez un arbre ci-dessus pour débloquer ses paliers.
                        </div>
                      )}

                      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
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
                          className="bg-white hover:bg-slate-50 p-2.5 rounded-lg border border-dashed border-slate-300 cursor-grab active:cursor-grabbing flex justify-between items-center"
                          style={{ borderLeftWidth: '5px', borderLeftColor: customBlockConfig.color }}
                        >
                          <span className="font-extrabold text-xs truncate">{customBlockConfig.name}</span>
                          <span className="text-[10px] bg-slate-100 px-1 rounded">{customBlockConfig.duration}m</span>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              )}

            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-4">
              <span className="text-4xl block">👈</span>
              <h3 className="text-sm font-black text-slate-800 uppercase">Aucune session sélectionnée</h3>
              <p className="text-xs text-slate-400 font-bold max-w-md mx-auto">Choisissez une session dans le panneau de gauche et cliquez sur 👁️ Voir pour consulter l'agenda ou ✏️ Modifier pour la paramétrer.</p>
            </div>
          )}
        </div>

      </div>

      {/* --- INSPECTEUR DE PALIER : DÉVOILE LE CONTENU DE LA FORMATION --- */}
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

              {/* CONTENU (QUÊTES ET COMPÉTENCES) */}
              <div className="space-y-4 text-xs">
                <div>
                  <h4 className="font-bold text-slate-500 uppercase text-[10px] mb-2">🎯 Quêtes & Exercices de ce palier :</h4>
                  {(selectedInspectFloor.quests || []).length === 0 ? (
                    <p className="text-slate-400 italic">Aucune quête définie sur ce palier.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedInspectFloor.quests.map((q, qIndex) => (
                        <div key={q.id || qIndex} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                          <p className="font-extrabold text-slate-900">⚔️ {q.title || q.name || "Activité sans titre"}</p>
                          <p className="text-slate-500 text-[10px] leading-relaxed">{q.description || q.desc || "Pas de description fournie."}</p>
                          {q.points && (
                            <span className="inline-block text-[9px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded mt-1">
                              💎 {q.points} XP
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
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

      {/* --- MODALE D'INITIALISATION --- */}
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
