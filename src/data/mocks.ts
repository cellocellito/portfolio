// Invented content for the fake-data UI mocks. Nothing here describes the real
// systems: every task, person and number is made up, and the page says so next to the mock.
import type { Locale } from '../i18n';

const kanban = {
  en: {
    board: 'Board',
    user: 'Signed in as Demo User',
    columns: [
      {
        name: 'To do',
        cards: [
          { task: 'Draft the monthly report', who: 'AM' },
          { task: 'Review the supplier list', who: 'JP' },
        ],
      },
      { name: 'Doing', cards: [{ task: 'Update the onboarding checklist', who: 'RS' }] },
      {
        name: 'Done',
        cards: [
          { task: 'Merge duplicate contacts', who: 'LC' },
          { task: 'Book the team meeting room', who: 'AM' },
        ],
      },
    ],
  },
  pt: {
    board: 'Quadro',
    user: 'Logado como Usuário Demo',
    columns: [
      {
        name: 'A fazer',
        cards: [
          { task: 'Rascunhar o relatório do mês', who: 'AM' },
          { task: 'Revisar a lista de fornecedores', who: 'JP' },
        ],
      },
      { name: 'Fazendo', cards: [{ task: 'Atualizar o checklist de integração', who: 'RS' }] },
      {
        name: 'Feito',
        cards: [
          { task: 'Juntar contatos duplicados', who: 'LC' },
          { task: 'Reservar a sala de reunião', who: 'AM' },
        ],
      },
    ],
  },
} as const;

const dashboards = {
  en: { titles: ['Dashboard 1', 'Dashboard 2'], series: 'Fake series' },
  pt: { titles: ['Dashboard 1', 'Dashboard 2'], series: 'Série falsa' },
} as const;

/** Invented values for the dashboard sketch (no units, no labels: they stand for nothing real). */
export const fakeBars = [3, 5, 4, 7, 6, 8, 5, 9, 7, 10, 8, 11];
export const fakeLine = [4, 4.5, 4.2, 5.6, 5.1, 6.4, 6, 7.2, 6.8, 7.9, 7.5, 8.6];

export const mockKanban = (locale: Locale) => kanban[locale];
export const mockDashboards = (locale: Locale) => dashboards[locale];
