// Identity, skills and timeline, in English and Portuguese.
import type { Locale } from '../i18n';

const shared = {
  name: 'Marcelo Ribeiro Lima',
  nickname: 'Cello',
  email: 'cello.official04@gmail.com',
  links: {
    github: 'https://github.com/cellocellito',
    // same URL as on the CVs
    linkedin: 'https://www.linkedin.com/in/marcelo-ribeiro-lima',
  },
  english: 'TOEIC 870/990 (Gold)',
  // 4.5: honest levels, no bars, no percentages. Never list a tool not used in real work.
  skills: {
    strong: ['n8n', 'LLM integrations (OpenAI, Gemini)', 'Agents', 'RAG with Qdrant', 'REST APIs', 'Webhooks', 'Evolution API / Meta APIs'],
    solid: ['React', 'Front-end', 'Supabase / PostgreSQL', 'SQL', 'Redis', 'Docker', 'Git', 'Vercel'],
    learning: ['Python'],
  },
} as const;

const byLocale = {
  en: {
    location: 'Botucatu, São Paulo, Brazil',
    remote: 'Open to remote',
    degree: 'Systems Analysis and Development (ADS), FATEC Botucatu, 2026',
    cv: '/cv/cv-en.pdf',
    bio: [
      'My name is Marcelo, but most people call me Cello. I live in Botucatu, São Paulo, and I studied Systems Analysis and Development (ADS) at FATEC Botucatu, class of 2026.',
      'From January to June 2026 I worked as an automation developer at Solutudo Brasil. I built more than 20 n8n workflows that ran in production and took about 4 hours a day of manual work off customer service and 2 off the back office.',
      'Before that, in January and February 2025, I was an IT intern at Onmai, where I built two React dashboards the whole team used.',
    ],
    // a personal line after the bio; approved: false keeps it off the page
    personal: {
      approved: true,
      text: "I've listened to drum & bass and breakcore since I was a kid, EDM too, and I want to start mixing. I also play guitar. The gothic / cybercore look of this site is the same one behind Void Born.",
    },
    timeline: [
      { when: 'Since Aug 2025', what: 'Automation Developer (Self-employed)', where: 'Pulse Sync' },
      { when: 'Jan–Jun 2026', what: 'Automation Developer', where: 'Solutudo Brasil, Botucatu' },
      { when: '2026', what: 'Systems Analysis and Development (ADS)', where: 'FATEC Botucatu' },
      { when: 'Jan–Feb 2025', what: 'IT Intern', where: 'Onmai, Botucatu' },
    ],
    skillsShared: shared.skills,
  },
  pt: {
    location: 'Botucatu, São Paulo, Brasil',
    remote: 'Aberto a trabalho remoto',
    degree: 'Análise e Desenvolvimento de Sistemas (ADS), FATEC Botucatu, 2026',
    cv: '/cv/cv-pt.pdf',
    bio: [
      'Meu nome é Marcelo, mas quase todo mundo me chama de Cello. Moro em Botucatu, São Paulo, e estudei Análise e Desenvolvimento de Sistemas (ADS) na FATEC Botucatu, turma de 2026.',
      'De janeiro a junho de 2026 trabalhei como desenvolvedor de automação na Solutudo Brasil. Construí mais de 20 workflows n8n que rodaram em produção e tiraram cerca de 4 horas por dia de trabalho manual do atendimento e 2 do back-office.',
      'Antes disso, em janeiro e fevereiro de 2025, fui estagiário de TI na Onmai, onde construí dois dashboards em React que o time inteiro usava.',
    ],
    personal: {
      approved: true,
      text: 'Escuto drum & bass e breakcore desde criança, EDM também, e quero começar a mixar. Também toco guitarra. A estética gótica / cybercore deste site é a mesma que está por trás da Void Born.',
    },
    timeline: [
      { when: 'Desde ago. de 2025', what: 'Desenvolvedor de Automação (autônomo)', where: 'Pulse Sync' },
      { when: 'jan.–jun. de 2026', what: 'Desenvolvedor de Automação', where: 'Solutudo Brasil, Botucatu' },
      { when: '2026', what: 'Análise e Desenvolvimento de Sistemas (ADS)', where: 'FATEC Botucatu' },
      { when: 'jan.–fev. de 2025', what: 'Estagiário de TI', where: 'Onmai, Botucatu' },
    ],
    skillsShared: {
      strong: [
        'n8n',
        'Integrações com LLMs (OpenAI, Gemini)',
        'Agentes',
        'RAG com Qdrant',
        'APIs REST',
        'Webhooks',
        'Evolution API / APIs da Meta',
      ],
      solid: ['React', 'Front-end', 'Supabase / PostgreSQL', 'SQL', 'Redis', 'Docker', 'Git', 'Vercel'],
      learning: ['Python'],
    },
  },
} as const;

export function profile(locale: Locale) {
  const l = byLocale[locale];
  return { ...shared, ...l, skills: l.skillsShared };
}
