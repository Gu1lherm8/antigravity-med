import { useState, useMemo } from 'react';
import {
  Search, BookOpen, Layers, Calendar, Plus,
  ChevronDown, ChevronUp, Filter, GraduationCap, X
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
//  DADOS COMPLETOS DO CURRÍCULO FERRETTO POR FRENTES
//  Excluídas: Matemática, História, Inglês Gramática
// ─────────────────────────────────────────────────────────────

interface Assunto {
  id: string;
  nome: string;
  frente: 'A' | 'B' | 'C';
  relevancia: number; // 1-5
}
interface Disciplina {
  id: string;
  nome: string;
  emoji: string;
  cor: string;
  professor: string;
  assuntos: Assunto[];
}

const CURRICULO: Disciplina[] = [
  // ─── BIOLOGIA ────────────────────────────────────────────
  {
    id: 'biologia',
    nome: 'Biologia',
    emoji: '🧬',
    cor: '#10b981',
    professor: 'Prof. Landim',
    assuntos: [
      // FRENTE A — Citologia e Biologia Molecular
      { id: 'bio_a1',  nome: 'Introdução à Biologia',         frente: 'A', relevancia: 3 },
      { id: 'bio_a2',  nome: 'Bioquímica',                    frente: 'A', relevancia: 4 },
      { id: 'bio_a3',  nome: 'Citologia — Visão Geral',       frente: 'A', relevancia: 5 },
      { id: 'bio_a4',  nome: 'Membrana Plasmática',           frente: 'A', relevancia: 4 },
      { id: 'bio_a5',  nome: 'Organelas Citoplasmáticas',     frente: 'A', relevancia: 4 },
      { id: 'bio_a6',  nome: 'Núcleo e Material Genético',    frente: 'A', relevancia: 5 },
      { id: 'bio_a7',  nome: 'Divisão Celular (Mitose/Meiose)', frente: 'A', relevancia: 5 },
      { id: 'bio_a8',  nome: 'Bioenergética (Fotossíntese)',  frente: 'A', relevancia: 5 },
      { id: 'bio_a9',  nome: 'Bioenergética (Respiração)',    frente: 'A', relevancia: 5 },
      { id: 'bio_a10', nome: 'Fermentação',                   frente: 'A', relevancia: 3 },
      { id: 'bio_a11', nome: 'Biologia Molecular',            frente: 'A', relevancia: 5 },
      { id: 'bio_a12', nome: 'Engenharia Genética e Biotecnologia', frente: 'A', relevancia: 5 },
      // FRENTE B — Genética e Evolução
      { id: 'bio_b1',  nome: 'Genética — 1ª Lei de Mendel',   frente: 'B', relevancia: 5 },
      { id: 'bio_b2',  nome: 'Genética — 2ª Lei de Mendel',   frente: 'B', relevancia: 5 },
      { id: 'bio_b3',  nome: 'Interações Gênicas',            frente: 'B', relevancia: 4 },
      { id: 'bio_b4',  nome: 'Alelos Múltiplos e Grupos Sanguíneos', frente: 'B', relevancia: 5 },
      { id: 'bio_b5',  nome: 'Herança Ligada ao Sexo',        frente: 'B', relevancia: 5 },
      { id: 'bio_b6',  nome: 'Herança Quantitativa',          frente: 'B', relevancia: 3 },
      { id: 'bio_b7',  nome: 'Genética de Populações (Hardy-Weinberg)', frente: 'B', relevancia: 3 },
      { id: 'bio_b8',  nome: 'Mutações',                      frente: 'B', relevancia: 4 },
      { id: 'bio_b9',  nome: 'Evolução — Teorias',            frente: 'B', relevancia: 5 },
      { id: 'bio_b10', nome: 'Evolução — Evidências',         frente: 'B', relevancia: 4 },
      { id: 'bio_b11', nome: 'Especiação',                    frente: 'B', relevancia: 3 },
      // FRENTE C — Ecologia, Botânica, Zoologia e Fisiologia
      { id: 'bio_c1',  nome: 'Ecologia — Conceitos Básicos',  frente: 'C', relevancia: 5 },
      { id: 'bio_c2',  nome: 'Relações Ecológicas',           frente: 'C', relevancia: 5 },
      { id: 'bio_c3',  nome: 'Cadeias e Teias Alimentares',   frente: 'C', relevancia: 4 },
      { id: 'bio_c4',  nome: 'Ciclos Biogeoquímicos',         frente: 'C', relevancia: 4 },
      { id: 'bio_c5',  nome: 'Biomas Brasileiros',            frente: 'C', relevancia: 5 },
      { id: 'bio_c6',  nome: 'Microbiologia e Virologia',     frente: 'C', relevancia: 4 },
      { id: 'bio_c7',  nome: 'Protoctistas',                  frente: 'C', relevancia: 3 },
      { id: 'bio_c8',  nome: 'Fungos',                        frente: 'C', relevancia: 3 },
      { id: 'bio_c9',  nome: 'Botânica — Morfologia',         frente: 'C', relevancia: 4 },
      { id: 'bio_c10', nome: 'Botânica — Fisiologia Vegetal', frente: 'C', relevancia: 4 },
      { id: 'bio_c11', nome: 'Reprodução Vegetal',            frente: 'C', relevancia: 3 },
      { id: 'bio_c12', nome: 'Zoologia — Invertebrados',      frente: 'C', relevancia: 4 },
      { id: 'bio_c13', nome: 'Zoologia — Vertebrados',        frente: 'C', relevancia: 4 },
      { id: 'bio_c14', nome: 'Histologia Animal',             frente: 'C', relevancia: 3 },
      { id: 'bio_c15', nome: 'Embriologia Animal',            frente: 'C', relevancia: 3 },
      { id: 'bio_c16', nome: 'Fisiologia Humana — Sistemas',  frente: 'C', relevancia: 5 },
      { id: 'bio_c17', nome: 'Sistema Nervoso e Sentidos',    frente: 'C', relevancia: 4 },
      { id: 'bio_c18', nome: 'Sistema Endócrino',             frente: 'C', relevancia: 4 },
      { id: 'bio_c19', nome: 'Reprodução Humana',             frente: 'C', relevancia: 5 },
    ]
  },

  // ─── FÍSICA ──────────────────────────────────────────────
  {
    id: 'fisica',
    nome: 'Física',
    emoji: '⚛️',
    cor: '#3b82f6',
    professor: 'Prof. Boaro',
    assuntos: [
      // FRENTE A — Mecânica
      { id: 'fis_a1',  nome: 'Física Básica e Grandezas',    frente: 'A', relevancia: 3 },
      { id: 'fis_a2',  nome: 'Cinemática Escalar',           frente: 'A', relevancia: 5 },
      { id: 'fis_a3',  nome: 'Cinemática Vetorial',          frente: 'A', relevancia: 5 },
      { id: 'fis_a4',  nome: 'Lançamento de Projéteis',      frente: 'A', relevancia: 4 },
      { id: 'fis_a5',  nome: 'Movimento Circular',           frente: 'A', relevancia: 4 },
      { id: 'fis_a6',  nome: 'Dinâmica — Leis de Newton',    frente: 'A', relevancia: 5 },
      { id: 'fis_a7',  nome: 'Forças de Atrito',             frente: 'A', relevancia: 4 },
      { id: 'fis_a8',  nome: 'Plano Inclinado',              frente: 'A', relevancia: 4 },
      { id: 'fis_a9',  nome: 'Trabalho e Energia',           frente: 'A', relevancia: 5 },
      { id: 'fis_a10', nome: 'Potência e Rendimento',        frente: 'A', relevancia: 4 },
      { id: 'fis_a11', nome: 'Impulso e Quantidade de Movimento', frente: 'A', relevancia: 4 },
      { id: 'fis_a12', nome: 'Hidrostática',                 frente: 'A', relevancia: 4 },
      { id: 'fis_a13', nome: 'Gravitação Universal',         frente: 'A', relevancia: 4 },
      // FRENTE B — Termologia e Ondulatória
      { id: 'fis_b1',  nome: 'Termometria e Escalas',        frente: 'B', relevancia: 4 },
      { id: 'fis_b2',  nome: 'Dilatação Térmica',            frente: 'B', relevancia: 4 },
      { id: 'fis_b3',  nome: 'Calorimetria',                 frente: 'B', relevancia: 5 },
      { id: 'fis_b4',  nome: 'Transmissão de Calor',         frente: 'B', relevancia: 4 },
      { id: 'fis_b5',  nome: 'Termodinâmica',                frente: 'B', relevancia: 5 },
      { id: 'fis_b6',  nome: 'Ondulatória — Conceitos',      frente: 'B', relevancia: 5 },
      { id: 'fis_b7',  nome: 'Som e Acústica',               frente: 'B', relevancia: 4 },
      { id: 'fis_b8',  nome: 'Óptica Geométrica',            frente: 'B', relevancia: 5 },
      { id: 'fis_b9',  nome: 'Espelhos e Lentes',            frente: 'B', relevancia: 5 },
      { id: 'fis_b10', nome: 'Instrumentos Ópticos',         frente: 'B', relevancia: 3 },
      // FRENTE C — Eletricidade e Física Moderna
      { id: 'fis_c1',  nome: 'Eletrostática — Cargas',       frente: 'C', relevancia: 5 },
      { id: 'fis_c2',  nome: 'Campo e Potencial Elétrico',   frente: 'C', relevancia: 5 },
      { id: 'fis_c3',  nome: 'Corrente Elétrica e Resistência', frente: 'C', relevancia: 5 },
      { id: 'fis_c4',  nome: 'Circuitos Elétricos (Ohm)',    frente: 'C', relevancia: 5 },
      { id: 'fis_c5',  nome: 'Potência e Consumo Elétrico',  frente: 'C', relevancia: 5 },
      { id: 'fis_c6',  nome: 'Magnetismo',                   frente: 'C', relevancia: 4 },
      { id: 'fis_c7',  nome: 'Indução Eletromagnética',      frente: 'C', relevancia: 4 },
      { id: 'fis_c8',  nome: 'Ondas Eletromagnéticas',       frente: 'C', relevancia: 4 },
      { id: 'fis_c9',  nome: 'Física Moderna — Relatividade', frente: 'C', relevancia: 4 },
      { id: 'fis_c10', nome: 'Efeito Fotoelétrico e Quântica', frente: 'C', relevancia: 4 },
      { id: 'fis_c11', nome: 'Radioatividade e Fissão',      frente: 'C', relevancia: 5 },
    ]
  },

  // ─── QUÍMICA ─────────────────────────────────────────────
  {
    id: 'quimica',
    nome: 'Química',
    emoji: '🧪',
    cor: '#a78bfa',
    professor: 'Prof. Ferretto / Química',
    assuntos: [
      // FRENTE A — Química Geral e Inorgânica
      { id: 'qui_a1',  nome: 'Introdução à Química',           frente: 'A', relevancia: 3 },
      { id: 'qui_a2',  nome: 'Atomística',                     frente: 'A', relevancia: 4 },
      { id: 'qui_a3',  nome: 'Tabela Periódica',               frente: 'A', relevancia: 4 },
      { id: 'qui_a4',  nome: 'Ligações Químicas',              frente: 'A', relevancia: 5 },
      { id: 'qui_a5',  nome: 'Geometria Molecular',            frente: 'A', relevancia: 4 },
      { id: 'qui_a6',  nome: 'Polaridade e Forças Intermoleculares', frente: 'A', relevancia: 4 },
      { id: 'qui_a7',  nome: 'Funções Inorgânicas — Ácidos',   frente: 'A', relevancia: 5 },
      { id: 'qui_a8',  nome: 'Funções Inorgânicas — Bases',    frente: 'A', relevancia: 5 },
      { id: 'qui_a9',  nome: 'Funções Inorgânicas — Sais e Óxidos', frente: 'A', relevancia: 4 },
      { id: 'qui_a10', nome: 'Estequiometria',                 frente: 'A', relevancia: 5 },
      { id: 'qui_a11', nome: 'Reações Químicas (Classificação)', frente: 'A', relevancia: 4 },
      // FRENTE B — Físico-Química
      { id: 'qui_b1',  nome: 'Soluções e Concentração',        frente: 'B', relevancia: 5 },
      { id: 'qui_b2',  nome: 'Propriedades Coligativas',       frente: 'B', relevancia: 4 },
      { id: 'qui_b3',  nome: 'Cinética Química',               frente: 'B', relevancia: 5 },
      { id: 'qui_b4',  nome: 'Equilíbrio Químico',             frente: 'B', relevancia: 5 },
      { id: 'qui_b5',  nome: 'Equilíbrio Ácido-Base (pH)',     frente: 'B', relevancia: 5 },
      { id: 'qui_b6',  nome: 'Equilíbrio de Solubilidade',     frente: 'B', relevancia: 3 },
      { id: 'qui_b7',  nome: 'Termoquímica',                   frente: 'B', relevancia: 4 },
      { id: 'qui_b8',  nome: 'Eletroquímica — Pilhas',         frente: 'B', relevancia: 5 },
      { id: 'qui_b9',  nome: 'Eletrólise',                     frente: 'B', relevancia: 4 },
      // FRENTE C — Química Orgânica
      { id: 'qui_c1',  nome: 'Introdução à Química Orgânica',  frente: 'C', relevancia: 4 },
      { id: 'qui_c2',  nome: 'Hidrocarbonetos',                frente: 'C', relevancia: 5 },
      { id: 'qui_c3',  nome: 'Funções Orgânicas Oxigenadas',   frente: 'C', relevancia: 5 },
      { id: 'qui_c4',  nome: 'Funções Orgânicas Nitrogenadas', frente: 'C', relevancia: 4 },
      { id: 'qui_c5',  nome: 'Isomeria',                       frente: 'C', relevancia: 5 },
      { id: 'qui_c6',  nome: 'Reações Orgânicas',              frente: 'C', relevancia: 4 },
      { id: 'qui_c7',  nome: 'Polímeros e Macromoléculas',     frente: 'C', relevancia: 4 },
      { id: 'qui_c8',  nome: 'Bioquímica — Proteínas e Lipídeos', frente: 'C', relevancia: 4 },
      { id: 'qui_c9',  nome: 'Química Ambiental',              frente: 'C', relevancia: 5 },
    ]
  },

  // ─── GEOGRAFIA ───────────────────────────────────────────
  {
    id: 'geografia',
    nome: 'Geografia',
    emoji: '🌎',
    cor: '#f59e0b',
    professor: 'Prof. Ferretto / Geo',
    assuntos: [
      // FRENTE A — Cartografia e Geografia Física
      { id: 'geo_a1',  nome: 'Cartografia e Orientação',      frente: 'A', relevancia: 3 },
      { id: 'geo_a2',  nome: 'Coordenadas Geográficas',       frente: 'A', relevancia: 3 },
      { id: 'geo_a3',  nome: 'Fusos Horários',                frente: 'A', relevancia: 4 },
      { id: 'geo_a4',  nome: 'Dinâmica Interna da Terra',     frente: 'A', relevancia: 4 },
      { id: 'geo_a5',  nome: 'Relevo Brasileiro e Mundial',   frente: 'A', relevancia: 4 },
      { id: 'geo_a6',  nome: 'Hidrografia Brasileira',        frente: 'A', relevancia: 4 },
      { id: 'geo_a7',  nome: 'Clima e Meteorologia',          frente: 'A', relevancia: 5 },
      { id: 'geo_a8',  nome: 'Vegetação e Biomas Mundiais',   frente: 'A', relevancia: 4 },
      { id: 'geo_a9',  nome: 'Solos e Agricultura',           frente: 'A', relevancia: 3 },
      // FRENTE B — Questões Ambientais e Geopolítica
      { id: 'geo_b1',  nome: 'Questões Ambientais Globais',   frente: 'B', relevancia: 5 },
      { id: 'geo_b2',  nome: 'Recursos Hídricos e Conflitos', frente: 'B', relevancia: 5 },
      { id: 'geo_b3',  nome: 'Energia — Fontes e Matrizes',   frente: 'B', relevancia: 5 },
      { id: 'geo_b4',  nome: 'Geopolítica Mundial',           frente: 'B', relevancia: 5 },
      { id: 'geo_b5',  nome: 'Conflitos e Guerras Atuais',    frente: 'B', relevancia: 5 },
      { id: 'geo_b6',  nome: 'Globalização e Blocos Econômicos', frente: 'B', relevancia: 5 },
      { id: 'geo_b7',  nome: 'Geopolítica da China e EUA',    frente: 'B', relevancia: 4 },
      { id: 'geo_b8',  nome: 'Oriente Médio',                 frente: 'B', relevancia: 4 },
      { id: 'geo_b9',  nome: 'África e Descolonização',       frente: 'B', relevancia: 4 },
      // FRENTE C — Geografia Humana e Brasil
      { id: 'geo_c1',  nome: 'Urbanização Brasileira',        frente: 'C', relevancia: 5 },
      { id: 'geo_c2',  nome: 'Megalópoles e Metrópoles',      frente: 'C', relevancia: 4 },
      { id: 'geo_c3',  nome: 'Migrações',                     frente: 'C', relevancia: 5 },
      { id: 'geo_c4',  nome: 'Crescimento Demográfico',       frente: 'C', relevancia: 4 },
      { id: 'geo_c5',  nome: 'Industrialização Brasileira',   frente: 'C', relevancia: 4 },
      { id: 'geo_c6',  nome: 'Agropecuária Brasileira',       frente: 'C', relevancia: 4 },
      { id: 'geo_c7',  nome: 'Regiões do Brasil',             frente: 'C', relevancia: 5 },
      { id: 'geo_c8',  nome: 'Desigualdades Regionais',       frente: 'C', relevancia: 5 },
    ]
  },

  // ─── PORTUGUÊS ───────────────────────────────────────────
  {
    id: 'portugues',
    nome: 'Português',
    emoji: '📚',
    cor: '#ec4899',
    professor: 'Prof. Ferretto / Redação',
    assuntos: [
      // FRENTE A — Interpretação e Gêneros Textuais
      { id: 'por_a1',  nome: 'Interpretação de Texto',        frente: 'A', relevancia: 5 },
      { id: 'por_a2',  nome: 'Tipologia Textual',             frente: 'A', relevancia: 5 },
      { id: 'por_a3',  nome: 'Gêneros Textuais',              frente: 'A', relevancia: 5 },
      { id: 'por_a4',  nome: 'Inferências e Pressupostos',    frente: 'A', relevancia: 5 },
      { id: 'por_a5',  nome: 'Funções da Linguagem',          frente: 'A', relevancia: 4 },
      { id: 'por_a6',  nome: 'Coerência e Coesão Textual',    frente: 'A', relevancia: 5 },
      { id: 'por_a7',  nome: 'Figuras de Linguagem',          frente: 'A', relevancia: 4 },
      { id: 'por_a8',  nome: 'Variação Linguística',          frente: 'A', relevancia: 4 },
      // FRENTE B — Gramática Aplicada
      { id: 'por_b1',  nome: 'Morfologia — Classes de Palavras', frente: 'B', relevancia: 4 },
      { id: 'por_b2',  nome: 'Sintaxe — Período Simples',    frente: 'B', relevancia: 4 },
      { id: 'por_b3',  nome: 'Sintaxe — Período Composto',   frente: 'B', relevancia: 4 },
      { id: 'por_b4',  nome: 'Concordância Nominal e Verbal', frente: 'B', relevancia: 4 },
      { id: 'por_b5',  nome: 'Regência Nominal e Verbal',    frente: 'B', relevancia: 3 },
      { id: 'por_b6',  nome: 'Crase',                        frente: 'B', relevancia: 3 },
      { id: 'por_b7',  nome: 'Pontuação',                    frente: 'B', relevancia: 4 },
      { id: 'por_b8',  nome: 'Semântica e Estilística',      frente: 'B', relevancia: 4 },
      // FRENTE C — Redação ENEM
      { id: 'por_c1',  nome: 'Estrutura da Dissertação',     frente: 'C', relevancia: 5 },
      { id: 'por_c2',  nome: 'Competências da Redação ENEM', frente: 'C', relevancia: 5 },
      { id: 'por_c3',  nome: 'Repertórios Socioculturais',   frente: 'C', relevancia: 5 },
      { id: 'por_c4',  nome: 'Proposta de Intervenção',      frente: 'C', relevancia: 5 },
      { id: 'por_c5',  nome: 'Construção de Argumentos',     frente: 'C', relevancia: 5 },
      { id: 'por_c6',  nome: 'Introdução e Conclusão',       frente: 'C', relevancia: 5 },
    ]
  },

  // ─── LITERATURA ──────────────────────────────────────────
  {
    id: 'literatura',
    nome: 'Literatura',
    emoji: '📖',
    cor: '#f43f5e',
    professor: 'Prof. Ferretto / Literatura',
    assuntos: [
      // FRENTE A — Trovadorismo ao Classicismo
      { id: 'lit_a1', nome: 'Trovadorismo',                  frente: 'A', relevancia: 3 },
      { id: 'lit_a2', nome: 'Humanismo',                     frente: 'A', relevancia: 3 },
      { id: 'lit_a3', nome: 'Classicismo',                   frente: 'A', relevancia: 3 },
      { id: 'lit_a4', nome: 'Quinhentismo Brasileiro',       frente: 'A', relevancia: 3 },
      { id: 'lit_a5', nome: 'Barroco',                       frente: 'A', relevancia: 4 },
      { id: 'lit_a6', nome: 'Arcadismo',                     frente: 'A', relevancia: 4 },
      // FRENTE B — Romantismo ao Pré-Modernismo
      { id: 'lit_b1', nome: 'Romantismo (Prosa e Poesia)',   frente: 'B', relevancia: 4 },
      { id: 'lit_b2', nome: 'Realismo e Naturalismo',        frente: 'B', relevancia: 5 },
      { id: 'lit_b3', nome: 'Machado de Assis',              frente: 'B', relevancia: 5 },
      { id: 'lit_b4', nome: 'Parnasianismo e Simbolismo',    frente: 'B', relevancia: 3 },
      { id: 'lit_b5', nome: 'Pré-Modernismo',                frente: 'B', relevancia: 3 },
      // FRENTE C — Modernismo e Contemporâneo
      { id: 'lit_c1', nome: 'Modernismo — 1ª Fase',          frente: 'C', relevancia: 5 },
      { id: 'lit_c2', nome: 'Modernismo — 2ª Fase (Prosa)',  frente: 'C', relevancia: 5 },
      { id: 'lit_c3', nome: 'Modernismo — 2ª Fase (Poesia)', frente: 'C', relevancia: 5 },
      { id: 'lit_c4', nome: 'Modernismo — 3ª Fase',          frente: 'C', relevancia: 4 },
      { id: 'lit_c5', nome: 'Literatura Contemporânea',      frente: 'C', relevancia: 4 },
      { id: 'lit_c6', nome: 'Literatura Africana de LP',     frente: 'C', relevancia: 3 },
    ]
  },

  // ─── REDAÇÃO ─────────────────────────────────────────────
  {
    id: 'redacao',
    nome: 'Redação',
    emoji: '✍️',
    cor: '#fb923c',
    professor: 'Prof. Ferretto / Redação',
    assuntos: [
      // FRENTE A — Estrutura e Competências
      { id: 'red_a1', nome: 'As 5 Competências do ENEM',     frente: 'A', relevancia: 5 },
      { id: 'red_a2', nome: 'Estrutura Dissertativa-Argumentativa', frente: 'A', relevancia: 5 },
      { id: 'red_a3', nome: 'Análise da Coletânea',          frente: 'A', relevancia: 5 },
      { id: 'red_a4', nome: 'Construção do Ponto de Vista',  frente: 'A', relevancia: 5 },
      { id: 'red_a5', nome: 'Introdução — Modelos e Técnicas', frente: 'A', relevancia: 5 },
      // FRENTE B — Desenvolvimento e Argumentação
      { id: 'red_b1', nome: 'Tipos de Argumento',            frente: 'B', relevancia: 5 },
      { id: 'red_b2', nome: 'Repertório Sociocultural',      frente: 'B', relevancia: 5 },
      { id: 'red_b3', nome: 'Dados, Estatísticas e Fatos',   frente: 'B', relevancia: 4 },
      { id: 'red_b4', nome: 'Citações e Referências',        frente: 'B', relevancia: 4 },
      { id: 'red_b5', nome: 'Coesão Textual — Conectivos',   frente: 'B', relevancia: 5 },
      // FRENTE C — Conclusão e Revisão
      { id: 'red_c1', nome: 'Proposta de Intervenção (PI)',  frente: 'C', relevancia: 5 },
      { id: 'red_c2', nome: 'Respeito aos Direitos Humanos', frente: 'C', relevancia: 5 },
      { id: 'red_c3', nome: 'Revisão e Reescrita',           frente: 'C', relevancia: 4 },
      { id: 'red_c4', nome: 'Temas Recorrentes no ENEM',     frente: 'C', relevancia: 5 },
    ]
  },

  // ─── FILOSOFIA ───────────────────────────────────────────
  {
    id: 'filosofia',
    nome: 'Filosofia',
    emoji: '⚖️',
    cor: '#64748b',
    professor: 'Prof. Ferretto / Humanas',
    assuntos: [
      // FRENTE A — Filosofia Antiga e Medieval
      { id: 'fil_a1', nome: 'Pré-Socráticos',                frente: 'A', relevancia: 3 },
      { id: 'fil_a2', nome: 'Sócrates, Platão e Aristóteles', frente: 'A', relevancia: 4 },
      { id: 'fil_a3', nome: 'Filosofia Helenística',         frente: 'A', relevancia: 3 },
      { id: 'fil_a4', nome: 'Filosofia Medieval e Escolástica', frente: 'A', relevancia: 3 },
      // FRENTE B — Filosofia Moderna
      { id: 'fil_b1', nome: 'Racionalismo (Descartes)',       frente: 'B', relevancia: 4 },
      { id: 'fil_b2', nome: 'Empirismo (Locke, Hume)',        frente: 'B', relevancia: 4 },
      { id: 'fil_b3', nome: 'Iluminismo',                    frente: 'B', relevancia: 5 },
      { id: 'fil_b4', nome: 'Kant e o Idealismo Alemão',     frente: 'B', relevancia: 4 },
      { id: 'fil_b5', nome: 'Contratualistas (Hobbes, Rousseau, Locke)', frente: 'B', relevancia: 5 },
      // FRENTE C — Filosofia Contemporânea e Ética
      { id: 'fil_c1', nome: 'Marxismo e Alienação',          frente: 'C', relevancia: 5 },
      { id: 'fil_c2', nome: 'Existencialismo',               frente: 'C', relevancia: 4 },
      { id: 'fil_c3', nome: 'Ética e Moral',                 frente: 'C', relevancia: 5 },
      { id: 'fil_c4', nome: 'Política e Cidadania',          frente: 'C', relevancia: 5 },
      { id: 'fil_c5', nome: 'Filosofia da Ciência',          frente: 'C', relevancia: 4 },
    ]
  },

  // ─── SOCIOLOGIA ──────────────────────────────────────────
  {
    id: 'sociologia',
    nome: 'Sociologia',
    emoji: '👥',
    cor: '#06b6d4',
    professor: 'Prof. Ferretto / Humanas',
    assuntos: [
      // FRENTE A — Clássicos da Sociologia
      { id: 'soc_a1', nome: 'Surgimento da Sociologia',      frente: 'A', relevancia: 3 },
      { id: 'soc_a2', nome: 'Auguste Comte — Positivismo',   frente: 'A', relevancia: 3 },
      { id: 'soc_a3', nome: 'Émile Durkheim — Fatos Sociais', frente: 'A', relevancia: 5 },
      { id: 'soc_a4', nome: 'Max Weber — Ação Social',       frente: 'A', relevancia: 5 },
      { id: 'soc_a5', nome: 'Karl Marx — Luta de Classes',   frente: 'A', relevancia: 5 },
      // FRENTE B — Sociedade, Cultura e Identidade
      { id: 'soc_b1', nome: 'Cultura e Diversidade Cultural', frente: 'B', relevancia: 5 },
      { id: 'soc_b2', nome: 'Indústria Cultural e Mass Media', frente: 'B', relevancia: 5 },
      { id: 'soc_b3', nome: 'Socialização e Identidade',     frente: 'B', relevancia: 4 },
      { id: 'soc_b4', nome: 'Gênero e Sexualidade',          frente: 'B', relevancia: 5 },
      { id: 'soc_b5', nome: 'Movimentos Sociais',            frente: 'B', relevancia: 5 },
      { id: 'soc_b6', nome: 'Estratificação e Mobilidade Social', frente: 'B', relevancia: 4 },
      // FRENTE C — Trabalho, Política e Mundo Contemporâneo
      { id: 'soc_c1', nome: 'Trabalho e Capitalismo',        frente: 'C', relevancia: 5 },
      { id: 'soc_c2', nome: 'Estado, Poder e Dominação',     frente: 'C', relevancia: 5 },
      { id: 'soc_c3', nome: 'Democracia e Cidadania',        frente: 'C', relevancia: 5 },
      { id: 'soc_c4', nome: 'Globalização e Desigualdade',   frente: 'C', relevancia: 5 },
      { id: 'soc_c5', nome: 'Questão Racial e Étnica',       frente: 'C', relevancia: 5 },
      { id: 'soc_c6', nome: 'Violência e Controle Social',   frente: 'C', relevancia: 4 },
    ]
  },

  // ─── ARTES ──────────────────────────────────────────────
  {
    id: 'artes',
    nome: 'Artes',
    emoji: '🎨',
    cor: '#ec4899',
    professor: 'Prof. Ferretto / Humanas',
    assuntos: [
      // FRENTE A — Teoria e História da Arte
      { id: 'art_a1', nome: 'Conceitos de Arte e Estética',  frente: 'A', relevancia: 3 },
      { id: 'art_a2', nome: 'Arte na Antiguidade',           frente: 'A', relevancia: 3 },
      { id: 'art_a3', nome: 'Arte Medieval e Renascimento',  frente: 'A', relevancia: 4 },
      { id: 'art_a4', nome: 'Barroco e Neoclassicismo',      frente: 'A', relevancia: 3 },
      // FRENTE B — Arte no Brasil
      { id: 'art_b1', nome: 'Arte Indígena e Pré-Colombiana', frente: 'B', relevancia: 4 },
      { id: 'art_b2', nome: 'Barroco Mineiro (Aleijadinho)', frente: 'B', relevancia: 5 },
      { id: 'art_b3', nome: 'Missão Artística Francesa',     frente: 'B', relevancia: 3 },
      { id: 'art_b4', nome: 'Semana de Arte Moderna (1922)', frente: 'B', relevancia: 5 },
      // FRENTE C — Arte Contemporânea e Movimentos
      { id: 'art_c1', nome: 'Vanguardas Europeias',          frente: 'C', relevancia: 5 },
      { id: 'art_c2', nome: 'Arte Contemporânea Brasileira',  frente: 'C', relevancia: 5 },
      { id: 'art_c3', nome: 'Patrimônio Histórico e Cultural', frente: 'C', relevancia: 5 },
      { id: 'art_c4', nome: 'Linguagens Visuais e Musicais', frente: 'C', relevancia: 4 },
    ]
  },

  // ─── ATUALIDADES ────────────────────────────────────────
  {
    id: 'atualidades',
    nome: 'Atualidades',
    emoji: '📡',
    cor: '#0ea5e9',
    professor: 'Equipe Ferretto',
    assuntos: [
      // FRENTE A — Brasil Contemporâneo
      { id: 'atu_a1', nome: 'Política e Economia Brasileira', frente: 'A', relevancia: 5 },
      { id: 'atu_a2', nome: 'Agronegócio e Terra no Brasil', frente: 'A', relevancia: 4 },
      { id: 'atu_a3', nome: 'Crise Energética e Recursos',   frente: 'A', relevancia: 4 },
      { id: 'atu_a4', nome: 'Direitos Humanos e Minorias',   frente: 'A', relevancia: 5 },
      // FRENTE B — Cenário Internacional
      { id: 'atu_b1', nome: 'Nova Ordem Mundial e BRICS',    frente: 'B', relevancia: 5 },
      { id: 'atu_b2', nome: 'Conflitos no Oriente Médio',    frente: 'B', relevancia: 5 },
      { id: 'atu_b3', nome: 'Guerra na Ucrânia e Geopolítica', frente: 'B', relevancia: 5 },
      { id: 'atu_b4', nome: 'China e a Hegemonia Global',    frente: 'B', relevancia: 4 },
      // FRENTE C — Meio Ambiente e Tecnologia
      { id: 'atu_c1', nome: 'Mudanças Climáticas (COP)',     frente: 'C', relevancia: 5 },
      { id: 'atu_c2', nome: 'Desenvolvimento Sustentável',   frente: 'C', relevancia: 5 },
      { id: 'atu_c3', nome: 'Inteligência Artificial e Futuro', frente: 'C', relevancia: 4 },
      { id: 'atu_c4', nome: 'Cibersegurança e Fake News',    frente: 'C', relevancia: 5 },
    ]
  },

  // ─── ESPANHOL ───────────────────────────────────────────
  {
    id: 'espanhol',
    nome: 'Espanhol',
    emoji: '🇪🇸',
    cor: '#ef4444',
    professor: 'Prof. Ferretto / Linguagens',
    assuntos: [
      // FRENTE A — Vocabulário e Semântica
      { id: 'esp_a1', nome: 'Falsos Cognatos (Falsos Amigos)', frente: 'A', relevancia: 5 },
      { id: 'esp_a2', nome: 'Léxico: Cuerpo, Casa, Ciudad',  frente: 'A', relevancia: 3 },
      { id: 'esp_a3', nome: 'Idiomatismos e Modismos',       frente: 'A', relevancia: 4 },
      // FRENTE B — Gramática Instrumental
      { id: 'esp_b1', nome: 'Artículos y Contracciones',     frente: 'B', relevancia: 4 },
      { id: 'esp_b2', nome: 'Verbos de Cambio y Tiempos',    frente: 'B', relevancia: 3 },
      { id: 'esp_b3', nome: 'Conjunciones y Preposiciones',  frente: 'B', relevancia: 5 },
      // FRENTE C — Interpretação de Texto
      { id: 'esp_c1', nome: 'Estrategias de Lectura',        frente: 'C', relevancia: 5 },
      { id: 'esp_c2', nome: 'Análisis de Géneros (Cómic/Infografía)', frente: 'C', relevancia: 5 },
      { id: 'esp_c3', nome: 'Cultura Hispánica no ENEM',     frente: 'C', relevancia: 5 },
    ]
  },

  // ─── INGLÊS (Interpretação) ─────────────────────────────
  {
    id: 'ingles_interp',
    nome: 'Inglês (Interp.)',
    emoji: '🇺🇸',
    cor: '#3b82f6',
    professor: 'Prof. Ferretto / Linguagens',
    assuntos: [
      // FRENTE A — Vocabulário e Estratégias
      { id: 'ing_a1', nome: 'Skimming & Scanning',           frente: 'A', relevancia: 5 },
      { id: 'ing_a2', nome: 'Cognates and False Friends',    frente: 'A', relevancia: 5 },
      { id: 'ing_a3', nome: 'Contextual Vocabulary',         frente: 'A', relevancia: 4 },
      // FRENTE B — Estruturas Essenciais
      { id: 'ing_b1', nome: 'Linking Words (Connectors)',    frente: 'B', relevancia: 5 },
      { id: 'ing_b2', nome: 'Verb Tenses in Context',        frente: 'B', relevancia: 4 },
      { id: 'ing_b3', nome: 'Modal Verbs and Nuances',       frente: 'B', relevancia: 4 },
      // FRENTE C — Análise de Gêneros
      { id: 'ing_c1', nome: 'News and Articles',             frente: 'C', relevancia: 5 },
      { id: 'ing_c2', nome: 'Lyrics and Poems',              frente: 'C', relevancia: 4 },
      { id: 'ing_c3', nome: 'Ads and Infographics',          frente: 'C', relevancia: 5 },
    ]
  },
];

// ─────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────
const FRENTE_CONFIG = {
  A: { label: 'Frente A', cor: '#10b981', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  B: { label: 'Frente B', cor: '#f59e0b', bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-400'   },
  C: { label: 'Frente C', cor: '#ef4444', bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    text: 'text-rose-400'    },
};

const RELEVANCIA_LABEL = ['', '⭐', '⭐⭐', '⭐⭐⭐', '🔥', '🔥🔥'];

// ─────────────────────────────────────────────────────────────
//  COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────
interface GradeFerrettoProps {
  onAddToCalendar?: (assunto: { nome: string; disciplina: string; frente: string }) => void;
}

export function GradeFerretto({ onAddToCalendar }: GradeFerrettoProps) {
  const [filtroFrente, setFiltroFrente] = useState<'A' | 'B' | 'C' | 'todas'>('todas');
  const [filtroDisciplina, setFiltroDisciplina] = useState<string>('todas');
  const [busca, setBusca] = useState('');
  const [disciplinasExpandidas, setDisciplinasExpandidas] = useState<Set<string>>(new Set(['biologia']));
  const [quadroAdicionado, setQuadroAdicionado] = useState<Set<string>>(new Set());
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const toggleDisciplina = (id: string) => {
    setDisciplinasExpandidas(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const disciplinasFiltradas = useMemo(() => {
    return CURRICULO
      .filter(d => filtroDisciplina === 'todas' || d.id === filtroDisciplina)
      .map(d => ({
        ...d,
        assuntos: d.assuntos.filter(a => {
          const matchFrente = filtroFrente === 'todas' || a.frente === filtroFrente;
          const matchBusca = busca.trim() === '' || a.nome.toLowerCase().includes(busca.toLowerCase());
          return matchFrente && matchBusca;
        })
      }))
      .filter(d => d.assuntos.length > 0);
  }, [filtroFrente, filtroDisciplina, busca]);

  const totalAssuntos = disciplinasFiltradas.reduce((acc, d) => acc + d.assuntos.length, 0);

  function handleAddToCalendar(assunto: Assunto, disc: Disciplina) {
    setQuadroAdicionado(prev => new Set(prev).add(assunto.id));
    onAddToCalendar?.({ nome: assunto.nome, disciplina: disc.nome, frente: assunto.frente });
    setToastMsg(`✅ "${assunto.nome}" adicionado ao planejamento!`);
    setTimeout(() => setToastMsg(null), 3000);
  }

  return (
    <div className="flex flex-col gap-6 mt-8">

      {/* ─── Header ─────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500/30 to-emerald-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-black text-white tracking-tight">
            Grade Ferretto
          </h3>
          <p className="text-xs text-text-secondary font-medium">
            {totalAssuntos} assuntos disponíveis • Clique em + para planejar no Calendário
          </p>
        </div>
      </div>

      {/* ─── Filtros ─────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
        {/* Filtro Frente */}
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest px-1">Frente</span>
          <div className="flex gap-1">
            {(['todas', 'A', 'B', 'C'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFiltroFrente(f)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  filtroFrente === f
                    ? f === 'todas' ? 'bg-white/20 text-white' :
                      f === 'A' ? 'bg-emerald-500 text-white' :
                      f === 'B' ? 'bg-amber-500 text-white' :
                      'bg-rose-500 text-white'
                    : 'bg-white/5 text-text-secondary hover:bg-white/10'
                }`}
              >
                {f === 'todas' ? 'Todas' : `Fr. ${f}`}
              </button>
            ))}
          </div>
        </div>

        {/* Filtro Disciplina */}
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest px-1">Disciplina</span>
          <select
            value={filtroDisciplina}
            onChange={e => setFiltroDisciplina(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs outline-none focus:border-teal-500/50"
          >
            <option value="todas" className="bg-[#0A0C14]">Todas</option>
            {CURRICULO.map(d => (
              <option key={d.id} value={d.id} className="bg-[#0A0C14]">{d.emoji} {d.nome}</option>
            ))}
          </select>
        </div>

        {/* Busca por assunto */}
        <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
          <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest px-1">Buscar Assunto</span>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-text-secondary" />
            <input
              type="text"
              placeholder="Ex: Genética..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-8 py-1.5 text-white text-xs outline-none focus:border-teal-500/50 placeholder:text-text-secondary/50"
            />
            {busca && (
              <button onClick={() => setBusca('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-end gap-2 ml-auto">
          <div className="flex gap-3">
            {(['A', 'B', 'C'] as const).map(f => {
              const count = CURRICULO.reduce((acc, d) => acc + d.assuntos.filter(a => a.frente === f).length, 0);
              const cfg = FRENTE_CONFIG[f];
              return (
                <div key={f} className={`px-3 py-1.5 rounded-xl ${cfg.bg} border ${cfg.border} flex items-center gap-1.5`}>
                  <Layers className={`w-3 h-3 ${cfg.text}`} />
                  <span className={`text-[10px] font-black ${cfg.text}`}>{cfg.label}: {count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Lista de Disciplinas ────────────────────────── */}
      <div className="flex flex-col gap-3">
        {disciplinasFiltradas.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center gap-3 opacity-40">
            <Filter className="w-10 h-10" />
            <p className="text-sm font-black uppercase tracking-widest">Nenhum assunto encontrado</p>
            <p className="text-xs text-text-secondary">Tente ajustar os filtros</p>
          </div>
        ) : (
          disciplinasFiltradas.map(disc => {
            const expanded = disciplinasExpandidas.has(disc.id);
            const porFrente = {
              A: disc.assuntos.filter(a => a.frente === 'A'),
              B: disc.assuntos.filter(a => a.frente === 'B'),
              C: disc.assuntos.filter(a => a.frente === 'C'),
            };

            return (
              <div
                key={disc.id}
                className="rounded-2xl border border-white/5 overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${disc.cor}08, transparent)` }}
              >
                {/* Header da Disciplina */}
                <button
                  onClick={() => toggleDisciplina(disc.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                      style={{ backgroundColor: disc.cor + '20', border: `1px solid ${disc.cor}30` }}
                    >
                      {disc.emoji}
                    </div>
                    <div>
                      <p className="font-black text-white text-sm">{disc.nome}</p>
                      <p className="text-[10px] text-text-secondary">{disc.professor} · {disc.assuntos.length} assuntos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(['A', 'B', 'C'] as const).map(f => {
                      const count = porFrente[f].length;
                      if (!count) return null;
                      const cfg = FRENTE_CONFIG[f];
                      return (
                        <span key={f} className={`text-[9px] font-black px-2 py-0.5 rounded-md ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                          {cfg.label}: {count}
                        </span>
                      );
                    })}
                    {expanded
                      ? <ChevronUp className="w-4 h-4 text-text-secondary ml-1" />
                      : <ChevronDown className="w-4 h-4 text-text-secondary ml-1" />
                    }
                  </div>
                </button>

                {/* Conteúdo Expandido */}
                {expanded && (
                  <div className="px-4 pb-4 flex flex-col gap-4 border-t border-white/5">
                    {(['A', 'B', 'C'] as const).map(frente => {
                      const assuntosFrente = porFrente[frente];
                      if (assuntosFrente.length === 0) return null;
                      const cfg = FRENTE_CONFIG[frente];

                      return (
                        <div key={frente} className="flex flex-col gap-2 pt-4">
                          {/* Header da Frente */}
                          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${cfg.bg} border ${cfg.border}`}>
                            <Layers className={`w-3.5 h-3.5 ${cfg.text}`} />
                            <span className={`text-[11px] font-black ${cfg.text} uppercase tracking-widest`}>
                              {cfg.label} — {assuntosFrente.length} assuntos
                            </span>
                          </div>

                          {/* Grid de Assuntos */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {assuntosFrente.map(assunto => {
                              const adicionado = quadroAdicionado.has(assunto.id);
                              return (
                                <div
                                  key={assunto.id}
                                  className={`flex items-center justify-between p-3 rounded-xl border transition-all group ${
                                    adicionado
                                      ? 'bg-teal-500/10 border-teal-500/30'
                                      : 'bg-white/[0.03] border-white/5 hover:border-white/15 hover:bg-white/5'
                                  }`}
                                >
                                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                    <p className="text-xs font-bold text-white truncate">{assunto.nome}</p>
                                    <p className="text-[9px] text-text-secondary">
                                      {RELEVANCIA_LABEL[assunto.relevancia]} ENEM
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => handleAddToCalendar(assunto, disc)}
                                    disabled={adicionado}
                                    title="Adicionar ao planejamento"
                                    className={`ml-2 w-7 h-7 rounded-lg flex items-center justify-center transition-all shrink-0 ${
                                      adicionado
                                        ? 'bg-teal-500/20 text-teal-400 cursor-default'
                                        : 'bg-white/5 text-text-secondary hover:bg-teal-500/20 hover:text-teal-400 opacity-0 group-hover:opacity-100'
                                    }`}
                                  >
                                    {adicionado
                                      ? <Calendar className="w-3.5 h-3.5" />
                                      : <Plus className="w-3.5 h-3.5" />
                                    }
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ─── Toast ───────────────────────────────────────── */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-300 font-bold text-sm shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-4">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
