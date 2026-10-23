/**
 * Verificação pública da concessão (referência verificável ao ciclo). Sem autenticação e com
 * o mínimo necessário: empresa, rating, escopo, validade e situação — nada de indicadores,
 * pessoas ou documentos.
 */
const db = require('../db');
const { notFound, asyncRouter } = require('../http');

const router = asyncRouter();

router.get('/publication/verify/:code', async (req, res) => {
  const code = String(req.params.code || '').toUpperCase();
  if (!/^ESG-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(code)) throw notFound('código não encontrado');
  const row = await db.one(
    `SELECT p.certificateCode, p.certificateStatus, p.certificateValidFrom, p.certificateValidUntil, p.rating, p.approvedAt,
            r.cycle, r.section, c.bussinessName
       FROM publications p JOIN reports r ON r.id = p.reportId JOIN companies c ON c.id = r.companyId
      WHERE p.certificateCode = ?`,
    code,
  );
  if (!row) throw notFound('código não encontrado');
  const now = new Date();
  res.json({
    code: row.certificateCode,
    company: row.bussinessName,
    scope: `Caderno Geral + Caderno Setorial ${row.section}`,
    cycle: row.cycle,
    rating: row.rating,
    approvedAt: row.approvedAt,
    validFrom: row.certificateValidFrom,
    validUntil: row.certificateValidUntil,
    situation: new Date(row.certificateValidUntil) < now ? 'vencida' : 'vigente',
    document: row.certificateStatus === 'issued' ? 'emitido' : 'concessão registrada; documento aguarda o modelo oficial',
  });
});

module.exports = router;
