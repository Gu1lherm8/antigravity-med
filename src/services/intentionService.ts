import { supabase } from '../lib/supabase';

export interface WeeklyIntention {
  id: string;
  user_id: string;
  subject_id: string;
  topic_id: string;
  week_start: string;
  duration_minutes: number;
  status: 'pending' | 'added';
  created_at: string;
  // Campos join
  subjects?: { name: string; color: string };
  topics?: { name: string; front: string };
}

export const intentionService = {
  async getByWeek(weekStart: string): Promise<WeeklyIntention[]> {
    const { data, error } = await supabase
      .from('weekly_intentions')
      .select(`
        *,
        subjects:subject_id(name, color),
        topics:topic_id(name, front)
      `)
      .eq('week_start', weekStart)
      .eq('status', 'pending');
    
    if (error) throw error;
    return data || [];
  },

  async addIntention(intention: Omit<WeeklyIntention, 'id' | 'user_id' | 'created_at' | 'status'>) {
    const { data, error } = await supabase
      .from('weekly_intentions')
      .insert({ ...intention, status: 'pending' })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteIntention(id: string) {
    const { error } = await supabase
      .from('weekly_intentions')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async markAsAdded(id: string) {
    const { error } = await supabase
      .from('weekly_intentions')
      .update({ status: 'added' })
      .eq('id', id);
    if (error) throw error;
  },

  async markAllAsAdded(weekStart: string) {
    const { error } = await supabase
      .from('weekly_intentions')
      .update({ status: 'added' })
      .eq('week_start', weekStart)
      .eq('status', 'pending');
    if (error) throw error;
  }
};
