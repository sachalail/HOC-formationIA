// src/screens/AdminScreen.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function AdminScreen({ onImpersonate }) {
  const [profiles, setProfiles] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  // 🟢 AJOUT : États pour la recherche prédictive d'utilisateurs (Infiltration)
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);

  // Formulaire de création de Session
  const [sessionCode, setSessionCode] = useState('');
  const [targetTreeId, setTargetTreeId] = useState('tree_debutant'); 
  const [selectedManagerId, setSelectedManagerId] = useState('');

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) setCurrentUserId(session.user.id);

    const { data: pData } = await supabase.from('profiles').select('*');
    if (pData) setProfiles(pData);

    const { data: sData } = await supabase.from('sessions').select('*');
    if (sData) setSessions(sData);
  };

  useEffect(() => { loadData(); }, []);

  // 🟢 AJOUT : Effet de filtrage pour les propositions de la barre de recherche
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

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!sessionCode.trim() || !targetTreeId.trim() || !selectedManagerId) {
      alert("⚠️ Veuillez remplir tous les champs pour créer la session.");
      return;
    }

    const cleanCode = sessionCode.trim().toUpperCase().replace(/\s+/g, '-');

    const { error } = await supabase.from('sessions').insert([
      { 
        session_code: cleanCode, 
        tree_id: targetTreeId.trim(), 
        manager_id: selectedManagerId 
      }
    ]);

    if (!error) {
      alert(`✨ Session "${cleanCode}" créée et affectée avec succès !`);
      setSessionCode('');
      loadData();
    } else {
      if (error.code === '23505') {
        alert("❌ Ce code de session est déjà utilisé. Choisissez un code unique.");
      } else {
        alert("❌ Erreur lors de la création.");
      }
    }
  };

  const handleDeleteSession = async (id) => {
    if (window.confirm("Supprimer cette session ? Les accès associés seront révoqués.")) {
      const { error } = await supabase.from('sessions').delete().eq('id', id);
      if (!error) loadData();
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-8 py-8 space-y-8">
      <div className="bg-red-950 text-red-100 p-5 rounded-2xl border border-red-900 shadow-sm">
        <h2 className="text-sm font-black uppercase tracking-wider">Console d'Administration Globale</h2>
        <p className="text-xs text-red-300 mt-1">Pilotez les rôles système et distribuez les clés d'accès/supervision des parcours.</p>
      </div>

      {/* 🟢 AJOUT : MODULE D'INFILTRATION / USURPATION PLACÉ EN TÊTE DE CONSOLE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">🎭 Infiltrer un compte collaborateur</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Recherchez n'importe quel profil pour prendre sa place. Les actions ou quêtes validées le seront réellement sur son compte.</p>
        </div>

        <div className="relative max-w-xl">
          <input
            type="text"
            placeholder="Saisissez un e-mail ou un nom à infiltrer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-purple-500 bg-slate-50"
          />

          {/* Affichage des suggestions dynamiques */}
          {filteredSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50 divide-y divide-slate-100">
              {filteredSuggestions.map(profile => (
                <div key={profile.id} className="p-3 flex justify-between items-center hover:bg-purple-50/40 transition-colors">
                  <div className="truncate pr-4">
                    <p className="text-xs font-bold text-slate-800 truncate">{profile.full_name || "Utilisateur sans nom"}</p>
                    <p className="text-[10px] font-mono text-slate-400 truncate">{profile.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      if (onImpersonate) onImpersonate(profile);
                      setSearchQuery('');
                    }}
                    className="bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap"
                  >
                    Prendre sa place 👤
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {searchQuery && filteredSuggestions.length === 0 && (
            <div className="absolute left-0 right-0 mt-1 bg-white border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400 italic rounded-xl z-50 shadow-lg">
              Aucun utilisateur trouvé pour cette recherche.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* ROLES GLOBAUX */}
        <div className="lg:col-span-1 bg-white border rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">👑 Rôles Système</h3>
          <p className="text-[11px] text-slate-400">Définissez uniquement la structure technique globale des comptes.</p>
          
          <div className="divide-y max-h-96 overflow-y-auto pr-1">
            {profiles.map(p => {
              const isMe = p.id === currentUserId;
              return (
                <div key={p.id} className={`py-3 flex flex-col gap-2 ${isMe ? 'bg-amber-50/20 px-2 rounded-xl border border-dashed border-amber-200' : ''}`}>
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-mono text-xs font-bold text-slate-800 truncate block max-w-[180px]">{p.email}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                      p.role === 'admin' ? 'bg-red-100 text-red-700' :
                      p.role === 'formateur' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
                    }`}>{p.role}</span>
                  </div>
                  
                  <div className="flex gap-1 justify-end">
                    <button disabled={isMe} onClick={() => changeRole(p.id, 'user')} className={`text-[9px] px-2 py-1 rounded font-bold ${isMe ? 'text-slate-300 bg-slate-50' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>User</button>
                    <button disabled={isMe} onClick={() => changeRole(p.id, 'formateur')} className={`text-[9px] px-2 py-1 rounded font-bold ${isMe ? 'text-slate-300 bg-slate-50' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'}`}>Formateur</button>
                    <button disabled={isMe} onClick={() => changeRole(p.id, 'admin')} className={`text-[9px] px-2 py-1 rounded font-bold ${isMe ? 'text-slate-300 bg-slate-50' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>Admin</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CREATION ET LISTE DES SESSIONS */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm space-y-4">
            <div>
              <h3 className="font-black text-xs uppercase tracking-wider text-emerald-400">🔑 Instancier une Session</h3>
              <p className="text-[11px] text-slate-400 mt-1">Créez un code unique. L'utilisateur désigné comme Superviseur obtiendra automatiquement l'accès au Tableau de bord DRH pour cette session.</p>
            </div>

            <form onSubmit={handleCreateSession} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-black">Code Unique</label>
                <input type="text" placeholder="Ex: ORANGE-LILLE-26" value={sessionCode} onChange={(e) => setSessionCode(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white uppercase font-bold focus:outline-none focus:border-emerald-500" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-black">Arbre Pédagogique</label>
                <select value={targetTreeId} onChange={(e) => setTargetTreeId(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500">
                  <option value="tree_debutant">Parcours Débutant (tree_debutant)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-black">Superviseur (DRH)</label>
                <select value={selectedManagerId} onChange={(e) => setSelectedManagerId(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500">
                  <option value="">-- Choisir un compte --</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.email} ({p.role})</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3 text-right">
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs px-6 py-2.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer">
                  Déployer la session
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">📋 Sessions Actives</h3>
            {sessions.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Aucune session active créée pour le moment.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 font-bold border-b pb-2 uppercase">
                      <th className="pb-2">Code d'accès</th>
                      <th className="pb-2">Arbre rattaché</th>
                      <th className="pb-2">Superviseur assigné</th>
                      <th className="pb-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sessions.map(s => {
                      const manager = profiles.find(p => p.id === s.manager_id);
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/50">
                          <td className="py-3 font-mono font-black text-emerald-700 bg-emerald-50/30 px-2 rounded-lg">{s.session_code}</td>
                          <td className="py-3 font-mono text-slate-600 pl-4">{s.tree_id}</td>
                          <td className="py-3 text-slate-500 truncate max-w-[200px]">{manager ? manager.email : 'Compte introuvable'}</td>
                          <td className="py-3 text-right">
                            <button onClick={() => handleDeleteSession(s.id)} className="text-red-500 hover:bg-red-50 px-2 py-1 rounded font-bold cursor-pointer">Révoquer</button>
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