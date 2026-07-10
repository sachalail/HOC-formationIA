// src/screens/DocScreen.jsx
import React, { useState } from 'react';

export default function DocScreen() {
  const [activeTab, setActiveTab] = useState('user'); // 'user', 'formateur', 'drh', 'admin', 'bdd'

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6 pl-24">
      {/* En-tête principal */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-black uppercase tracking-wider flex items-center gap-2">
            📚 Centre de Documentation Technico-Fonctionnel
          </h2>
          <p className="text-[11px] text-indigo-200 font-medium">Cartographie des fonctionnalités et architecture de données</p>
        </div>
        <div className="bg-indigo-500/20 text-indigo-300 font-bold px-3 py-1.5 rounded-xl text-[10px] uppercase border border-indigo-500/30">
          v2.5 — Architecture Schema
        </div>
      </div>

      {/* Navigation principale de la documentation */}
      <div className="flex border-b border-slate-200 overflow-x-auto pb-px gap-2">
        <button 
          onClick={() => setActiveTab('user')} 
          className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 px-4 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'user' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          👤 Apprenant (User)
        </button>
        <button 
          onClick={() => setActiveTab('formateur')} 
          className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 px-4 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'formateur' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          🧠 Formateur (Studio)
        </button>
        <button 
          onClick={() => setActiveTab('drh')} 
          className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 px-4 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'drh' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          💼 Espace DRH / Client
        </button>
        <button 
          onClick={() => setActiveTab('admin')} 
          className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 px-4 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'admin' ? 'border-red-600 text-red-700' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          ⚡ Super Admin
        </button>
        <button 
          onClick={() => setActiveTab('bdd')} 
          className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 px-4 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'bdd' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          🗄️ Architecture BDD
        </button>
      </div>

      {/* CONTENU : 1. APPRENANT (USER) */}
      {activeTab === 'user' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-fadeIn">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span className="text-base">📂</span> 1. Système de Portfolio & Hub de Suivi Clean
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Le portfolio centralise l'intégralité de l'historique des productions de l'élève. Le contenu brut stocké en base de données au format JSON est décodé à la volée pour masquer les balises techniques et restituer le texte original soumis.
              </p>
              <ul className="space-y-2 text-xs text-slate-600 pl-1">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✔</span>
                  <span><strong>Architecture Tri-Blocs :</strong> Séparation étanche entre les quêtes <strong>Validées</strong> (Vert - octroi des XP), les quêtes <strong>En Attente</strong> (Ambre - bloquées par le Double Dépôt Réseau avec animation CSS pulse) et le <strong>Catalogue Restant</strong> (Ardoise - missions non initiées).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✔</span>
                  <span><strong>Filtre d'Affichage Dynamique :</strong> Menu déroulant permettant d'isoler instantanément un statut précis pour épurer l'interface.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✔</span>
                  <span><strong>Gestion des Justificatifs :</strong> Injection et décodage d'un lien de téléchargement direct (`📁 Ouvrir la pièce jointe`) basé sur la chaîne de données Base64 / URL présente dans la table `productions`.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5">🎯</span>
                  <span><strong>Navigation Inter-Onglets :</strong> Le bouton <em>« Voir dans le jeu ➔ »</em> scanne les sessions de l'apprenant, détecte l'arbre associé, calcule l'index exact du palier (`floorId`), rebascule l'élève sur l'onglet Parcours et pré-ouvre la quête cible.</span>
                </li>
              </ul>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span className="text-base">🌳</span> 2. Sessions & Progression Persistante Supabase
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Anciennement basé sur le localStorage volatile du navigateur, le suivi des paliers est désormais entièrement **sanctuarisé en base de données** pour assurer une continuité inter-appareils.
              </p>
              <ul className="space-y-2 text-xs text-slate-600 pl-1">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✔</span>
                  <span><strong>Rattachement Multi-Sessions :</strong> Formulaire d'entrée avec mise en majuscules automatique. L'association écrit dans la colonne `session_codes` (JSONB) de la table `profiles`.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✔</span>
                  <span><strong>Colonne Native `unlocked_floors` :</strong> Stockage structuré de la progression sous forme d'objet clé-valeur associant l'ID de l'arbre à l'index maximum débloqué par l'élève : <code className="bg-slate-100 text-pink-600 px-1 py-0.5 rounded font-mono text-[11px]">{"{ \"tree_uuid_1\": 2, \"tree_uuid_2\": 0 }"}</code>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✔</span>
                  <span><strong>Déblocage de Palier à Conditions :</strong> Calcul mathématique strict de la somme des points XP accumulés **uniquement via les quêtes validées**. Le bouton « Palier suivant ➔ » reste verrouillé tant que le score actuel est inférieur à la formule : <code className="bg-slate-100 font-mono text-slate-800 px-1 rounded text-[11px]">300 XP × IndexPalierSuivant</code>.</span>
                </li>
              </ul>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span className="text-base">🤝</span> 4. Validation Réseau Co-op & Import Historique
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Architecture de synchronisation en temps réel pour le travail collaboratif et l'évitement de double saisie.
              </p>
              <ul className="space-y-2 text-xs text-slate-600 pl-1">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5">🛡️</span>
                  <span><strong>Signature de Fichier Unique (Hash) :</strong> Combinaison de l'ID de la mission, du code de session et du nom épuré du fichier joint pour garantir l'unicité de l'équipe.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5">🛡️</span>
                  <span><strong>Moteur Double Dépôt Multi-Joueurs ($N$ Coéquipiers) :</strong> Si l'apprenant est le premier à déposer le fichier joint (obligatoire en coop), la quête passe au statut `pending` et bloque ses points. Au dépôt du $N$-ième partenaire (`required_partners`), le moteur scanne la table `productions`, bascule automatiquement tous les anciens dépôts liés au même hash sur `validated` et débloque les XP en direct pour toute l'équipe.</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">📊 Schéma BDD Mobilisé</h4>
              <div className="space-y-2 text-[11px] font-mono">
                <div className="p-2 bg-slate-950 rounded border border-slate-800">
                  <strong className="text-slate-300">table: profiles</strong>
                  <p className="text-slate-500 text-[10px] mt-0.5">▪ session_codes (jsonb)</p>
                  <p className="text-emerald-400 text-[10px]">▪ unlocked_floors (jsonb)</p>
                </div>
                <div className="p-2 bg-slate-950 rounded border border-slate-800">
                  <strong className="text-slate-300">table: productions</strong>
                  <p className="text-slate-500 text-[10px] mt-0.5">▪ student_id, quest_id, session_code</p>
                  <p className="text-amber-400 text-[10px]">▪ content (text formaté JSON)</p>
                  <p className="text-slate-500 text-[10px]">▪ file_url, file_hash</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENU : 2. FORMATEUR (STUDIO) */}
      {activeTab === 'formateur' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-fadeIn">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span className="text-base">🧠</span> Interface de Conception du Studio
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Le Studio permet aux formateurs de manager l'intégralité du cycle de vie des briques de jeu : création des missions, ordonnancement des paliers d'arbres et ouverture des instances de session.
              </p>
              <ul className="space-y-2 text-xs text-slate-600 pl-1">
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-0.5">✔</span>
                  <span><strong>Création Graphique de Missions :</strong> Formulaire complet avec thématique, niveau de difficulté (1★ à 3★) pour le barème XP, et l'activation coopérative avec configuration de `required_partners`.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-0.5">✔</span>
                  <span><strong>Éditeur d'Arbre Augmenté :</strong> Glisser-déposer et injection d'IDs de quêtes directement au sein de la structure JSONB `floors` de la table `trees` pour matérialiser les étages.</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <h4 className="font-black text-purple-400 uppercase text-[11px]">🌲 Configuration JSONB</h4>
              <p className="text-slate-400 font-mono text-[10px] leading-tight">
                La table <code className="text-purple-300">trees</code> porte le champ <code className="text-slate-300">floors</code> qui ordonne l'arborescence structurelle globale consommée par les apprenants.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CONTENU : 3. DRH / CLIENT */}
      {activeTab === 'drh' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-fadeIn">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span className="text-base">💼</span> Console Analytique d'Entreprise
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Destiné aux commanditaires des formations (DRH, Managers RSE), cet écran offre une vision macro et analytique de la progression des collaborateurs sans droit d'édition.
              </p>
              <ul className="space-y-2 text-xs text-slate-600 pl-1">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">✔</span>
                  <span><strong>Suivi Macro :</strong> Lecture analytique du taux de complétion, extraction des volumes d'XP générés par session et consultation des livrables sans droits de modification (sécurité d'écriture).</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <h4 className="font-black text-blue-400 uppercase text-[11px]">🔐 Restriction RLS & Rôles</h4>
              <p className="text-slate-400 font-mono text-[10px] leading-tight">
                Les profils possédant le rôle <code className="text-blue-300">"client"</code> sont rattachés aux sessions via le champ <code className="text-slate-300">drh_ids</code> (JSONB) de la table <code className="text-slate-300">sessions</code>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CONTENU : 4. SUPER ADMIN */}
      {activeTab === 'admin' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-fadeIn">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span className="text-base">⚡</span> Système d'Infiltration & Supervision Globale
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Le panneau d'administration suprême permet de piloter la plateforme de bout en bout et de diagnostiquer les incidents en situation réelle.
              </p>
              <ul className="space-y-2 text-xs text-slate-600 pl-1">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">✔</span>
                  <span><strong>Infiltration de Compte (Impersonation) :</strong> Permet de tester le rendu d'un élève ou formateur, d'ajuster son champ `unlocked_floors` en direct ou de nettoyer son portfolio.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 📊 NOUVEL ONGLET : 5. ARCHITECTURE BASE DE DONNÉES */}
      {activeTab === 'bdd' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Grille des Tables Natives */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span className="text-base">🗄️</span> Répertoire des Tables & Contraintes PostgreSql
              </h3>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-mono px-2 py-0.5 rounded font-bold">Relational Schema</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-mono text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-slate-200 text-[10px] uppercase tracking-wider">
                    <th className="p-2.5 rounded-l-lg">Table</th>
                    <th className="p-2.5">Colonne</th>
                    <th className="p-2.5">Type PostgreSQL</th>
                    <th className="p-2.5 text-center">Null Accepté</th>
                    <th className="p-2.5 rounded-r-lg">Valeur par défaut / Contrainte</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* PRODUCTIONS */}
                  <tr className="hover:bg-slate-50/80"><td className="p-2 font-bold text-slate-900">productions</td><td className="p-2 text-emerald-600 font-bold">id</td><td className="p-2">uuid</td><td className="p-2 text-center text-red-600 font-bold">NO</td><td className="p-2 text-slate-500">gen_random_uuid() [PK]</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-2 font-bold text-slate-900">productions</td><td className="p-2 text-slate-700">created_at</td><td className="p-2">timestamp with time zone</td><td className="p-2 text-center text-red-600 font-bold">NO</td><td className="p-2 text-slate-500">now()</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-2 font-bold text-slate-900">productions</td><td className="p-2 text-slate-700">student_id</td><td className="p-2">uuid</td><td className="p-2 text-center text-emerald-600">YES</td><td className="p-2 text-slate-400">null (FK profiles.id)</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-2 font-bold text-slate-900">productions</td><td className="p-2 text-slate-700">student_email</td><td className="p-2">text</td><td className="p-2 text-center text-emerald-600">YES</td><td className="p-2 text-slate-400">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-2 font-bold text-slate-900">productions</td><td className="p-2 text-slate-700">quest_id</td><td className="p-2">text</td><td className="p-2 text-center text-emerald-600">YES</td><td className="p-2 text-slate-400">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-2 font-bold text-slate-900">productions</td><td className="p-2 text-slate-700">quest_name</td><td className="p-2">text</td><td className="p-2 text-center text-emerald-600">YES</td><td className="p-2 text-slate-400">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-2 font-bold text-slate-900">productions</td><td className="p-2 text-amber-600 font-bold">content</td><td className="p-2">text</td><td className="p-2 text-center text-emerald-600">YES</td><td className="p-2 text-slate-400">null (Contient JSON encrypté)</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-2 font-bold text-slate-900">productions</td><td className="p-2 text-slate-700">file_url</td><td className="p-2">text</td><td className="p-2 text-center text-emerald-600">YES</td><td className="p-2 text-slate-400">null (Chaîne Base64 ou URL)</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-2 font-bold text-slate-900">productions</td><td className="p-2 text-slate-700">file_hash</td><td className="p-2">text</td><td className="p-2 text-center text-emerald-600">YES</td><td className="p-2 text-slate-400">null (Signature Unique Équipe)</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-2 font-bold text-slate-900">productions</td><td className="p-2 text-slate-700">session_code</td><td className="p-2">text</td><td className="p-2 text-center text-emerald-600">YES</td><td className="p-2 text-slate-400">null</td></tr>

                  {/* PROFILES */}
                  <tr className="bg-slate-50/40 hover:bg-slate-50"><td className="p-2 font-bold text-slate-900">profiles</td><td className="p-2 text-emerald-600 font-bold">id</td><td className="p-2">uuid</td><td className="p-2 text-center text-red-600 font-bold">NO</td><td className="p-2 text-slate-500">gen_random_uuid() [PK / Auth]</td></tr>
                  <tr className="bg-slate-50/40 hover:bg-slate-50"><td className="p-2 font-bold text-slate-900">profiles</td><td className="p-2 text-slate-700">email</td><td className="p-2">text</td><td className="p-2 text-center text-red-600 font-bold">NO</td><td className="p-2 text-slate-400">null</td></tr>
                  <tr className="bg-slate-50/40 hover:bg-slate-50"><td className="p-2 font-bold text-slate-900">profiles</td><td className="p-2 text-slate-700">role</td><td className="p-2">text</td><td className="p-2 text-center text-emerald-600">YES</td><td className="p-2 text-indigo-600">'user'::text</td></tr>
                  <tr className="bg-slate-50/40 hover:bg-slate-50"><td className="p-2 font-bold text-slate-900">profiles</td><td className="p-2 text-purple-600 font-bold">session_codes</td><td className="p-2">jsonb</td><td className="p-2 text-center text-emerald-600">YES</td><td className="p-2 text-purple-600">'[]'::jsonb</td></tr>
                  <tr className="bg-slate-50/40 hover:bg-slate-50"><td className="p-2 font-bold text-slate-900">profiles</td><td className="p-2 text-purple-600 font-bold">unlocked_floors</td><td className="p-2">jsonb</td><td className="p-2 text-center text-emerald-600">YES</td><td className="p-2 text-purple-600">'{"{}"}'::jsonb</td></tr>

                  {/* QUESTS */}
                  <tr className="hover:bg-slate-50"><td className="p-2 font-bold text-slate-900">quests</td><td className="p-2 text-emerald-600 font-bold">id</td><td className="p-2">uuid</td><td className="p-2 text-center text-red-600 font-bold">NO</td><td className="p-2 text-slate-500">gen_random_uuid() [PK]</td></tr>
                  <tr className="hover:bg-slate-50"><td className="p-2 font-bold text-slate-900">quests</td><td className="p-2 text-slate-700">desc</td><td className="p-2">text</td><td className="p-2 text-center text-red-600 font-bold">NO</td><td className="p-2 text-slate-400">null</td></tr>
                  <tr className="hover:bg-slate-50"><td className="p-2 font-bold text-slate-900">quests</td><td className="p-2 text-slate-700">theme</td><td className="p-2">text</td><td className="p-2 text-center text-emerald-600">YES</td><td className="p-2 text-slate-400">null (env / tech)</td></tr>
                  <tr className="hover:bg-slate-50"><td className="p-2 font-bold text-slate-900">quests</td><td className="p-2 text-slate-700">difficulty</td><td className="p-2">text</td><td className="p-2 text-center text-emerald-600">YES</td><td className="p-2 text-slate-400">null ('1', '2', '3')</td></tr>
                  <tr className="hover:bg-slate-50"><td className="p-2 font-bold text-slate-900">quests</td><td className="p-2 text-slate-700">owner_id</td><td className="p-2">uuid</td><td className="p-2 text-center text-emerald-600">YES</td><td className="p-2 text-slate-500">gen_random_uuid()</td></tr>
                  <tr className="hover:bg-slate-50"><td className="p-2 font-bold text-slate-900">quests</td><td className="p-2 text-slate-700">visibility</td><td className="p-2">text</td><td className="p-2 text-center text-emerald-600">YES</td><td className="p-2 text-slate-500">'private'::text</td></tr>
                  <tr className="hover:bg-slate-50"><td className="p-2 font-bold text-slate-900">quests</td><td className="p-2 text-slate-700">name</td><td className="p-2">text</td><td className="p-2 text-center text-emerald-600">YES</td><td className="p-2 text-slate-400">null</td></tr>
                  <tr className="hover:bg-slate-50"><td className="p-2 font-bold text-slate-900">quests</td><td className="p-2 text-indigo-600 font-bold">is_collaborative</td><td className="p-2">boolean</td><td className="p-2 text-center text-emerald-600">YES</td><td className="p-2 text-indigo-600">false</td></tr>
                  <tr className="hover:bg-slate-50"><td className="p-2 font-bold text-slate-900">quests</td><td className="p-2 text-indigo-600 font-bold">required_partners</td><td className="p-2">integer</td><td className="p-2 text-center text-emerald-600">YES</td><td className="p-2 text-indigo-600">1</td></tr>

                  {/* SESSIONS */}
                  <tr className="bg-slate-50/40 hover:bg-slate-50"><td className="p-2 font-bold text-slate-900">sessions</td><td className="p-2 text-emerald-600 font-bold">id</td><td className="p-2">bigint</td><td className="p-2 text-center text-red-600 font-bold">NO</td><td className="p-2 text-slate-500">[PK] Identity</td></tr>
                  <tr className="bg-slate-50/40 hover:bg-slate-50"><td className="p-2 font-bold text-slate-900">sessions</td><td className="p-2 text-emerald-600 font-bold">session_code</td><td className="p-2">text</td><td className="p-2 text-center text-red-600 font-bold">NO</td><td className="p-2 text-slate-500">[UK] Clé d'accès</td></tr>
                  <tr className="bg-slate-50/40 hover:bg-slate-50"><td className="p-2 font-bold text-slate-900">sessions</td><td className="p-2 text-slate-700">tree_id</td><td className="p-2">text</td><td className="p-2 text-center text-emerald-600">YES</td><td className="p-2 text-slate-400">null (ID de l'arbre associé)</td></tr>
                  <tr className="bg-slate-50/40 hover:bg-slate-50"><td className="p-2 font-bold text-slate-900">sessions</td><td className="p-2 text-slate-700">manager_id</td><td className="p-2">uuid</td><td className="p-2 text-center text-emerald-600">YES</td><td className="p-2 text-slate-500">gen_random_uuid()</td></tr>
                  <tr className="bg-slate-50/40 hover:bg-slate-50"><td className="p-2 font-bold text-slate-900">sessions</td><td className="p-2 text-slate-700">created_by</td><td className="p-2">uuid</td><td className="p-2 text-center text-emerald-600">YES</td><td className="p-2 text-slate-500">gen_random_uuid()</td></tr>
                  <tr className="bg-slate-50/40 hover:bg-slate-50"><td className="p-2 font-bold text-slate-900">sessions</td><td className="p-2 text-purple-600 font-bold">drh_ids</td><td className="p-2">jsonb</td><td className="p-2 text-center text-red-600 font-bold">NO</td><td className="p-2 text-purple-600">'[]'::jsonb (Accès Client)</td></tr>

                  {/* SHARED PERMISSIONS */}
                  <tr className="hover:bg-slate-50"><td className="p-2 font-bold text-slate-900">shared_permissions</td><td className="p-2 text-emerald-600 font-bold">id</td><td className="p-2">bigint</td><td className="p-2 text-center text-red-600 font-bold">NO</td><td className="p-2 text-slate-400">null [PK]</td></tr>
                  <tr className="hover:bg-slate-50"><td className="p-2 font-bold text-slate-900">shared_permissions</td><td className="p-2 text-slate-700">entity_type</td><td className="p-2">text</td><td className="p-2 text-center text-red-600 font-bold">NO</td><td className="p-2 text-slate-400">null ('tree' / 'quest')</td></tr>
                  <tr className="hover:bg-slate-50"><td className="p-2 font-bold text-slate-900">shared_permissions</td><td className="p-2 text-slate-700">entity_id</td><td className="p-2">uuid</td><td className="p-2 text-center text-emerald-600">YES</td><td className="p-2 text-slate-400">null</td></tr>
                  <tr className="hover:bg-slate-50"><td className="p-2 font-bold text-slate-900">shared_permissions</td><td className="p-2 text-slate-700">shared_with_id</td><td className="p-2">uuid</td><td className="p-2 text-center text-emerald-600">YES</td><td className="p-2 text-slate-400">null</td></tr>

                  {/* TREES */}
                  <tr className="bg-slate-50/40 hover:bg-slate-50"><td className="p-2 font-bold text-slate-900">trees</td><td className="p-2 text-emerald-600 font-bold">id</td><td className="p-2">uuid</td><td className="p-2 text-center text-red-600 font-bold">NO</td><td className="p-2 text-slate-500">gen_random_uuid() [PK]</td></tr>
                  <tr className="bg-slate-50/40 hover:bg-slate-50"><td className="p-2 font-bold text-slate-900">trees</td><td className="p-2 text-slate-700">name</td><td className="p-2">text</td><td className="p-2 text-center text-red-600 font-bold">NO</td><td className="p-2 text-slate-400">null</td></tr>
                  <tr className="bg-slate-50/40 hover:bg-slate-50"><td className="p-2 font-bold text-slate-900">trees</td><td className="p-2 text-purple-600 font-bold">floors</td><td className="p-2">jsonb</td><td className="p-2 text-center text-emerald-600">YES</td><td className="p-2 text-slate-400">null (Structure de l'arbre)</td></tr>
                  <tr className="bg-slate-50/40 hover:bg-slate-50"><td className="p-2 font-bold text-slate-900">trees</td><td className="p-2 text-slate-700">owner_id</td><td className="p-2">uuid</td><td className="p-2 text-center text-emerald-600">YES</td><td className="p-2 text-slate-500">gen_random_uuid()</td></tr>
                  <tr className="bg-slate-50/40 hover:bg-slate-50"><td className="p-2 font-bold text-slate-900">trees</td><td className="p-2 text-slate-700">visibility</td><td className="p-2">text</td><td className="p-2 text-center text-emerald-600">YES</td><td className="p-2 text-slate-500">'private'::text</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Spécifications Schémas JSONB Spécifiques */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* JSONB MAP DE PROGRESSION */}
            <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-800 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-emerald-400 font-bold">⚙️ profiles.unlocked_floors</span>
                <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">JSONB Object</span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans leading-tight">
                Structure de hachage associant l'UUID racine d'un arbre de jeu à l'index maximum (base 0) débloqué de manière persistante par l'élève.
              </p>
              <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-pink-400 text-[11px] overflow-x-auto">
{`{
  "3b2d56a1-8761-410c...": 2, // Palier 3 débloqué
  "a8f7612c-1102-991b...": 0  // Palier 1 (par défaut)
}`}
              </pre>
            </div>

            {/* JSONB MAP DES PALIERS DE L'ARBRE */}
            <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-800 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-purple-400 font-bold">🌲 trees.floors</span>
                <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">JSONB Array</span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans leading-tight">
                Tableau ordonné définissant l'architecture des niveaux d'un parcours, portant les listes ordonnées d'identifiants de quêtes.
              </p>
              <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-indigo-300 text-[11px] overflow-x-auto">
{`[
  {
    "floorId": 1,
    "quests": [
      "8076be11-...", 
      "129a00b4-..."
    ]
  },
  {
    "floorId": 2,
    "quests": ["f47ac10b-..."]
  }
]`}
              </pre>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
