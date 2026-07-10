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
          v2.7 — Scope Objectives Integrated
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
        <div className="space-y-6 animate-fadeIn">
          {/* Bloc Objectif */}
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-xl">🎯</span>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800">Objectif de l'Espace Apprenant</h4>
              <p className="text-xs text-emerald-900/80 mt-0.5 leading-relaxed">
                Permettre à l'élève de s'engager de manière autonome dans son parcours gamifié. Cet espace centralise la complétion des quêtes, le déblocage dynamique des paliers par calcul d'XP, la soumission de justificatifs et le suivi collaboratif via le moteur de co-dépôt en temps réel.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
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
                    <span><strong>Architecture Tri-Blocs :</strong> Séparation étanche entre les quêtes <strong>Validées</strong> (Vert - octroi des XP), les quêtes <strong>En Attente</strong> (Ambre - bloquées par le Double Dépôt Réseau) et le <strong>Catalogue Restant</strong> (Ardoise).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">✔</span>
                    <span><strong>Filtre d'Affichage Dynamique :</strong> Menu déroulant permettant d'isoler instantanément un statut précis pour épurer l'interface.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">✔</span>
                    <span><strong>Gestion des Justificatifs :</strong> Injection et décodage d'un lien de téléchargement direct basé sur la chaîne de données Base64 / URL présente dans la table `productions`.</span>
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
                  Le suivi des paliers est entièrement **sanctuarisé en base de données** pour assurer une continuité inter-appareils.
                </p>
                <ul className="space-y-2 text-xs text-slate-600 pl-1">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">✔</span>
                    <span><strong>Rattachement Multi-Sessions :</strong> Formulaire d'entrée avec mise en majuscules automatique. L'association écrit dans la colonne `session_codes` (JSONB) de la table `profiles`.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">✔</span>
                    <span><strong>Colonne Native `unlocked_floors` :</strong> Stockage structuré de la progression sous forme d'objet clé-valeur associant l'ID de l'arbre à l'index maximum débloqué par l'élève.</span>
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
                    <span><strong>Moteur Double Dépôt Multi-Joueurs ($N$ Coéquipiers) :</strong> Si l'apprenant est le premier à déposer le fichier joint, la quête passe au statut `pending`. Au dépôt du $N$-ième partenaire, le moteur scanne la table `productions`, bascule automatiquement tous les anciens dépôts liés au même hash sur `validated` et débloque les XP en direct pour toute l'équipe.</span>
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
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENU : 2. FORMATEUR (STUDIO) */}
      {activeTab === 'formateur' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Bloc Objectif */}
          <div className="bg-purple-50 border border-purple-200 text-purple-950 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-xl">🎯</span>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-purple-800">Objectif de l'Espace Formateur (Studio)</h4>
              <p className="text-xs text-purple-900/80 mt-0.5 leading-relaxed">
                Fournir une boîte à outils de conception et d'ingénierie pédagogique. Cet écran permet aux formateurs d'éditer le catalogue d'exercices, d'agencer visuellement l'arbre des paliers, d'instancier des codes classes (sessions de cours) et de monitorer/valider manuellement les rendus d'élèves.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span className="text-base">🧠</span> 1. Gestion & Conception des Quêtes (Le Catalogue)
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Le Studio permet aux formateurs de manager l'intégralité du cycle de vie des briques de jeu : création des missions, barème d'XP et mode réseau.
                </p>
                <ul className="space-y-2 text-xs text-slate-600 pl-1">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 mt-0.5">✔</span>
                    <span><strong>Formulaire de Création :</strong> Saisie du nom, description, thématique (tag coloré) et difficulté (1★ à 3★) qui calibre automatiquement le barème d'XP (Difficulté × 300 XP).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 mt-0.5">✔</span>
                    <span><strong>Configuration Réseau Co-op :</strong> Activation du drapeau <code className="bg-slate-100 px-1 rounded text-pink-600 font-mono">is_collaborative</code> et définition du seuil de coéquipiers requis via <code className="bg-slate-100 px-1 rounded text-pink-600 font-mono">required_partners</code>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 mt-0.5">✔</span>
                    <span><strong>Visibilité Stricte :</strong> Attribution automatique du <code className="bg-slate-100 px-1 rounded text-slate-700 font-mono">owner_id</code> et gestion du statut de visibilité (<code className="text-slate-800 font-bold">private</code> ou <code className="text-emerald-600 font-bold">public</code>).</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span className="text-base">🌲</span> 2. Éditeur d'Arbre Augmenté & Paliers
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Interface visuelle d'ordonnancement pour structurer la progression pédagogique des parcours.
                </p>
                <ul className="space-y-2 text-xs text-slate-600 pl-1">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 mt-0.5">✔</span>
                    <span><strong>Création d'Étages :</strong> Ajout dynamique de paliers successifs numérotés pour segmenter l'apprentissage.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 mt-0.5">✔</span>
                    <span><strong>Assignation de Missions :</strong> Menu de sélection des quêtes disponibles et injection directe de leurs UUIDs au sein de la structure JSONB <code className="bg-slate-100 px-1 rounded text-amber-700 font-mono">floors</code> de la table <code className="text-purple-700 font-bold">trees</code>.</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span className="text-base">🏫</span> 3. Instances de Sessions & Monitoring Réseau
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Génération des environnements de cours et suivi de l'avancement des classes.
                </p>
                <ul className="space-y-2 text-xs text-slate-600 pl-1">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 mt-0.5">✔</span>
                    <span><strong>Codes Classes Uniques :</strong> Génération de clés d'accès textuelles (ex: <code className="bg-slate-800 text-slate-200 font-mono px-1 rounded">ORANGE-LILLE-26</code>) mappées sur la table <code className="font-bold">sessions</code>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 mt-0.5">✔</span>
                    <span><strong>Passerelle de Partage :</strong> Système d'invitation inter-formateurs écrivant dans <code className="font-bold">shared_permissions</code> pour déléguer les droits sur des arbres/quêtes privés.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 mt-0.5">✔</span>
                    <span><strong>Revue de Livrables :</strong> Monitoring des productions, lecture des zones de textes décodées et accès aux pièces jointes avec possibilité de forcer manuellement une validation.</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="font-black text-purple-400 uppercase text-[11px] tracking-wider">🗄️ Modèle de Données Studio</h4>
                <div className="space-y-2 text-[10px] font-mono">
                  <div className="p-2 bg-slate-950 rounded border border-slate-800">
                    <strong className="text-purple-400">table: quests</strong>
                    <p className="text-slate-400 mt-0.5">▪ is_collaborative (bool)</p>
                    <p className="text-slate-400">▪ required_partners (int)</p>
                  </div>
                  <div className="p-2 bg-slate-950 rounded border border-slate-800">
                    <strong className="text-amber-400">table: trees</strong>
                    <p className="text-amber-300 mt-0.5">▪ floors (jsonb array)</p>
                  </div>
                  <div className="p-2 bg-slate-950 rounded border border-slate-800">
                    <strong className="text-pink-400">table: shared_permissions</strong>
                    <p className="text-slate-400 mt-0.5">▪ entity_type, entity_id</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENU : 3. DRH / CLIENT */}
      {activeTab === 'drh' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Bloc Objectif */}
          <div className="bg-blue-50 border border-blue-200 text-blue-950 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-xl">🎯</span>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-blue-800">Objectif de l'Espace DRH / Client</h4>
              <p className="text-xs text-blue-900/80 mt-0.5 leading-relaxed">
                Fournir aux donneurs d'ordres, managers RSE et responsables de comptes une console analytique en lecture seule. Cet espace permet de mesurer le ROI de la formation en suivant les volumes d'XP générés, les taux de complétion par équipe et de consulter les livrables finaux sans aucun risque d'altération des données.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
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
        </div>
      )}

      {/* CONTENU : 4. SUPER ADMIN */}
      {activeTab === 'admin' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Bloc Objectif */}
          <div className="bg-red-50 border border-red-200 text-red-950 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-xl">🎯</span>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-red-800">Objectif de l'Espace Super Admin</h4>
              <p className="text-xs text-red-900/80 mt-0.5 leading-relaxed">
                Garantir la maintenance technique, le support de niveau 3 et le diagnostic en conditions réelles. L'outil d'impersonation permet d'infiltrer le compte d'un élève ou formateur pour debugger un blocage d'XP, nettoyer un historique défaillant ou ajuster manuellement les lignes de progression.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
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
                    <span><strong>Infiltration de Compte (Impersonation) :</strong> Permet de tester le rendu exact d'un élève ou formateur, d'ajuster son champ `unlocked_floors` en direct ou de nettoyer son portfolio.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📊 NOUVEL ONGLET : 5. ARCHITECTURE BASE DE DONNÉES */}
      {activeTab === 'bdd' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Bloc Objectif */}
          <div className="bg-amber-50 border border-amber-200 text-amber-950 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-xl">🎯</span>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-800">Objectif de la Cartographie Relationnelle BDD</h4>
              <p className="text-xs text-amber-900/80 mt-0.5 leading-relaxed">
                Fournir le dictionnaire de données et les spécifications techniques de l'infrastructure Supabase. Cet onglet détaille les types PostgreSQL natifs, les contraintes de clés (PK/FK/UK), les valeurs par défaut et la modélisation des objets complexes JSONB.
              </p>
            </div>
          </div>
          
          {/* Légende du code couleur */}
          <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center gap-4 text-xs font-mono">
            <span className="text-slate-700 font-bold font-sans">🎨 Code Couleur des Types :</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-purple-100 border border-purple-300 inline-block"></span><span className="text-purple-700 font-bold">uuid</span></span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-300 inline-block"></span><span className="text-blue-700 font-bold">text</span></span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 inline-block"></span><span className="text-amber-700 font-bold">jsonb</span></span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-pink-100 border border-pink-300 inline-block"></span><span className="text-pink-700 font-bold">boolean / integer / bigint</span></span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-200 border border-slate-400 inline-block"></span><span className="text-slate-700 font-bold">timestamp</span></span>
          </div>

          {/* DÉBUT DU TABLEAU COMPLET RE-STRUCTURÉ */}
          <div className="bg-white border border-slate-300 rounded-3xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-mono text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-200 text-[10px] uppercase tracking-wider">
                    <th className="p-3 pl-4 w-1/5">Table</th>
                    <th className="p-3 w-1/5">Colonne</th>
                    <th className="p-3 w-1/5">Type PostgreSQL</th>
                    <th className="p-3 text-center w-32">Null Accepté</th>
                    <th className="p-3 pr-4">Valeur par défaut / Contraintes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">

                  {/* SECTION : PRODUCTIONS */}
                  <tr className="bg-slate-900 text-white font-sans text-xs font-black">
                    <td colSpan="5" className="p-3 pl-4 tracking-wide bg-gradient-to-r from-slate-900 to-slate-800">
                      📂 TABLE : productions <span className="font-mono text-[10px] text-slate-400 font-normal ml-2">(Rendus de livrables et historiques d'exercices)</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 font-bold text-slate-400">productions</td><td className="p-3 text-slate-900 font-bold">id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-bold border border-purple-200">uuid</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-slate-500 font-sans">gen_random_uuid() <span className="text-[10px] font-mono bg-purple-50 text-purple-600 border border-purple-200 px-1 rounded font-bold">PRIMARY KEY</span></td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">productions</td><td className="p-3 text-slate-700">created_at</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200">timestamp with tz</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-slate-500 font-sans">now()</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">productions</td><td className="p-3 text-slate-700">student_id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100">uuid</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1 rounded">(Foreign Key ➔ profiles.id)</span></td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">productions</td><td className="p-3 text-slate-700">student_email</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">productions</td><td className="p-3 text-slate-700">quest_id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">productions</td><td className="p-3 text-slate-700">quest_name</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">productions</td><td className="p-3 text-amber-700 font-bold">content</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-amber-600 font-sans font-bold">null <span className="font-normal text-slate-500">(Contient le JSON stringifié crypté de la quête)</span></td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">productions</td><td className="p-3 text-slate-700">file_url</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">productions</td><td className="p-3 text-slate-700">file_hash</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">productions</td><td className="p-3 text-slate-700">session_code</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>

                  {/* SECTION : PROFILES */}
                  <tr className="bg-slate-900 text-white font-sans text-xs font-black">
                    <td colSpan="5" className="p-3 pl-4 tracking-wide bg-gradient-to-r from-slate-900 to-slate-800 border-t-4 border-slate-950">
                      👤 TABLE : profiles <span className="font-mono text-[10px] text-slate-400 font-normal ml-2">(Utilisateurs, permissions rôles et sauvegardes de paliers)</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 font-bold text-slate-400">profiles</td><td className="p-3 text-slate-900 font-bold">id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-bold border border-purple-200">uuid</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-slate-500 font-sans">gen_random_uuid() <span className="text-[10px] font-mono bg-purple-50 text-purple-600 border border-purple-200 px-1 rounded font-bold">PK / Link Auth.users</span></td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">profiles</td><td className="p-3 text-slate-700">email</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">profiles</td><td className="p-3 text-slate-700">role</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-indigo-600 font-bold">'user'::text</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">profiles</td><td className="p-3 text-amber-700 font-bold">session_codes</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200">jsonb</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-purple-600 font-bold">'[]'::jsonb</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">profiles</td><td className="p-3 text-emerald-600 font-bold">unlocked_floors</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200">jsonb</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-purple-600 font-bold">'{"{}"}'::jsonb</td></tr>

                  {/* SECTION : QUESTS */}
                  <tr className="bg-slate-900 text-white font-sans text-xs font-black">
                    <td colSpan="5" className="p-3 pl-4 tracking-wide bg-gradient-to-r from-slate-900 to-slate-800 border-t-4 border-slate-950">
                      ⚔️ TABLE : quests <span className="font-mono text-[10px] text-slate-400 font-normal ml-2">(Catalogue des missions de jeu configurables par le Studio)</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 font-bold text-slate-400">quests</td><td className="p-3 text-slate-900 font-bold">id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-bold border border-purple-200">uuid</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-slate-500 font-sans">gen_random_uuid() [PK]</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">quests</td><td className="p-3 text-slate-700">desc</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">quests</td><td className="p-3 text-slate-700">theme</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">quests</td><td className="p-3 text-slate-700">difficulty</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">quests</td><td className="p-3 text-slate-700">owner_id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100">uuid</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-500 font-sans">gen_random_uuid()</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">quests</td><td className="p-3 text-slate-700">visibility</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-500 font-sans">'private'::text</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">quests</td><td className="p-3 text-slate-700">name</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">quests</td><td className="p-3 text-indigo-600 font-bold">is_collaborative</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-pink-100 text-pink-700 font-bold border border-pink-200">boolean</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-indigo-600 font-sans font-bold">false</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">quests</td><td className="p-3 text-indigo-600 font-bold">required_partners</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-pink-100 text-pink-700 font-bold border border-pink-200">integer</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-indigo-600 font-sans font-bold">1</td></tr>

                  {/* SECTION : SESSIONS */}
                  <tr className="bg-slate-900 text-white font-sans text-xs font-black">
                    <td colSpan="5" className="p-3 pl-4 tracking-wide bg-gradient-to-r from-slate-900 to-slate-800 border-t-4 border-slate-950">
                      🏫 TABLE : sessions <span className="font-mono text-[10px] text-slate-400 font-normal ml-2">(Instances de cours reliant un groupe d'élèves à un arbre de paliers)</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 font-bold text-slate-400">sessions</td><td className="p-3 text-slate-900 font-bold">id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-pink-100 text-pink-700 font-bold border border-pink-200">bigint</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-slate-500 font-sans">Identity <span className="text-[10px] font-mono bg-purple-50 text-purple-600 border border-purple-200 px-1 rounded font-bold">PK</span></td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">sessions</td><td className="p-3 text-emerald-600 font-bold">session_code</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-slate-500 font-sans"><span className="text-[10px] font-mono bg-amber-50 text-amber-700 border border-amber-200 px-1 rounded font-bold">UNIQUE KEY</span></td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">sessions</td><td className="p-3 text-slate-700">tree_id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">sessions</td><td className="p-3 text-slate-700">manager_id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100">uuid</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-500 font-sans">gen_random_uuid()</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">sessions</td><td className="p-3 text-slate-700">created_by</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100">uuid</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-500 font-sans">gen_random_uuid()</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">sessions</td><td className="p-3 text-purple-600 font-bold">drh_ids</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200">jsonb</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-purple-600 font-bold">'[]'::jsonb</td></tr>

                  {/* SECTION : SHARED PERMISSIONS */}
                  <tr className="bg-slate-900 text-white font-sans text-xs font-black">
                    <td colSpan="5" className="p-3 pl-4 tracking-wide bg-gradient-to-r from-slate-900 to-slate-800 border-t-4 border-slate-950">
                      🔗 TABLE : shared_permissions <span className="font-mono text-[10px] text-slate-400 font-normal ml-2">(Passerelle de partage d'arbres ou de quêtes privées inter-formateurs)</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 font-bold text-slate-400">shared_permissions</td><td className="p-3 text-slate-900 font-bold">id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-pink-100 text-pink-700 font-bold border border-pink-200">bigint</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-slate-400 font-sans">null [PK]</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">shared_permissions</td><td className="p-3 text-slate-700">entity_type</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">shared_permissions</td><td className="p-3 text-slate-700">entity_id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100">uuid</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">shared_permissions</td><td className="p-3 text-slate-700">shared_with_id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100">uuid</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>

                  {/* SECTION : TREES */}
                  <tr className="bg-slate-900 text-white font-sans text-xs font-black">
                    <td colSpan="5" className="p-3 pl-4 tracking-wide bg-gradient-to-r from-slate-900 to-slate-800 border-t-4 border-slate-950">
                      🌲 TABLE : trees <span className="font-mono text-[10px] text-slate-400 font-normal ml-2">(Architecture structurelle des parcours ordonnés par étages)</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 font-bold text-slate-400">trees</td><td className="p-3 text-slate-900 font-bold">id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-bold border border-purple-200">uuid</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-slate-500 font-sans">gen_random_uuid() [PK]</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">trees</td><td className="p-3 text-slate-700">name</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-red-600 font-bold">NO</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">trees</td><td className="p-3 text-purple-600 font-bold">floors</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200">jsonb</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-400 font-sans">null</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">trees</td><td className="p-3 text-slate-700">owner_id</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100">uuid</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-500 font-sans">gen_random_uuid()</td></tr>
                  <tr className="hover:bg-slate-50/80"><td className="p-3 pl-4 text-slate-400">trees</td><td className="p-3 text-slate-700">visibility</td><td className="p-2"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">text</span></td><td className="p-3 text-center text-emerald-600 font-bold">YES</td><td className="p-3 text-slate-500 font-sans">'private'::text</td></tr>

                </tbody>
              </table>
            </div>
          </div>

          {/* Spécifications Schémas JSONB Spécifiques */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-800 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-emerald-400 font-bold">⚙️ profiles.unlocked_floors</span>
                <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">JSONB Object</span>
              </div>
              <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-pink-400 text-[11px] overflow-x-auto">
{`{
  "3b2d56a1-8761-410c...": 2,
  "a8f7612c-1102-991b...": 0
}`}
              </pre>
            </div>

            <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-800 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-purple-400 font-bold">🌲 trees.floors</span>
                <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">JSONB Array</span>
              </div>
              <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-indigo-300 text-[11px] overflow-x-auto">
{`[
  {
    "floorId": 1,
    "quests": ["8076be11-...", "129a00b4-..."]
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
