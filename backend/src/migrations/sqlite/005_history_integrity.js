/**
 * Integridade do histórico de avaliação e delegação por indicador.
 *
 * Também **não é aditiva**: as cascatas herdadas apagavam avaliação por edição administrativa
 * (diagnóstico A15 — excluir um indicador removia em cascata os itens de relatório, e excluir
 * uma alternativa anulava a resposta escolhida). As tabelas são reconstruídas trocando
 * `ON DELETE CASCADE`/`SET NULL` por `RESTRICT` nos caminhos que carregam histórico; as rotas
 * passam a recusar a exclusão com mensagem própria em vez de apagar em silêncio.
 *
 * `question_reports` recebe a delegação do gestor: responsável, quem atribuiu, quando e prazo.
 */
const CREATE_QUESTION_REPORTS = `
CREATE TABLE question_reports (
  id TEXT PRIMARY KEY,
  reportId TEXT NOT NULL REFERENCES reports(id) ON DELETE RESTRICT,
  questionId TEXT NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'Pending',
  selectedAnswerId TEXT REFERENCES answers(id) ON DELETE RESTRICT,
  answererId TEXT REFERENCES users(id) ON DELETE RESTRICT,
  assignedById TEXT REFERENCES users(id) ON DELETE RESTRICT,
  assignedAt TEXT,
  dueDate TEXT,
  answeredById TEXT REFERENCES users(id) ON DELETE RESTRICT,
  answeredByRole TEXT,
  answeredAt TEXT,
  answerText TEXT,
  nonApplicable INTEGER NOT NULL DEFAULT 0,
  nonCompliant INTEGER NOT NULL DEFAULT 0,
  redflag TEXT,
  redflag_date TEXT,
  redflagIssuerId TEXT REFERENCES users(id) ON DELETE RESTRICT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  UNIQUE (reportId, questionId)
)`;

const CREATE_ANSWERS = `
CREATE TABLE answers (
  id TEXT PRIMARY KEY,
  questionId TEXT NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  points INTEGER NOT NULL,
  description TEXT NOT NULL,
  mandatory INTEGER NOT NULL DEFAULT 0
)`;

const CREATE_QR_FILES = `
CREATE TABLE question_report_files (
  id TEXT PRIMARY KEY,
  questionReportId TEXT NOT NULL REFERENCES question_reports(id) ON DELETE RESTRICT,
  fileId TEXT NOT NULL REFERENCES company_files(id) ON DELETE RESTRICT,
  addedById TEXT REFERENCES users(id) ON DELETE RESTRICT,
  addedByRole TEXT,
  createdAt TEXT NOT NULL
)`;

const CREATE_EVIDENCES = `
CREATE TABLE evidences (
  id TEXT PRIMARY KEY,
  questionReportId TEXT NOT NULL REFERENCES question_reports(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  fileType TEXT,
  addedById TEXT REFERENCES users(id) ON DELETE RESTRICT,
  addedByRole TEXT,
  createdAt TEXT NOT NULL
)`;

module.exports = {
  id: '005_history_integrity',
  rebuildsTables: true,
  up(db, { rebuild, columns }) {
    const copy = (table) => columns(db, table).join(', ');

    rebuild(db, 'question_reports', CREATE_QUESTION_REPORTS, {
      copy: copy('question_reports'),
      indexes: [
        'CREATE INDEX IF NOT EXISTS idx_qr_report ON question_reports(reportId)',
        'CREATE INDEX IF NOT EXISTS idx_qr_question ON question_reports(questionId)',
        'CREATE INDEX IF NOT EXISTS idx_qr_answerer ON question_reports(answererId)',
      ],
    });
    rebuild(db, 'answers', CREATE_ANSWERS, {
      copy: copy('answers'),
      indexes: ['CREATE INDEX IF NOT EXISTS idx_answers_question ON answers(questionId)'],
    });
    rebuild(db, 'question_report_files', CREATE_QR_FILES, {
      copy: copy('question_report_files'),
      indexes: [
        'CREATE INDEX IF NOT EXISTS idx_qrf_item ON question_report_files(questionReportId)',
        'CREATE INDEX IF NOT EXISTS idx_qrf_file ON question_report_files(fileId)',
      ],
    });
    rebuild(db, 'evidences', CREATE_EVIDENCES, {
      copy: copy('evidences'),
      indexes: ['CREATE INDEX IF NOT EXISTS idx_evidences_item ON evidences(questionReportId)'],
    });

    // Autoria conhecida do que já existia: quem respondeu é o responsável registrado.
    db.exec(`
      UPDATE question_reports
         SET answeredById = answererId,
             answeredAt = COALESCE(answeredAt, updatedAt)
       WHERE selectedAnswerId IS NOT NULL AND answeredById IS NULL AND answererId IS NOT NULL
    `);
  },
};
