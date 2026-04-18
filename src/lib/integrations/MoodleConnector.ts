// ==========================================
// lib/integrations/MoodleConnector.ts
// Conector para Moodle Web Services REST API
// GRATUITO — funciona com qualquer Moodle autohospedado
// Documentação: https://docs.moodle.org/dev/Web_service_API_functions
// ==========================================

export interface MoodleCourse {
  id: number;
  shortname: string;
  fullname: string;
  displayname: string;
}

export interface MoodleActivity {
  id: number;
  name: string;
  modname: string;           // 'quiz', 'assign', 'url', 'page', 'label'
  completion: number;        // 0 = não feito, 1 = feito, 2 = feito e aprovado
  completiondata?: {
    state: number;
    timecompleted: number;
    overrideby: number | null;
    hascompletion: boolean;
  };
}

export interface MoodleQuizAttempt {
  id: number;
  quiz: number;
  userid: number;
  sumgrades: number | null;
  state: 'finished' | 'inprogress';
  timefinish: number;
}

export interface MoodleGrade {
  itemname: string;
  graderaw: number | null;
  grademax: number;
  gradedategraded: number | null;
}

export interface SyncResult {
  courses: MoodleCourse[];
  activities: NormalizedActivity[];
  errors: string[];
}

export interface NormalizedActivity {
  externalId: string;
  title: string;
  type: 'video_lesson' | 'quiz' | 'assignment' | 'pdf';
  completed: boolean;
  score?: number;
  maxScore?: number;
  completedAt?: string;
  rawCourseName: string;
  // Nome parseado para buscar no banco
  parsedTopicName: string;
}

export class MoodleConnector {
  private baseUrl: string;
  private token: string;

  constructor(moodleUrl: string, token: string) {
    // Garante que a URL não tenha barra no final
    this.baseUrl = moodleUrl.replace(/\/+$/, '');
    this.token = token;
  }

  /**
   * Chama a REST API do Moodle (endpoint padrão de todos os Moodles)
   */
  private async call<T>(wsfunction: string, params: Record<string, string | number> = {}): Promise<T> {
    const urlParams = new URLSearchParams({
      wstoken: this.token,
      wsfunction,
      moodlewsrestformat: 'json',
      ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    });

    const url = `${this.baseUrl}/webservice/rest/server.php?${urlParams}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Moodle HTTP erro: ${response.status} em ${wsfunction}`);
    }

    const data = await response.json();

    // Moodle retorna um campo "exception" em caso de erro
    if (data && data.exception) {
      throw new Error(`Moodle API erro: ${data.message} (${data.errorcode})`);
    }

    return data as T;
  }

  /**
   * Valida se as credenciais estão corretas.
   * Chama core_webservice_get_site_info, que retorna info básica do Moodle.
   */
  async testConnection(): Promise<{ ok: boolean; sitename?: string; error?: string }> {
    try {
      const info = await this.call<{ sitename: string }>('core_webservice_get_site_info');
      return { ok: true, sitename: info.sitename };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  /**
   * Busca todos os cursos em que o usuário está matriculado.
   */
  async getEnrolledCourses(userId: number): Promise<MoodleCourse[]> {
    return this.call<MoodleCourse[]>('core_enrol_get_users_courses', { userid: userId });
  }

  /**
   * Busca o ID do usuário atual pelo token.
   * O campo `userid` vem no core_webservice_get_site_info.
   */
  async getCurrentUserId(): Promise<number> {
    const info = await this.call<{ userid: number }>('core_webservice_get_site_info');
    return info.userid;
  }

  /**
   * Busca as atividades de um curso (módulos) com status de conclusão.
   */
  async getCourseActivities(courseId: number): Promise<MoodleActivity[]> {
    const data = await this.call<{ sections: { modules: MoodleActivity[] }[] }>(
      'core_course_get_contents',
      { courseid: courseId }
    );
    return data.sections?.flatMap(s => s.modules) ?? [];
  }

  /**
   * Busca as notas do usuário em um curso.
   */
  async getCourseGrades(courseId: number, userId: number): Promise<MoodleGrade[]> {
    const data = await this.call<{ usergrades: { gradeitems: MoodleGrade[] }[] }>(
      'gradereport_user_get_grades_table',
      { courseid: courseId, userid: userId }
    );
    return data.usergrades?.[0]?.gradeitems ?? [];
  }

  /**
   * 🌟 PONTO DE ENTRADA PRINCIPAL
   * Faz a sincronização completa: cursos → atividades → notas.
   * Retorna uma lista de atividades normalizadas, prontas para salvar no Supabase.
   */
  async syncAll(): Promise<SyncResult> {
    const result: SyncResult = { courses: [], activities: [], errors: [] };

    try {
      const userId = await this.getCurrentUserId();
      result.courses = await this.getEnrolledCourses(userId);

      for (const course of result.courses) {
        try {
          const activities = await this.getCourseActivities(course.id);
          const grades = await this.getCourseGrades(course.id, userId);

          // Mapeia notas por nome de atividade
          const gradeMap = new Map<string, MoodleGrade>();
          grades.forEach(g => gradeMap.set(g.itemname, g));

          for (const act of activities) {
            if (!act.completiondata?.hascompletion) continue;

            const grade = gradeMap.get(act.name);
            const completed = act.completiondata.state >= 1;
            const completedAt = act.completiondata.timecompleted
              ? new Date(act.completiondata.timecompleted * 1000).toISOString()
              : undefined;

            result.activities.push({
              externalId: `moodle-${course.id}-${act.id}`,
              title: act.name,
              type: MoodleConnector.mapActivityType(act.modname),
              completed,
              score: grade?.graderaw ?? undefined,
              maxScore: grade?.grademax ?? undefined,
              completedAt,
              rawCourseName: course.fullname,
              parsedTopicName: MoodleConnector.parseTopicName(act.name, course.fullname),
            });
          }
        } catch (courseErr: any) {
          result.errors.push(`Erro no curso "${course.fullname}": ${courseErr.message}`);
        }
      }
    } catch (err: any) {
      result.errors.push(`Erro na sincronização geral: ${err.message}`);
    }

    return result;
  }

  /**
   * Mapeia tipos de atividade do Moodle para o formato do sistema.
   */
  private static mapActivityType(modname: string): NormalizedActivity['type'] {
    const map: Record<string, NormalizedActivity['type']> = {
      quiz: 'quiz',
      assign: 'assignment',
      resource: 'pdf',
      url: 'video_lesson',
      page: 'video_lesson',
      label: 'video_lesson',
    };
    return map[modname] ?? 'video_lesson';
  }

  /**
   * Extrai o nome do tópico do nome da atividade no Moodle.
   * 
   * Padrão esperado: "Bio - Aula 02 - Meiose e Gametogênese"
   * O sistema tenta extrair "Meiose" e "Gametogênese" para buscar no banco.
   * 
   * Fallback: retorna o título completo se não conseguir parsear.
   */
  static parseTopicName(activityName: string, courseName: string): string {
    // Remove prefixos comuns como "Bio - Aula 02 - " ou "Aula 1:"
    const cleaned = activityName
      .replace(/^(aula|lesson|módulo|modulo|bio|mat|fís|física|quim|quím|hist|geo|port|redação)\s*[\-:]\s*aula\s*\d+\s*[\-:]\s*/i, '')
      .replace(/^aula\s*\d+\s*[\-:]\s*/i, '')
      .replace(/^[\d]+\s*[\-\.]\s*/i, '')
      .trim();

    return cleaned || activityName;
  }
}
