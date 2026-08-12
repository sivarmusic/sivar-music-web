"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Lang = "en" | "es";

type Dict = Record<string, Record<Lang, string>>;

const dict: Dict = {
  headerTitle: { en: "Sivar Voice Catalog", es: "Catálogo de Locutores Sivar Music" },
  headerSubtitle: {
    en: "Search by name or filter by language, accent, gender, style and age range.",
    es: "Buscá por nombre o filtrá por idioma, acento, género, estilo y rango de edad.",
  },
  searchByName: { en: "Search by name", es: "Buscar por nombre" },
  placeholderName: { en: "e.g., Alejandro, Sheila…", es: "Ej: Alejandro, Sheila…" },
  searchPlaceholder: { en: "Name, language, style…", es: "Nombre, idioma, estilo…" },
  language: { en: "Language", es: "Idioma" },
  accent: { en: "Accent", es: "Acento" },
  gender: { en: "Gender", es: "Género" },
  style: { en: "Style", es: "Estilo" },
  ageRange: { en: "Age range", es: "Rango de edad" },
  all: { en: "All", es: "Todos" },
  allAges: { en: "All", es: "Todas" },
  selectStyles: { en: "Select styles", es: "Seleccionar estilos" },
  selectAges: { en: "Select ages", es: "Seleccionar edades" },
  clear: { en: "Clear", es: "Limpiar" },
  apply: { en: "Apply", es: "Aplicar" },
  clearFilters: { en: "Clear filters", es: "Limpiar filtros" },
  loadingVoices: { en: "Loading voices…", es: "Cargando locutores…" },
  error: { en: "Error", es: "Error" },
  noResults: { en: "No results. Try changing filters.", es: "Sin resultados. Probá cambiando los filtros." },
  noVoicesForLocation: { en: "No voices for this location.", es: "No hay locutores para esta ubicación." },
  viewProfile: { en: "View profile", es: "Ver perfil" },
  addToList: { en: "Add to project", es: "Agregar a proyecto" },
  addToProject: { en: "Add to project", es: "Agregar a proyecto" },
  addedToProject: { en: "Added to project", es: "Agregado al proyecto" },
  addAdding: { en: "Adding…", es: "Agregando…" },
  signIn: { en: "Sign in", es: "Iniciá sesión" },
  instagram: { en: "Instagram", es: "Instagram" },
  vimeo: { en: "Vimeo", es: "Vimeo" },
  loginTitle: { en: "Sign in", es: "Ingresar" },
  email: { en: "Email", es: "Email" },
  phone: { en: "Phone", es: "Teléfono" },
  password: { en: "Password", es: "Contraseña" },
  login: { en: "Sign in", es: "Entrar" },
  logout: { en: "Sign out", es: "Salir" },
  myList: { en: "My projects", es: "Mis proyectos" },
  share: { en: "Share", es: "Compartir" },
  notAvailable: { en: "Not available", es: "No disponible" },
  loading: { en: "Loading…", es: "Cargando…" },
  newProject: { en: "New project", es: "Nuevo proyecto" },
  selectProject: { en: "Select project", es: "Seleccionar proyecto" },
  projectNamePlaceholder: { en: "Project name", es: "Nombre del proyecto" },
  renameProject: { en: "Rename project", es: "Renombrar proyecto" },
  deleteProject: { en: "Delete project", es: "Eliminar proyecto" },
  removeFromProject: { en: "Remove", es: "Quitar" },
  confirmDeleteProject: { en: "Delete this project?", es: "¿Eliminar este proyecto?" },
  projectCreated: { en: "Project created", es: "Proyecto creado" },
  projectRenamed: { en: "Project renamed", es: "Proyecto renombrado" },
  projectDeleted: { en: "Project deleted", es: "Proyecto eliminado" },
  removedFromProject: { en: "Removed from project", es: "Quitado del proyecto" },
  creating: { en: "Creating…", es: "Creando…" },
  saving: { en: "Saving…", es: "Guardando…" },
  savedNotPersisted: { en: "Saved (not persisted).", es: "Guardado correctamente (no persistente)." },
  errorSaving: { en: "Error saving", es: "Error guardando" },
  deleting: { en: "Deleting…", es: "Eliminando…" },
  sharing: { en: "Sharing…", es: "Compartiendo…" },
  removing: { en: "Removing…", es: "Quitando…" },
  projects: { en: "Projects", es: "Proyectos" },
  noProjects: { en: "No projects yet", es: "No hay proyectos aún" },
  copyLink: { en: "Copy link", es: "Copiar link" },
  copy: { en: "Copy", es: "Copiar" },
  copied: { en: "Copied", es: "Copiado" },
  emailCopied: { en: "Email copied", es: "Email copiado" },
  phoneCopied: { en: "Phone copied", es: "Teléfono copiado" },
  adminOnly: { en: "Admins only. Please sign in.", es: "Solo admins. Iniciá sesión." },
  adminCreateClient: { en: "Create client", es: "Crear cliente" },
  nameOptional: { en: "Name (optional)", es: "Nombre (opcional)" },
  create: { en: "Create", es: "Crear" },
  adminLoginTitle: { en: "Admin – Sign in", es: "Admin – Ingresar" },
  save: { en: "Save", es: "Guardar" },
  cancel: { en: "Cancel", es: "Cancelar" },
  edit: { en: "Edit", es: "Editar" },
  name: { en: "Name", es: "Nombre" },
  photo: { en: "Photo", es: "Foto" },
  demoAudio: { en: "Demo (audio)", es: "Demo (audio)" },
  contactInfo: { en: "Contact info", es: "Información de contacto" },
  contactInfoAdminOnly: { en: "Contact (admins only)", es: "Contacto (solo admin)" },
  errorLoadingVoices: { en: "Error loading voices", es: "Error cargando locutores" },
  errorLoadingProfile: { en: "Error loading profile", es: "Error cargando perfil" },
  profileNotFound: { en: "Profile not found", es: "Perfil no encontrado" },
  noPlaylistItems: { en: "No items yet.", es: "No hay elementos aún." },
  noDemo: { en: "No demo available", es: "Sin demo disponible" },
  play: { en: "Play", es: "Reproducir" },
  pause: { en: "Pause", es: "Pausar" },
  audioProgress: { en: "Audio progress", es: "Progreso de audio" },
  clientsTitle: { en: "Clients", es: "Clientes" },
  created: { en: "Created", es: "Creado" },
  actions: { en: "Actions", es: "Acciones" },
  resetPass: { en: "Reset pass", es: "Resetear" },
  delete: { en: "Delete", es: "Eliminar" },
  noClients: { en: "No clients", es: "No hay clientes" },
  areYouAdmin: { en: "Are you an admin?", es: "¿Sos admin?" },
  adminSignInHere: { en: "Sign in here", es: "Ingresá acá" },
  portfolio: { en: "Portfolio", es: "Portfolio" },
  aboutTalent: { en: "About Talent", es: "Sobre el locutor" },
  demos: { en: "Demos", es: "Demos" },
  aboutName: { en: "About", es: "Sobre" },
  vocalCharacteristics: { en: "Vocal Characteristics", es: "Características vocales" },
  nativeLanguage: { en: "Native Language", es: "Idioma nativo" },
  voiceAges: { en: "Voice Ages", es: "Rango de voz" },
  accentsLabel: { en: "Accents", es: "Acentos" },
  categoriesLabel: { en: "Categories", es: "Categorías" },
  noBio: { en: "No bio available yet.", es: "Sin descripción por ahora." },
  noDemos: { en: "No demos yet.", es: "Sin demos por ahora." },
  location: { en: "Location", es: "Ubicación" },
  selectedCount: { en: "{count} selected", es: "{count} seleccionados" },
  noPrimaryLanguage: { en: "No primary language", es: "Sin idioma principal" },
  flag: { en: "Flag", es: "Bandera" },
  flagOf: { en: "Flag of {country}", es: "Bandera de {country}" },
  signInToAdd: { en: "Sign in to add to a project.", es: "Iniciá sesión para agregar a un proyecto." },
  demoOf: { en: "Demo of {name}", es: "Demo de {name}" },
};

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: keyof typeof dict) => string };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    const saved = typeof window !== "undefined" ? (localStorage.getItem("voces_lang") as Lang | null) : null;
    if (saved === "en" || saved === "es") setLang(saved);
  }, []);
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [lang]);
  const set = (l: Lang) => {
    setLang(l);
    if (typeof window !== "undefined") localStorage.setItem("voces_lang", l);
  };
  const t = (k: keyof typeof dict) => dict[k][lang] || dict[k].en;
  const value = useMemo(() => ({ lang, setLang: set, t }), [lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("I18nProvider missing");
  return ctx;
}
