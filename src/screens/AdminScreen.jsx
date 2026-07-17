// src/screens/AdminScreen.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function AdminScreen({ onImpersonate }) {
  const [profiles, setProfiles] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [treesList, setTreesList] = useState([]); // Stockage des arbres de la BDD
  const [currentUserId, setCurrentUserId] = useState(null);

  // États de recherche
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  
  // Filtres pour le tableau des sessions
  const [sessionSearchQuery, setSessionSearchQuery] = useState(''); // Filtre par nom de session
  const [managerSearchQuery, setManagerSearchQuery] = useState(''); // Filtre par email du manager

  const loadData = async () => {
    // 1. Utilisateur actuel
    const { data: { session } } = await supabase.auth.getSession();
    if (session) setCurrentUserId(session.user.id);

    // 2. Profils
    const { data: pData } = await supabase.from('profiles').select('*');
    if (pData) setProfiles(pData);

    // 3. Sessions
    const { data: sData } = await supabase.from('sessions').select('*');
    if (sData) setSessions(sData);

    // 4. Récupération des arbres directement depuis la base de données
    const { data: tData } = await supabase.from('trees').select('id, name');
    if (tData) setTreesList(tData);
  };

  useEffect(() => { loadData(); }, []);

  // Filtrage pour la recherche prédictive d'imposture
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredSuggestions([]);
    } else {
      const filtered = profiles.filter(p => 
        (p.email && p.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.full_name && p.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredSuggestions(filtered);
    }
  }, [searchQuery, profiles]);

  const changeRole = async (userId, newRole) => {
    if (userId === currentUserId) {
      alert("🛑 Sécurité : Vous ne pouvez pas modifier votre propre grade !");
      return;
    }
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (!error) {
      alert(`🎉 Rôle global mis à jour en : ${newRole}`);
      loadData();
    }
  };

  const handleDeleteSession = async (id) => {
    if (window.confirm("Supprimer cette session ? Les accès associés seront révoqués.")) {
      const { error } = await supabase.from('sessions').delete().eq('id', id);
      if (!error) loadData();
    }
  };

  // Retrouve le nom de l'arbre à l'aide de son ID UUID
  const findTreeName = (treeId) => {
    if (!treeId) return "Aucun arbre rattaché";
    const found = treesList.find(t => String(t.id) === String(treeId));
    return found ? found.name : `ID: ${treeId.substring(0, 8)}...`;
  };

  // Filtrage combiné local (Nom de session ET Email du superviseur)
  const filteredSessions = sessions.filter(s => {
    const matchesSession = s.session_code && s.session_code.toLowerCase().includes(sessionSearchQuery.toLowerCase());
    
    const manager = profiles.find(p => p.id === s.manager_id);
    const managerEmail = manager ? manager.email.toLowerCase() : '';
    const matchesManager = managerEmail.includes(managerSearchQuery.toLowerCase());

    return matchesSession && matchesManager;
  });

  return (
    <div className="max-w-6xl mx-auto px-8 py-8 space-y-8 text-slate-800 antialiased">
      
      {/* BANNIÈRE DE CONSOLE */}
      <div className="bg-red-950 text-red-100 p-5 rounded-2xl border border-red-900 shadow-sm">
        <h2 className="text-sm font-black uppercase tracking-wider">Console d'Administration Globale</h2>
        <p className="text-xs text-red-300 mt-1">Pilotez les rôles système et distribuez les clés d'accès/supervision des parcours.</p>
      </div>

      {/* MODULE D'INFILTRATION / USURPATION */}
      <div className="bg-white border border-red-100 rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-red-900">🎭 Infiltrer un compte collaborateur</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Recherchez n'importe quel profil pour prendre sa place. Les actions ou quêtes validées le seront réellement sur son compte.</p>
        </div>

        <div className="relative max-w-xl">
          <input
            type="text"
            placeholder="Saisissez un e-mail ou un nom à infiltrer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 border border-red-100 rounded-xl text-xs font-semibold focus:outline-none focus:border-red-500 bg-red-50/20 placeholder:text-red-300"
          />

          {/* Affichage des suggestions dynamiques d'infiltration */}
          {filteredSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 bg-white border border-red-100 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50 divide-y divide-red-50">
              {filteredSuggestions.map(profile => (
                <div key={profile.id} className="p-3 flex justify-between items-center hover:bg-red-50/40 transition-colors">
                  <div className="truncate pr-4">
                    <p className="text-xs font-bold text-slate-800 truncate">{profile.full_name || "Utilisateur sans nom"}</p>
                    <p className="text-[10px] font-mono text-slate-400 truncate">{profile.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      if (onImpersonate) {
                        onImpersonate(profile);
                        alert(`👤 Mode Imposture actif : Vous naviguez maintenant en tant que ${profile.email}`);
                      }
                      setSearchQuery('');
                    }}
                    className="bg-red-600 hover:bg-red-500 text-white text-[10px] font-black px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap"
                  >
                    Prendre sa place 👤
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {searchQuery && filteredSuggestions.length === 0 && (
            <div className="absolute left-0 right-0 mt-1 bg-white border border-dashed border-red-200 p-3 text-center text-xs text-red-400 italic rounded-xl z-50 shadow-lg">
              Aucun utilisateur trouvé pour cette recherche.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* ROLES GLOBAUX */}
        <div className="lg:col-span-1 bg-white border border-red-100 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-black text-red-900 uppercase tracking-widest">👑 Rôles Système</h3>
          <p className="text-[11px] text-slate-400">Définissez uniquement la structure technique globale des comptes.</p>
          
          <div className="divide-y divide-red-50 max-h-96 overflow-y-auto pr-1">
            {profiles.map(p => {
              const isMe = p.id === currentUserId;
              return (
                <div key={p.id} className={`py-3 flex flex-col gap-2 ${isMe ? 'bg-red-50/30 px-2 rounded-xl border border-dashed border-red-200' : ''}`}>
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-mono text-xs font-bold text-slate-800 truncate block max-w-[180px]">{p.email}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                      p.role === 'admin' ? 'bg-red-100 text-red-700' :
                      p.role === 'formateur' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                    }`}>{p.role}</span>
                  </div>
                  
                  <div className="flex gap-1 justify-end">
                    <button disabled={isMe} onClick={() => changeRole(p.id, 'user')} className={`text-[9px] px-2 py-1 rounded font-bold ${isMe ? 'text-slate-300 bg-slate-50' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>User</button>
                    <button disabled={isMe} onClick={() => changeRole(p.id, 'formateur')} className={`text-[9px] px-2 py-1 rounded font-bold ${isMe ? 'text-slate-300 bg-slate-50' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}>Formateur</button>
                    <button disabled={isMe} onClick={() => changeRole(p.id, 'admin')} className={`text-[9px] px-2 py-1 rounded font-bold ${isMe ? 'text-slate-300 bg-slate-50' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>Admin</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* LISTE DES SESSIONS ACTIVES (AVEC BARRES DE RECHERCHE PAR NOM ET EMAIL) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-red-100 rounded-2xl p-5 shadow-sm space-y-4">
            
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <h3 className="text-xs font-black text-red-900 uppercase tracking-widest">📋 Sessions Actives</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Visualisez et filtrez les accès aux sessions de formation.</p>
              </div>
              
              {/* Inputs de recherche côte à côte */}
              <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                <input
                  type="text"
                  placeholder="🔍 Filtrer par code (ex: INI PYTHON)..."
                  value={sessionSearchQuery}
                  onChange={(e) => setSessionSearchQuery(e.target.value)}
                  className="w-full sm:w-48 px-3 py-1.5 border border-red-100 rounded-lg text-xs font-semibold focus:outline-none focus:border-red-400 bg-red-50/10"
                />
                <input
                  type="text"
                  placeholder="✉️ Filtrer par e-mail superviseur..."
                  value={managerSearchQuery}
                  onChange={(e) => setManagerSearchQuery(e.target.value)}
                  className="w-full sm:w-48 px-3 py-1.5 border border-red-100 rounded-lg text-xs font-semibold focus:outline-none focus:border-red-400 bg-red-50/10"
                />
              </div>
            </div>

            {filteredSessions.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">Aucune session ne correspond à vos filtres.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 font-bold border-b border-red-50 pb-2 uppercase text-[10px]">
                      <th className="pb-2">Code d'accès</th>
                      <th className="pb-2 pl-4">Arbre rattaché</th>
                      <th className="pb-2">Superviseur assigné</th>
                      <th className="pb-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-50/50">
                    {filteredSessions.map(s => {
                      const manager = profiles.find(p => p.id === s.manager_id);
                      const treeName = findTreeName(s.tree_id);

                      return (
                        <tr key={s.id} className="hover:bg-red-50/20">
                          <td className="py-3 font-mono font-black text-red-800 bg-red-50/50 px-2.5 rounded-lg inline-block my-1">
                            {s.session_code}
                          </td>
                          <td className="py-3 text-slate-700 pl-4 font-semibold">
                            {treeName}
                          </td>
                          <td className="py-3 text-slate-500 truncate max-w-[200px]">
                            {manager ? manager.email : 'Compte introuvable'}
                          </td>
                          <td className="py-3 text-right">
                            <button 
                              onClick={() => handleDeleteSession(s.id)} 
                              className="text-red-500 hover:bg-red-50 px-2 py-1 rounded font-bold cursor-pointer"
                            >
                              Révoquer
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
