/**
 * Base herdada da reconstrução anterior (commit 42ba516). Em bancos já existentes é
 * inócua: todas as criações são IF NOT EXISTS. Em banco novo, estabelece o ponto de
 * partida sobre o qual as migrações seguintes atuam.
 */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  bussinessName TEXT NOT NULL,
  legalName TEXT NOT NULL,
  email TEXT NOT NULL,
  cnpj TEXT NOT NULL UNIQUE,
  accessDate TEXT NOT NULL,
  size TEXT NOT NULL,
  section TEXT NOT NULL,
  avatar TEXT,
  access INTEGER NOT NULL DEFAULT 1,
  reportAccess INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  deletedAt TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  cpf TEXT,
  avatar TEXT,
  role TEXT NOT NULL,
  jobTitle TEXT,
  companyId TEXT REFERENCES companies(id) ON DELETE SET NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  deletedAt TEXT
);

CREATE TABLE IF NOT EXISTS sectors (
  section TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  avatar TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  section TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  hasMandatory INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS answers (
  id TEXT PRIMARY KEY,
  questionId TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  points INTEGER NOT NULL,
  description TEXT NOT NULL,
  mandatory INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  companyId TEXT NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  initialYear TEXT NOT NULL,
  finalYear TEXT NOT NULL,
  evaluation TEXT,
  structure TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  auditoryStart TEXT,
  auditoryEnd TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS question_reports (
  id TEXT PRIMARY KEY,
  reportId TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  questionId TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'Pending',
  selectedAnswerId TEXT REFERENCES answers(id) ON DELETE SET NULL,
  answererId TEXT REFERENCES users(id) ON DELETE SET NULL,
  answerText TEXT,
  nonApplicable INTEGER NOT NULL DEFAULT 0,
  nonCompliant INTEGER NOT NULL DEFAULT 0,
  redflag TEXT,
  redflag_date TEXT,
  redflagIssuerId TEXT REFERENCES users(id) ON DELETE SET NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  UNIQUE (reportId, questionId)
);

CREATE TABLE IF NOT EXISTS company_files (
  id TEXT PRIMARY KEY,
  companyId TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  fileType TEXT,
  inGed INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS question_report_files (
  id TEXT PRIMARY KEY,
  questionReportId TEXT NOT NULL REFERENCES question_reports(id) ON DELETE CASCADE,
  fileId TEXT NOT NULL REFERENCES company_files(id) ON DELETE CASCADE,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS evidences (
  id TEXT PRIMARY KEY,
  questionReportId TEXT NOT NULL REFERENCES question_reports(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  fileType TEXT,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  mobile TEXT,
  role TEXT,
  department TEXT,
  knowledgeMethod TEXT,
  answers TEXT NOT NULL,
  companyData TEXT NOT NULL,
  address TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_company ON users(companyId);
CREATE INDEX IF NOT EXISTS idx_qr_report ON question_reports(reportId);
CREATE INDEX IF NOT EXISTS idx_questions_section ON questions(section);
`;

module.exports = {
  id: '001_baseline',
  up(db) {
    db.exec(SCHEMA);
  },
};
