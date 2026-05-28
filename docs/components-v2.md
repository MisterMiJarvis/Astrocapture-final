# AstroCapture V2 - Liste des Composants & Fonctionnalités

## 📋 Vue d'ensemble

AstroCapture V2 est organisé en **4 catégories principales** :
1. **Core** - Fonctionnalités de base du site
2. **Astro Suite (APLS)** - 6 modules d'astrophotographie avancés
3. **Nova DSO Tracker** - Outils de suivi et planification
4. **Admin** - Gestion du contenu

---

## 1. CORE - Fonctionnalités de Base

### Navigation & Layout
| Composant | Fichier | Fonctionnalité |
|-----------|---------|----------------|
| **App** | `App.tsx` | Routeur principal, gestion d'état global (view, auth, posts) |
| **NavButton** | `App.tsx` | Bouton de navigation desktop avec état actif |
| **MobileNavButton** | `App.tsx` | Bouton de navigation mobile |
| **Footer** | `components/Footer.tsx` | Pied de page avec liens (License, About, Admin) |
| **ScrollToTopButton** | `App.tsx` | Bouton retour en haut de page |
| **CookieBanner** | `App.tsx` | Bannière de consentement cookies RGPD |

### Page d'Accueil (Gallery)
| Composant | Fichier | Fonctionnalité |
|-----------|---------|----------------|
| **GalleryView** | `components/GalleryView.tsx` | Page d'accueil avec hero slider, grille d'articles |
| **HeroSlider** | `components/GalleryView.tsx` | Carrousel d'images en vedette avec titres/liens |
| **PostCard** | `components/GalleryView.tsx` | Carte d'article avec image, titre, tags, date |
| **GlobalSearch** | `components/GlobalSearch.tsx` | Barre de recherche globale (posts, processing, targets) |

### Articles & Blog
| Composant | Fichier | Fonctionnalité |
|-----------|---------|----------------|
| **PostDetailView** | `components/PostDetailView.tsx` | Vue détaillée d'un article avec contenu riche |
| **ProcessingView** | `components/ProcessingView.tsx` | Liste des articles de traitement d'image |
| **ProcessingPostDetailView** | `components/ProcessingPostDetailView.tsx` | Vue détaillée d'un article de traitement |
| **SocialShare** | `components/Shared.tsx` | Partage social (Facebook, Twitter, etc.) |
| **Lightbox** | `components/Shared.tsx` | Visionneuse d'images plein écran |

### Utilitaires
| Composant | Fichier | Fonctionnalité |
|-----------|---------|----------------|
| **LoginView** | `components/LoginView.tsx` | Authentification admin (email/password) |
| **ImageOfTheDayView** | `components/ImageOfTheDayView.tsx` | Image astronomique du jour (APOD NASA) |
| **ImageWallView** | `components/ImageWallView.tsx` | Mur d'images (toutes les photos) |
| **AboutView** | `components/AboutView.tsx` | Page À propos configurable |
| **LicenseView** | `components/LicenseView.tsx` | Page de licence (CC, etc.) |
| **LegalNoticeView** | `components/LegalNoticeView.tsx` | Mentions légales |

---

## 2. ASTRO SUITE (APLS) - Modules Avancés

### 🏠 AstroSuiteView (Conteneur)
| Composant | Fichier | Fonctionnalité |
|-----------|---------|----------------|
| **AstroSuiteView** | `components/AstroSuiteView.tsx` | Page conteneur avec 6 onglets de navigation |
| **TabNavigation** | `components/AstroSuiteView.tsx` | Barre d'onglets (desktop + mobile select) |

### 📊 Module 1 - Dashboard KPIs
| Composant | Fichier | Fonctionnalité |
|-----------|---------|----------------|
| **DashboardKPIs** | `src/components/Module1/DashboardKPIs.tsx` | Tableau de bord avec indicateurs clés |
| **AplsModule1View** | `components/AplsModule1View.tsx` | Wrapper avec mock data pour le dashboard |
| **Features** | | • KPIs météo (seeing, température, vent) |
| | | • Indicateurs de qualité de ciel (Bortle, SQM) |
| | | • Prochaines fenêtres d'observation |
| | | • Alertes et notifications |

### 🔭 Module 2 - Equipment (Placeholder)
| Composant | Fichier | Fonctionnalité |
|-----------|---------|----------------|
| **AplsModule2View** | `components/AplsModule2View.tsx` | Placeholder pour futur module équipement |

### 🎯 Module 3 - Framing (Aladin)
| Composant | Fichier | Fonctionnalité |
|-----------|---------|----------------|
| **AladinFramer** | `src/components/Module3/AladinFramer.tsx` | Visualisateur Aladin Lite pour le cadrage |
| **AplsModule3View** | `components/AplsModule3View.tsx` | Wrapper avec mock data (target, FOV) |
| **Features** | | • Carte du ciel interactive (Aladin Lite) |
| | | • Cadrage du champ de vision (FOV) |
| | | • Recherche d'objets par nom/catalogue |
| | | • Visualisation du catalogName |

### 📅 Module 4 - Planner (Multi-Night)
| Composant | Fichier | Fonctionnalité |
|-----------|---------|----------------|
| **MultiNightPlanner** | `src/components/Module4/MultiNightPlanner.tsx` | Planificateur sur plusieurs nuits |
| **AplsModule4View** | `components/AplsModule4View.tsx` | Wrapper avec mock data |
| **Features** | | • Planning multi-nuits |
| | | • Calcul de visibilité par nuit |
| | | • Suggestions de cibles |
| | | • Export du plan d'observation |

### ⚡ Module 5 - Exposure (SQM + Calculator)
| Composant | Fichier | Fonctionnalité |
|-----------|---------|----------------|
| **SQMDisplay** | `src/components/Module5/index.tsx` | Affichage du Sky Quality Meter |
| **ExposureCalculator** | `src/components/Module5/index.tsx` | Calculateur de temps de pose |
| **ReducerImpactChart** | `src/components/Module5/index.tsx` | Graphique d'impact du réducteur |
| **SNRSimulator** | `src/components/Module5/index.tsx` | Simulateur de rapport signal/bruit |
| **AplsModule5View** | `components/AplsModule5View.tsx` | Wrapper avec mock data |
| **Features** | | • Mesure SQM (qualité du ciel) |
| | | • Calcul temps de pose par filtre |
| | | • Simulation SNR |
| | | • Impact du réducteur de focale |

### 📈 Module 6 - Analysis (Project Detail)
| Composant | Fichier | Fonctionnalité |
|-----------|---------|----------------|
| **ProjectDetailView** | `src/components/Module6/ProjectDetailView.tsx` | Vue détaillée de projet d'observation |
| **AplsModule6View** | `components/AplsModule6View.tsx` | Wrapper avec mock data |
| **Features** | | • Suivi de projet d'observation |
| | | • Historique des sessions |
| | | • Statistiques de réussite |
| | | • Notes et commentaires |

---

## 3. NOVA DSO TRACKER - Outils de Suivi

| Composant | Fichier | Fonctionnalité |
|-----------|---------|----------------|
| **BestTargetsView** | `components/BestTargetsView.tsx` | Liste des meilleures cibles pour ce soir |
| **TargetScoreCard** | `components/TargetScoreCard.tsx` | Carte de score d'une cible (altitude, phase lune, etc.) |
| **WeatherDisplayView** | `components/WeatherDisplayView.tsx` | Météo détaillée avec prévisions astronomiques |
| **NightlyForecastView** | `components/NightlyForecastView.tsx` | Prévisions sur 14 nuits |
| **ObservationPlannerView** | `components/ObservationPlannerView.tsx` | Planificateur d'observation simple |
| **SessionPlannerView** | `components/SessionPlannerView.tsx` | Planificateur de session détaillé |
| **JournalView** | `components/JournalView.tsx` | Journal d'observation (notes, photos, conditions) |
| **AskHalView** | `components/AskHalView.tsx` | Interface de chat avec Hal (IA) |

### Nova - Outils Spécialisés
| Composant | Fichier | Fonctionnalité |
|-----------|---------|----------------|
| **NovaMosaicView** | `components/NovaMosaicView.tsx` | Planificateur de mosaïque d'images |
| **NovaLogAnalyzerView** | `components/NovaLogAnalyzerView.tsx` | Analyseur de logs d'acquisition |
| **NovaYearlyHeatmapView** | `components/NovaYearlyHeatmapView.tsx` | Carte de chaleur annuelle des observations |
| **NovaEquipmentCalcView** | `components/NovaEquipmentCalcView.tsx` | Calculateur de paramètres d'équipement |
| **TelescopiusTestView** | `components/TelescopiusTestView.tsx` | Tests API Telescopius |

---

## 4. EQUIPMENT - Gestion du Matériel

| Composant | Fichier | Fonctionnalité |
|-----------|---------|----------------|
| **GearReviewsView** | `components/GearReviewsView.tsx` | Liste des revues d'équipement |
| **GearSettingsForm** | `components/GearSettingsForm.tsx` | Formulaire de configuration équipement |
| **EquipmentTrackerForm** | `components/EquipmentTrackerForm.tsx` | Suivi d'équipement (prix, date achat, etc.) |
| **EquipmentView** | `components/EquipmentView.tsx` | Vue équipement (ancienne V1) |
| **EquipmentV2View** | `components/EquipmentV2View.tsx` | Vue équipement V2 |

---

## 5. ADMIN - Gestion du Site

| Composant | Fichier | Fonctionnalité |
|-----------|---------|----------------|
| **AdminDashboard** | `components/AdminDashboard.tsx` | Tableau de bord admin complet |
| **LoginView** | `components/LoginView.tsx` | Connexion sécurisée |
| **ImageUploader** | `components/AdminDashboard.tsx` | Upload d'images avec preview |
| **PostEditor** | `components/AdminDashboard.tsx` | Éditeur d'articles (CRUD) |
| **SettingsManager** | `components/AdminDashboard.tsx` | Gestion des paramètres site |
| **FooterConfig** | `components/AdminDashboard.tsx` | Configuration du footer |
| **AboutConfig** | `components/AdminDashboard.tsx` | Configuration de la page À propos |

---

## 6. SERVICES & UTILITAIRES

### API & Backend
| Service | Fichier | Fonctionnalité |
|---------|---------|----------------|
| **api.ts** | `services/api.ts` | Firebase Auth, Firestore, Storage |
| **equipmentService.ts** | `services/equipmentService.ts` | Gestion données équipement |
| **weatherService.ts** | `services/weatherService.ts` | API météo (Open-Meteo) |
| **astronomyService.ts** | `services/astronomyService.ts` | Calculs astronomiques (sunset, moon phase) |
| **imageAnalysis.ts** | `services/imageAnalysis.ts` | Analyse d'images (histogramme, etc.) |
| **framingService.ts** | `services/module3/framingService.ts` | Service de cadrage Aladin |
| **exposureCalculator.ts** | `services/module5/exposureCalculator.ts` | Calcul temps de pose |

### Données & Types
| Fichier | Contenu |
|---------|---------|
| **types.ts** | Types TypeScript globaux (interfaces, enums) |
| **initialData.ts** | Données initiales du site |
| **messierCatalog.ts** | Catalogue Messier intégré |

---

## 📊 Architecture des Routes

```
/                          → GalleryView (Home)
/#articles                 → ProcessingView
/#image-of-the-day         → ImageOfTheDayView
/#image-wall               → ImageWallView
/#astro-index              → WeatherDisplayView
/#astrosuite               → AstroSuiteView (avec onglets)
  ├── #astrosuite/dashboard   → DashboardKPIs
  ├── #astrosuite/equipment  → (placeholder)
  ├── #astrosuite/framing    → AladinFramer
  ├── #astrosuite/planner    → MultiNightPlanner
  ├── #astrosuite/exposure   → SQMDisplay + ExposureCalculator
  └── #astrosuite/analysis  → ProjectDetailView
/#best-targets             → BestTargetsView
/#observation-planner      → ObservationPlannerView
/#session-planner          → SessionPlannerView
/#journal                  → JournalView
/#ask-hal                  → AskHalView
/#equipment                → GearReviewsView
/#admin                    → AdminDashboard (protégé)
```

---

## 🎯 Récapitulatif par Module

| Module | Nb Composants | Fonctionnalités Clés |
|--------|--------------|---------------------|
| **Core** | 15+ | Articles, Gallery, Recherche, Auth |
| **Astro Suite** | 6 modules | Dashboard, Framing, Planner, Exposure, Analysis |
| **Nova DSO** | 8+ | Targets, Météo, Journal, Mosaic, Log Analyzer |
| **Equipment** | 5 | Revues, Tracker, Settings |
| **Admin** | 6+ | CRUD, Upload, Settings |

**Total : ~50 composants** répartis sur 5 catégories fonctionnelles.

---

*Document généré le 2026-05-27 pour AstroCapture V2*