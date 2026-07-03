/**
 * EN / BR language switcher.
 *
 * English is the source of truth: it ships authored in the HTML, and on init we
 * cache each [data-i18n] element's innerHTML as the `en` value. Only Portuguese
 * lives in a dictionary here, so the two can never drift out of structure.
 *
 * The terminal-HUD layer stays English by design (coordinates, live clock,
 * SYS.OK, the `// ...` kicker, `[OK]`/`[WARN]` log-level markers) — that's the
 * cybercore texture, not reading content. Everything a recruiter actually reads
 * is translated.
 */

type Lang = 'en' | 'pt';

const TITLE: Record<Lang, string> = {
  en: 'Marcelo Ribeiro Lima — Automation & Integration Developer',
  pt: 'Marcelo Ribeiro Lima — Desenvolvedor de Automação e Integração',
};

/* Portuguese values. HTML is allowed (applied via innerHTML) to preserve
   <strong>, <em>, <br>, and the amber status spans. Keys with no entry fall
   back to the cached English automatically. */
const PT: Record<string, string> = {
  'skip': 'Pular para os projetos',

  'nav.work': 'Projetos',
  'nav.stack': 'Stack',
  'nav.about': 'Sobre',
  'nav.contact': 'Contato',

  'hero.line':
    'Construo sistemas de ponta a ponta com <strong>n8n</strong>, APIs REST e agentes de IA — da orquestração no backend à interface conversacional.',
  'hero.cta1': 'Ver projetos<span aria-hidden="true"> ↓</span>',
  'hero.cta2': 'Me enviar e-mail',

  'work.title': 'Projetos<br />selecionados',
  'work.blurb':
    'Três sistemas, em produção, fazendo trabalho real todo dia. Abra um log para a história completa.',
  'work.meta': '3 REGISTROS · STATUS: <span class="ok">TUDO OK</span>',

  'label.problem': 'PROBLEMA',
  'label.built': 'O QUE CONSTRUÍ',
  'label.outcome': 'RESULTADO',
  'chip.prompt': 'Engenharia de prompt',

  'p1.name': 'Assistente Pessoal de IA no WhatsApp',
  'p1.tag': 'SISTEMA MULTIAGENTE · PONTA A PONTA',
  'p1.problem':
    'Tarefas do dia a dia espalhadas por cinco apps — e-mail, agenda, finanças, notas — cada um exigindo sua própria aba, nenhum conversando com os outros.',
  'p1.built':
    'Um sistema multiagente que vive no WhatsApp: um agente roteador delega a especialistas que leem e escrevem no Gmail, gerenciam o Google Agenda e controlam finanças no Notion. Memória de longo prazo em um banco vetorial Qdrant, busca web ao vivo para contexto atualizado e Whisper para mensagens de voz — tudo orquestrado no n8n, auto-hospedado com Docker.',
  'p1.outcome':
    'Uma única conversa substitui cinco painéis. O assistente lembra do contexto ao longo de semanas e responde em segundos — por texto ou voz.',

  'p2.name': 'Automação Empresarial · Solutudo Brasil',
  'p2.tag': '20+ WORKFLOWS EM PRODUÇÃO · ~6H/DIA ECONOMIZADAS',
  'p2.problem':
    'Times de atendimento e back-office gastando horas todo dia em processos manuais repetitivos e sujeitos a erro.',
  'p2.built':
    'Construí e mantenho mais de 20 workflows n8n em produção para processos internos e de atendimento — integrações de sistemas via APIs REST e SQL, além de engenharia de prompt para contas corporativas B2B.',
  'p2.outcome':
    'Cerca de 6 horas de trabalho manual eliminadas por dia — aproximadamente 4h no atendimento e 2h no back-office — rodando em produção, todos os dias.',

  'p3.name': 'Pulse Sync — CRM com IA',
  'p3.tag': 'TRIAGEM DE LEADS COM LLM · CRM',
  'p3.problem':
    'Leads chegando sem estrutura — cada um lido, classificado e roteado manualmente antes de o time de vendas poder agir.',
  'p3.built':
    'Integração de API de LLM dentro do CRM: os leads que chegam são automaticamente triados, enriquecidos e organizados no momento em que caem.',
  'p3.outcome':
    'Os leads chegam pré-qualificados e ordenados. Sem triagem manual entre o primeiro contato e o follow-up.',

  'stack.note': 'FERRAMENTAS EM SERVIÇO ATIVO · NENHUMA BARRA DE PROGRESSO FOI USADA',
  'stack.g1': 'ORQUESTRAÇÃO',
  'stack.g2': 'LINGUAGENS',
  'stack.g3': 'IA & DADOS',
  'stack.g4': 'INFRA & INTERFACE',

  'about.title': 'Sobre',
  'about.p1':
    'Sou o Marcelo — <em>Cello</em> para a maioria. Passo os dias conectando sistemas: workflows n8n que conversam com APIs REST, agentes de IA que respondem no WhatsApp, bancos de dados que lembram das coisas para os humanos não precisarem. Na Solutudo Brasil isso soma mais de 20 workflows em produção economizando, em silêncio, cerca de seis horas de trabalho manual todo santo dia.',
  'about.p2':
    'Baseado em Botucatu, São Paulo — as coordenadas ali no canto são reais — e aberto a trabalho remoto em inglês (C1, TOEIC 870/990). Gosto dos meus sistemas observáveis, dos meus prompts versionados e das minhas automações entediantes, do jeito que coisas confiáveis são entediantes. No momento, mergulhado em arquiteturas multiagente e no que mais mantiver as máquinas conversando entre si.',

  'facts.location': 'LOCAL',
  'facts.location.v': 'BOTUCATU · SP · BRASIL',
  'facts.tz': 'FUSO',
  'facts.english': 'INGLÊS',
  'facts.mode': 'MODO',
  'facts.mode.v': '<span class="dot"></span> ABERTO A REMOTO',
  'facts.focus': 'FOCO',

  'contact.title': 'Canal aberto',
  'contact.note': 'SEM FORMULÁRIOS. SEM FUNIS. UM E-MAIL.',

  'tick.1': '[OK] 20+ workflows no verde',
  'tick.2': '[OK] ~6h/dia de trabalho manual deletadas',
  'tick.3': '[OK] cafe.service em execução',
  'tick.4': '[WARN] projetos_paralelos: muitos',
  'tick.5': '[OK] memoria vetorial persistida',
  'tick.6': '[INFO] livro de visitas nao encontrado (de proposito)',
  'tick.7': '[OK] ingles.dll carregado — C1',
  'tick.8': '[OK] nenhum cookie foi assado neste site',

  'footer.visitor': 'VOCÊ É O VISITANTE Nº',
  'badge.1': 'MELHOR EM<br />1024×768',
  'badge.2': 'MOVIDO A<br />n8n + CAFÉ',
  'badge.3': 'GRÃO 100%<br />ORGÂNICO',
  'colophon.2': 'FEITO COM VITE + GSAP + THREE.JS · SEM COOKIES · SEM RASTREADORES',
};

const STORE_KEY = 'cello_lang';

export function initI18n(): void {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-i18n]'));
  // cache authored English exactly as written
  const en = new Map<HTMLElement, string>();
  nodes.forEach((el) => en.set(el, el.innerHTML));

  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-lang]'));

  const apply = (lang: Lang): void => {
    // The footer ticker's clones carry data-i18n too (initFooter runs first),
    // so they translate here along with everything else — no special-casing.
    nodes.forEach((el) => {
      const key = el.dataset.i18n ?? '';
      const next = lang === 'pt' ? (PT[key] ?? en.get(el) ?? '') : (en.get(el) ?? '');
      if (el.innerHTML !== next) el.innerHTML = next;
    });

    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
    document.title = TITLE[lang];
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    try { localStorage.setItem(STORE_KEY, lang); } catch { /* private mode */ }
  };

  buttons.forEach((b) => {
    b.addEventListener('click', () => apply((b.dataset.lang as Lang) ?? 'en'));
  });

  let initial: Lang = 'en';
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved === 'pt' || saved === 'en') initial = saved;
    else if (navigator.language.toLowerCase().startsWith('pt')) initial = 'pt';
  } catch { /* ignore */ }
  if (initial === 'pt') apply('pt');
  else buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === 'en')));
}
