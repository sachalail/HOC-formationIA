// src/screens/DocScreen.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function DocScreen() {
  const [activeTab, setActiveTab] = useState('report'); // 'report' ou 'morning'
  const [sessionInfo, setSessionInfo] = useState({ email: '', id: '' });

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setSessionInfo({
          email: session.user.email,
          id: session.user.id
        });
      }
    };
    getSession();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      
      {/* En-tête de l'écran */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-950 uppercase tracking-wider flex items-center gap-2">
            📄 Centre de Documentation & Relance
          </h2>
          <p className="text-[11px] text-slate-400 font-bold">Suivi technique et aide au démarrage de session</p>
        </div>
        
        {/* Sélecteur d'onglets */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-black">
          <button 
            onClick={() => setActiveTab('report')} 
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${activeTab === 'report' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600'}`}
          >
            📋 Rapport du Jour
          </button>
          <button 
            onClick={() => setActiveTab('morning')} 
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${activeTab === 'morning' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600'}`}
          >
            ☕ Good Morning
          </button>
        </div>
      </div>

      {/* CONTENU : Onglet Rapport du Jour */}
      {activeTab === 'report' && (
        <div className="space-y-4 animate-fade-in text-xs text-slate-700">
          <div className="bg-purple-50 p-4 border border-purple-100 rounded-2xl">
            <h4 className="font-black text-purple-950 text-sm mb-1">⚡ 1. Nettoyage et Connexion Réelle (Supabase)</h4>
            <p className="leading-relaxed">Élimination complète des variables et objets statiques de simulation (`initialTrees` et `initialQuests`) dans le fichier d'entrée. L'application est dorénavant connectée à 100% aux tables Postgres natives via l'API Supabase Client.</p>
          </div>

          <div className="bg-amber-50 p-4 border border-amber-100 rounded-2xl">
            <h4 className="font-black text-amber-950 text-sm mb-1">🔐 2. Résolution du Conflit d'Identifiants (UUID)</h4>
            <p className="leading-relaxed">PostgreSQL imposait un format de clé primaire de type `UUID` strict. L'application plantait en envoyant des chaînes manuelles générées côté client (`"tree_1783..."`). **Solution :** Retrait complet du champ `id` lors des requêtes d'insertion `.insert()`. L'ID est maintenant généré de manière transparente par la BDD via `gen_random_uuid()` puis réinjecté localement.</p>
          </div>

          <div className="bg-emerald-50 p-4 border border-emerald-100 rounded-2xl">
            <h4 className="font-black text-emerald-950 text-sm mb-1">🎯 3. Réalignement des Filtres d'Affichage</h4>
            <p className="leading-relaxed">Correction des filtres `.filter()`. Les quêtes et arbres créés par ton compte n'apparaissaient pas car le Studio filtrait sur un identifiant formateur simulé en dur. L'application écoute désormais directement le `currentUserId` de la session d'authentification active pour valider la propriété des lignes.</p>
          </div>
        </div>
      )}

      {/* CONTENU : Onglet Good Morning */}
      {activeTab === 'morning' && (
        <div className="bg-slate-900 text-slate-100 p-6 rounded-2xl shadow-xl space-y-6 font-sans border border-slate-800">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-md font-black text-white uppercase tracking-wide">☕ Prêt pour ton dev de demain ?</h3>
            <p className="text-[10px] text-slate-400 mt-1">Voici tes informations de connexion réelles extraites de Supabase :</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-[11px]">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-purple-400 font-bold block mb-1">📧 E-mail Session :</span>
              <span className="text-slate-200 select-all">{sessionInfo.email || "Non connecté"}</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-purple-400 font-bold block mb-1">🔑 Ton UUID Unique :</span>
              <span className="text-slate-200 select-all">{sessionInfo.id || "Non chargé"}</span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">🚀 Les 3 actions prioritaires pour demain :</h4>
            <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside bg-slate-950 p-4 rounded-xl border border-slate-800">
              <li><strong className="text-white">Relier "Créer un palier" à Supabase :</strong> Actuellement, ajouter un palier modifie l'état local mais n'effectue pas de mise à jour en base de données.</li>
              <li><strong className="text-white">Créer le déclencheur d'update :</strong> Lier la liste des paliers au bouton vert de sauvegarde 💾 ou ajouter un `.update()` automatique sur la table `trees` au format JSONB.</li>
              <li><strong className="text-white">Tester l'affichage Apprenant :</strong> Vérifier que ton tableau de bord apprenant charge bien le nouvel arbre via son UUID.</li>
            </ul>
          </div>
        </div>
      )}

    </div>
  );
}