import { AnalyticsPeriod } from './PeriodSelector';

export interface ActivityItem {
  id: string;
  type: 'student' | 'fee' | 'attendance' | 'notice' | 'certificate' | 'admission' | 'exam' | 'default';
  message: string;
  timestamp: string;
}

export interface AttentionItem {
  id: string;
  type: 'fee' | 'admission' | 'attendance' | 'event' | 'query' | 'alert';
  title: string;
  subtitle: string;
  action?: string;
  link?: string;
}

export interface ResumeContext {
  title: string;
  subtitle: string;
  link: string;
}

export { AnalyticsPeriod };
