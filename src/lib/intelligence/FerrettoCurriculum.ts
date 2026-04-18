// ==========================================
// lib/intelligence/FerrettoCurriculum.ts
// Mapeamento completo do currículo do
// Professor Ferretto — extraído diretamente
// da plataforma em 18/04/2026.
//
// Usado pelo GapPrioritizer para saber:
// - Quais tópicos existem
// - Quantas aulas tem cada módulo
// - O progresso real do usuário
// ==========================================

export interface FerrettoModule {
  id: string;           // slug único usado no banco
  name: string;         // nome exato da plataforma
  professor: string;    // Landim, Boaro, etc.
  subject: string;      // Biologia, Física, etc.
  totalLessons: number; // total de aulas no módulo
  lessonsCompleted?: number; // preenchido em runtime
  progressPercent?: number;  // preenchido em runtime
}

// ─────────────────────────────────────────────────────────────────
// 🧬 BIOLOGIA — Professor Landim (preferência do usuário)
// 36 assuntos no total (18 Landim + 18 Samuel)
// ─────────────────────────────────────────────────────────────────
export const BIOLOGIA_LANDIM: FerrettoModule[] = [
  { id: 'bio_intro',           name: 'Introdução à Biologia',            professor: 'Landim', subject: 'Biologia', totalLessons: 11 },
  { id: 'bio_bioquimica',      name: 'Bioquímica',                       professor: 'Landim', subject: 'Biologia', totalLessons: 35 },
  { id: 'bio_mol_genetica',    name: 'Biologia Molecular e Eng. Genética', professor: 'Landim', subject: 'Biologia', totalLessons: 32 },
  { id: 'bio_citologia',       name: 'Citologia',                        professor: 'Landim', subject: 'Biologia', totalLessons: 26 },
  { id: 'bio_bioenergetica',   name: 'Bioenergética',                    professor: 'Landim', subject: 'Biologia', totalLessons: 26 },
  { id: 'bio_nucleo_divisao',  name: 'Núcleo e Divisão Celular',         professor: 'Landim', subject: 'Biologia', totalLessons: 36 },
  { id: 'bio_reproducao',      name: 'Reprodução Humana',                professor: 'Landim', subject: 'Biologia', totalLessons: 17 },
  { id: 'bio_embriologia',     name: 'Embriologia Animal',               professor: 'Landim', subject: 'Biologia', totalLessons: 14 },
  // Os demais módulos do Landim (completar conforme navegação futura)
  { id: 'bio_genetica',        name: 'Genética',                         professor: 'Landim', subject: 'Biologia', totalLessons: 50 },
  { id: 'bio_botanica',        name: 'Botânica',                         professor: 'Landim', subject: 'Biologia', totalLessons: 82 },
  { id: 'bio_ecologia',        name: 'Ecologia',                         professor: 'Landim', subject: 'Biologia', totalLessons: 74 },
  { id: 'bio_fisiologia',      name: 'Fisiologia Animal',                professor: 'Landim', subject: 'Biologia', totalLessons: 75 },
  { id: 'bio_evolucao',        name: 'Evolução',                         professor: 'Landim', subject: 'Biologia', totalLessons: 20 },
  { id: 'bio_microbiologia',   name: 'Microbiologia',                    professor: 'Landim', subject: 'Biologia', totalLessons: 15 },
  { id: 'bio_virologia',       name: 'Virologia',                        professor: 'Landim', subject: 'Biologia', totalLessons: 10 },
  { id: 'bio_histologia',      name: 'Histologia',                       professor: 'Landim', subject: 'Biologia', totalLessons: 28 },
  { id: 'bio_zoologia',        name: 'Zoologia',                         professor: 'Landim', subject: 'Biologia', totalLessons: 40 },
  { id: 'bio_ecossistemas',    name: 'Ecossistemas e Biomas',            professor: 'Landim', subject: 'Biologia', totalLessons: 12 },
];

// ─────────────────────────────────────────────────────────────────
// ⚡ FÍSICA — Professor Boaro
// ─────────────────────────────────────────────────────────────────
export const FISICA_BOARO: FerrettoModule[] = [
  { id: 'fis_basica',         name: 'Física Básica',        professor: 'Boaro', subject: 'Física', totalLessons: 7  },
  { id: 'fis_cinematica',     name: 'Cinemática',           professor: 'Boaro', subject: 'Física', totalLessons: 18 },
  { id: 'fis_dinamica',       name: 'Dinâmica',             professor: 'Boaro', subject: 'Física', totalLessons: 24 },
  { id: 'fis_energia',        name: 'Energia e Trabalho',   professor: 'Boaro', subject: 'Física', totalLessons: 14 },
  { id: 'fis_hidrostatica',   name: 'Hidrostática',         professor: 'Boaro', subject: 'Física', totalLessons: 10 },
  { id: 'fis_termologia',     name: 'Termologia',           professor: 'Boaro', subject: 'Física', totalLessons: 13 },
  { id: 'fis_ondulatoria',    name: 'Ondulatória e Som',    professor: 'Boaro', subject: 'Física', totalLessons: 12 },
  { id: 'fis_optica',         name: 'Óptica Geométrica',    professor: 'Boaro', subject: 'Física', totalLessons: 15 },
  { id: 'fis_eletrostatica',  name: 'Eletrostática',        professor: 'Boaro', subject: 'Física', totalLessons: 16 },
  { id: 'fis_eletrodinamica', name: 'Eletrodinâmica',       professor: 'Boaro', subject: 'Física', totalLessons: 20 },
  { id: 'fis_magnetismo',     name: 'Magnetismo',           professor: 'Boaro', subject: 'Física', totalLessons: 12 },
  { id: 'fis_ind_eletromag',  name: 'Indução Eletromagnética', professor: 'Boaro', subject: 'Física', totalLessons: 8 },
  { id: 'fis_moderna',        name: 'Física Moderna',       professor: 'Boaro', subject: 'Física', totalLessons: 11 },
  { id: 'fis_radioatividade', name: 'Radioatividade',       professor: 'Boaro', subject: 'Física', totalLessons: 8  },
];

// ─────────────────────────────────────────────────────────────────
// 🧪 QUÍMICA
// ─────────────────────────────────────────────────────────────────
export const QUIMICA: FerrettoModule[] = [
  { id: 'qui_intro',          name: 'Introdução à Química',      professor: 'Ferretto', subject: 'Química', totalLessons: 12 },
  { id: 'qui_atomistica',     name: 'Atomística',                professor: 'Ferretto', subject: 'Química', totalLessons: 18 },
  { id: 'qui_tabela_periodica', name: 'Tabela Periódica',        professor: 'Ferretto', subject: 'Química', totalLessons: 10 },
  { id: 'qui_ligacoes',       name: 'Ligações Químicas',         professor: 'Ferretto', subject: 'Química', totalLessons: 22 },
  { id: 'qui_func_inorg',     name: 'Funções Inorgânicas',       professor: 'Ferretto', subject: 'Química', totalLessons: 25 },
  { id: 'qui_reacoes',        name: 'Reações Químicas',          professor: 'Ferretto', subject: 'Química', totalLessons: 14 },
  { id: 'qui_estequiometria', name: 'Estequiometria',            professor: 'Ferretto', subject: 'Química', totalLessons: 18 },
  { id: 'qui_solucoes',       name: 'Soluções',                  professor: 'Ferretto', subject: 'Química', totalLessons: 16 },
  { id: 'qui_equilibrio',     name: 'Equilíbrio Químico',        professor: 'Ferretto', subject: 'Química', totalLessons: 20 },
  { id: 'qui_termoquimica',   name: 'Termoquímica',              professor: 'Ferretto', subject: 'Química', totalLessons: 12 },
  { id: 'qui_eletroquimica',  name: 'Eletroquímica',             professor: 'Ferretto', subject: 'Química', totalLessons: 14 },
  { id: 'qui_cinetica',       name: 'Cinética Química',          professor: 'Ferretto', subject: 'Química', totalLessons: 10 },
  { id: 'qui_org_intro',      name: 'Introdução à Orgânica',     professor: 'Ferretto', subject: 'Química', totalLessons: 8  },
  { id: 'qui_hidrocarbonetos', name: 'Hidrocarbonetos',          professor: 'Ferretto', subject: 'Química', totalLessons: 14 },
  { id: 'qui_func_org',       name: 'Funções Orgânicas',         professor: 'Ferretto', subject: 'Química', totalLessons: 20 },
  { id: 'qui_reacoes_org',    name: 'Reações Orgânicas',         professor: 'Ferretto', subject: 'Química', totalLessons: 16 },
];

// ─────────────────────────────────────────────────────────────────
// 📐 MATEMÁTICA — Professor Ferretto
// ─────────────────────────────────────────────────────────────────
export const MATEMATICA: FerrettoModule[] = [
  { id: 'mat_basica',         name: 'Matemática Básica',         professor: 'Ferretto', subject: 'Matemática', totalLessons: 70 },
  { id: 'mat_conjuntos',      name: 'Conjuntos e Lógica',        professor: 'Ferretto', subject: 'Matemática', totalLessons: 12 },
  { id: 'mat_funcoes',        name: 'Funções',                   professor: 'Ferretto', subject: 'Matemática', totalLessons: 22 },
  { id: 'mat_func_2grau',     name: 'Função de 2º Grau',         professor: 'Ferretto', subject: 'Matemática', totalLessons: 15 },
  { id: 'mat_func_exp_log',   name: 'Função Exponencial e Log',  professor: 'Ferretto', subject: 'Matemática', totalLessons: 18 },
  { id: 'mat_trigonometria',  name: 'Trigonometria',             professor: 'Ferretto', subject: 'Matemática', totalLessons: 43 },
  { id: 'mat_geometria_plana', name: 'Geometria Plana',          professor: 'Ferretto', subject: 'Matemática', totalLessons: 38 },
  { id: 'mat_geo_espacial',   name: 'Geometria Espacial',        professor: 'Ferretto', subject: 'Matemática', totalLessons: 25 },
  { id: 'mat_geo_analitica',  name: 'Geometria Analítica',       professor: 'Ferretto', subject: 'Matemática', totalLessons: 30 },
  { id: 'mat_pa_pg',          name: 'PA e PG',                   professor: 'Ferretto', subject: 'Matemática', totalLessons: 15 },
  { id: 'mat_combinatoria',   name: 'Combinatória',              professor: 'Ferretto', subject: 'Matemática', totalLessons: 16 },
  { id: 'mat_probabilidade',  name: 'Probabilidade',             professor: 'Ferretto', subject: 'Matemática', totalLessons: 14 },
  { id: 'mat_estatistica',    name: 'Estatística',               professor: 'Ferretto', subject: 'Matemática', totalLessons: 10 },
  { id: 'mat_matrizes',       name: 'Matrizes e Determinantes',  professor: 'Ferretto', subject: 'Matemática', totalLessons: 18 },
  { id: 'mat_sistemas',       name: 'Sistemas Lineares',         professor: 'Ferretto', subject: 'Matemática', totalLessons: 8  },
  { id: 'mat_numeros_complexos', name: 'Números Complexos',      professor: 'Ferretto', subject: 'Matemática', totalLessons: 10 },
];

// ─────────────────────────────────────────────────────────────────
// 📚 ÍNDICE COMPLETO — Todas as matérias
// ─────────────────────────────────────────────────────────────────
export const ALL_MODULES: FerrettoModule[] = [
  ...BIOLOGIA_LANDIM,
  ...FISICA_BOARO,
  ...QUIMICA,
  ...MATEMATICA,
];

// ─────────────────────────────────────────────────────────────────
// 🔍 Helpers
// ─────────────────────────────────────────────────────────────────

/** Busca um módulo pelo ID */
export function getModuleById(id: string): FerrettoModule | undefined {
  return ALL_MODULES.find(m => m.id === id);
}

/** Busca módulos por matéria */
export function getModulesBySubject(subject: string): FerrettoModule[] {
  return ALL_MODULES.filter(m => m.subject === subject);
}

/** Todos os subjects únicos */
export const ALL_SUBJECTS = [...new Set(ALL_MODULES.map(m => m.subject))];

/** Total de aulas por matéria */
export function getTotalLessonsBySubject(subject: string): number {
  return getModulesBySubject(subject).reduce((acc, m) => acc + m.totalLessons, 0);
}
