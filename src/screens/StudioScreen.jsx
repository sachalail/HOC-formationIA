// src/screens/StudioScreen.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// Fonction pour calculer l'heure de fin automatique selon la somme des durées des blocs du planning
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
  
  // États de sélection
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [activeModal, setActiveModal] = useState(null); 

  // États des formulaires
  const [newSessionCode, setNewSessionCode] = useState('');
  const [newSessionDate, setNewSessionDate] = useState(new Date().toISOString().split('T')[0]);

  // Recherche RH & Cache de correspondance ID -> Email
  const [drhSearchQuery, setDrhSearchQuery] = useState('');
  const [drhSuggestions, setDrhSuggestions] = useState([]);

  // --- CONFIGURATION DU PLANNING DE SESSION ---
  const [customBlockConfig, setCustomBlockConfig] = useState({
    name: 'Pause Café / Réflexion',
    desc: 'Un moment de débrief libre ou de pause active',
    color: '#3b82f6', // Bleu par défaut
    duration: 15
  });

  const [draggedPlanningItem, setDraggedPlanningItem] = useState(null);
  const [activeDropIndex, setActiveDropIndex] = useState(null);

  // 1. CHARGEMENT INITIAL
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
      // Tri par date de formation (les plus récentes en premier)
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
    }
  };

  const currentSession = sessions.find(s => String(s.id) === String(activeSessionId));

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

  // Sauvegarde globale de la session
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
      else alert(`🎉 Session et planning enregistrés avec succès !`);
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

  // --- LOGIQUE DRAG & DROP SESSIONS ---
  const checkPlacementValidity = (floorId, targetIndex, timeline) => {
    if (!floorId) return true;
    let prevMaxFloor = -1;
    for (let i = 0; i < targetIndex; i++) {
      if (timeline[i]?.type === 'palier') {
        prevMaxFloor = Math.max(prevMaxFloor, timeline[i].floorId);
      }
    }
    let nextMinFloor = 999;
    for (let i = targetIndex; i < timeline.length; i++) {
      if (timeline[i]?.type === 'palier') {
        nextMinFloor = Math.min(nextMinFloor, timeline[i].floorId);
      }
    }
    return floorId > prevMaxFloor && floorId < nextMinFloor;
  };

  const handleTimelineDrop = (targetIndex) => {
    if (!currentSession || !draggedPlanningItem) return;
    const timeline = currentSession.planning ? [...currentSession.planning] : [];

    if (draggedPlanningItem.source === 'palette-palier') {
      const floor = draggedPlanningItem.data;
      if (!checkPlacementValidity(floor.floorId, targetIndex, timeline)) {
        alert(`🚫 Ordre incorrect : Le Palier ${floor.floorId} ne respecte pas la chronologie d'exécution.`);
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
      
      {/* EN-TÊTE PRINCIPAL */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">💼 Espace Formateur</h1>
          <p className="text-xs text-slate-500 font-bold">Planifiez vos sessions de formation et gérez vos agendas de journée.</p>
        </div>
        <button 
          onClick={() => setActiveModal('session')} 
          className="bg-blue-700 hover:bg-blue-800 text-white font-black text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition-all shadow-sm flex items-center gap-2"
        >
          ➕ Créer une session de formation
        </button>
      </div>

      {/* DISPOSITION EN DEUX COLONNES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLONNE GAUCHE (1/3) : TOUTES LES SESSIONS (Triage Chronologique & Calendrier) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">📅 Calendrier des formations</h3>
            
            <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
              {sessions.map(s => {
                const isSelected = String(s.id) === String(activeSessionId);
                const linkedTree = trees[s.tree_id];
                const formattedDate = s.formation_date 
                  ? new Date(s.formation_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                  : "Pas de date";

                return (
                  <div 
                    key={s.id}
                    onClick={() => setActiveSessionId(String(s.id))}
                    className={`p-4 rounded-xl border transition-all cursor-pointer text-xs space-y-3 ${
                      isSelected 
                        ? 'bg-blue-50 border-blue-500 shadow-sm ring-1 ring-blue-400' 
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
                      <p>🌲 Arbre : <span className="font-extrabold text-slate-800">{linkedTree ? linkedTree.name : 'Non associé'}</span></p>
                      <p>⏰ Agenda : <span className="font-extrabold text-slate-800 font-mono">{(s.start_time || '09:00')} - {(s.end_time || 'Calculé')}</span></p>
                      <p>🔗 Étapes : <span className="font-extrabold text-blue-700">{s.planning?.length || 0} blocs</span></p>
                    </div>
                  </div>
                );
              })}

              {sessions.length === 0 && (
                <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-8 text-center space-y-3">
                  <span className="text-2xl block">📅</span>
                  <p className="text-xs font-bold text-slate-500">Aucune session n'est encore configurée.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLONNE DROITE (2/3) : PRÉVISUALISATION & CONFIGURATION DE LA SESSION SÉLECTIONNÉE */}
        <div className="lg:col-span-2">
          {currentSession ? (
            <div className="space-y-6">
              
              {/* EN-TÊTE DE LA PRÉVISUALISATION */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 border border-blue-200 px-2 py-1 rounded-md">Session sélectionnée</span>
                  <h2 className="text-lg font-black text-slate-900 mt-2">Détails de {currentSession.session_code}</h2>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleSaveChanges}
                    className="bg-slate-950 hover:bg-slate-800 text-white font-extrabold py-2.5 px-5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-sm"
                  >
                    💾 Sauvegarder les modifications
                  </button>
                </div>
              </div>

              {/* CONFIGURATION TEMPORELLE & DATE */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  ⏰ Horaires & Date de Formation
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Date de formation */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Date de formation</label>
                    <input 
                      type="date" 
                      value={currentSession.formation_date || ''} 
                      onChange={(e) => updateCurrentSessionInState({ formation_date: e.target.value })}
                      className="w-full border rounded-lg p-2 bg-white font-bold text-xs"
                    />
                  </div>

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

              {/* LIAISON ARBRE & DRH */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs bg-slate-50 p-5 rounded-xl border border-slate-200">
                <div className="space-y-2">
                  <label className="block font-black text-slate-900 uppercase tracking-wider text-[10px]">🌲 Arbre de compétences associé :</label>
                  <select 
                    value={currentSession.tree_id || ''}
                    onChange={(e) => updateCurrentSessionInState({ tree_id: e.target.value || null })}
                    className="w-full border rounded-lg p-2.5 bg-white font-bold"
                  >
                    <option value="">-- Aucun arbre lié --</option>
                    {Object.values(trees || {}).map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3 border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-6">
                  <label className="block font-black text-slate-900 uppercase tracking-wider text-[10px]">Observateurs DRH rattachés :</label>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Inviter un e-mail..."
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

                  <div className="flex flex-wrap gap-1.5">
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
                  </div>
                </div>
              </div>

              {/* GESTION DRAG & DROP DES BLOCS DU PLANNING (VISIBLE UNIQUEMENT SI SESSION ACTIVE) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* AGENDA DE LA SESSION (2/3) */}
                <div className="md:col-span-2 space-y-3">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Agenda interactif de la journée</h4>
                  
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
                        Glissez et déposez des blocs ici pour structurer la journée
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

                {/* PALETTE DE BLOCS DISPONIBLES (1/3) */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">🛠️ Palette de construction</h4>
                  
                  {/* Blocs Arbres */}
                  {currentSession.tree_id && trees[currentSession.tree_id] ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                      <span className="block text-[10px] font-black uppercase text-purple-700">Paliers de l'arbre</span>
                      {(trees[currentSession.tree_id].floors || []).map(floor => (
                        <div
                          key={floor.floorId}
                          draggable
                          onDragStart={() => setDraggedPlanningItem({ source: 'palette-palier', data: floor })}
                          className="bg-purple-50 border border-purple-200 hover:bg-purple-100 p-2.5 rounded-lg cursor-grab active:cursor-grabbing flex justify-between items-center transition-all"
                        >
                          <span className="font-extrabold text-xs text-purple-900">🎯 Palier {floor.floorId}</span>
                          <span className="text-[10px] bg-purple-700 text-white font-extrabold px-2 py-0.5 rounded-md">45m</span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {/* Blocs sur-mesure */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                    <span className="block text-[10px] font-black uppercase text-blue-700">Blocs personnalisés</span>
                    <div className="space-y-2 text-xs bg-slate-50 p-3 rounded-lg border">
                      <input 
                        type="text"
                        placeholder="Nom de l'activité"
                        value={customBlockConfig.name}
                        onChange={(e) => setCustomBlockConfig({ ...customBlockConfig, name: e.target.value })}
                        className="w-full border rounded p-1 bg-white font-extrabold text-xs"
                      />
                      <div className="flex items-center justify-between gap-1">
                        <input 
                          type="number"
                          value={customBlockConfig.duration}
                          onChange={(e) => setCustomBlockConfig({ ...customBlockConfig, duration: Math.max(1, parseInt(e.target.value, 10) || 15) })}
                          className="w-14 border rounded p-1 bg-white font-black"
                        />
                        <span className="text-[10px] font-bold text-slate-500">mins</span>
                        <input 
                          type="color"
                          value={customBlockConfig.color}
                          onChange={(e) => setCustomBlockConfig({ ...customBlockConfig, color: e.target.value })}
                          className="w-6 h-6 rounded cursor-pointer border-0"
                        />
                      </div>
                    </div>

                    <div 
                      draggable
                      onDragStart={() => setDraggedPlanningItem({ source: 'palette-custom' })}
                      className="bg-white hover:bg-slate-50 p-2.5 rounded-lg border border-dashed border-slate-300 cursor-grab active:cursor-grabbing flex justify-between items-center transition-all"
                      style={{ borderLeftWidth: '5px', borderLeftColor: customBlockConfig.color }}
                    >
                      <span className="font-extrabold text-xs text-slate-800 truncate">{customBlockConfig.name || 'Glissez-moi'}</span>
                      <span className="text-[10px] bg-slate-100 font-extrabold px-1.5 py-0.5 rounded">{customBlockConfig.duration}m</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-4">
              <span className="text-4xl block">👈</span>
              <h3 className="text-sm font-black text-slate-800 uppercase">Aucune session sélectionnée</h3>
              <p className="text-xs text-slate-400 font-bold max-w-md mx-auto">Choisissez une session de formation dans le panneau de gauche pour configurer son agenda, sa date, ses horaires et associer son parcours.</p>
            </div>
          )}
        </div>

      </div>

      {/* --- MODALE D'INITIALISATION --- */}
      {activeModal === 'session' && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border">
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-extrabold text-lg">×</button>
            
            <h3 className="text-md font-black text-slate-950 uppercase tracking-wide">💡 Initialiser une Session</h3>
            <form onSubmit={handleCreateSession} className="space-y-4 text-xs mt-4">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Code d'accès (ex: AIRBUS-26) :</label>
                <input type="text" required placeholder="AIRBUS-LILLE-26" value={newSessionCode} onChange={(e) => setNewSessionCode(e.target.value)} className="w-full border rounded-lg p-2.5 bg-slate-50 font-mono font-bold uppercase tracking-wider text-center text-sm" />
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
