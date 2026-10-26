const test = require('node:test');
const assert = require('node:assert/strict');
// `helpers` primeiro: ele aponta a configuração para a base de testes antes de qualquer módulo
// do servidor ser carregado. Carregar `src/db` antes faria o teste usar a base de desenvolvimento.
const { startServer, shutdown } = require('./helpers');
const db = require('../src/db');
const { png, jpeg, form } = require('./fixtures/images');

/**
 * Cadastro e edição de empresa: logo por upload (validado, persistido, sem URL arbitrária),
 * compatibilidade com logos antigas por URL, datas sem deslocamento de fuso e proteção do ciclo
 * já aberto ao trocar o caderno setorial.
 */
test('empresas: logo por upload, edição completa e proteção das avaliações', async (t) => {
  const s = await startServer();
  t.after(s.close);
  t.after(shutdown);
  const admin = await s.loginAdmin();
  const gestor = await s.login('gestor@esgdemo.com.br');
  const consultor = await s.login('consultor@esgdemo.com.br');
  const fetchStatic = async (stored) => {
    const r = await fetch(`${s.base}/${stored}`);
    return { status: r.status, type: r.headers.get('content-type'), body: Buffer.from(await r.arrayBuffer()) };
  };

  let company;
  await t.test('cadastro: dados validados, data sem deslocamento de fuso e URL de logo recusada', async () => {
    const base = { legalName: '  Logo Teste Ltda ', bussinessName: 'Logo Teste', email: 'logo@teste.com', cnpj: '11.444.777/0001-61', accessDate: '2026-03-10', size: 'MEDIA', section: 'A' };
    assert.equal((await s.api('POST', '/companies', { token: admin, body: { ...base, avatar: 'https://externo.example/logo.png' } })).status, 400, 'URL externa não é aceita');
    assert.equal((await s.api('POST', '/companies', { token: admin, body: { ...base, accessDate: '31/02/2026' } })).status, 400, 'data inválida');
    assert.equal((await s.api('POST', '/companies', { token: admin, body: { ...base, cnpj: '11.444.777/0001-62' } })).status, 400, 'dígito verificador do CNPJ');
    assert.equal((await s.api('POST', '/companies', { token: gestor, body: base })).status, 403, 'somente a Administração cadastra');
    const r = await s.api('POST', '/companies', { token: admin, body: base });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    company = r.body;
    assert.equal(company.accessDate, '2026-03-10T00:00:00.000Z', 'o dia informado, em UTC (exibido em UTC na interface)');
    assert.equal(company.legalName, 'Logo Teste Ltda', 'espaços removidos');
    assert.equal(company.avatar, null);
    assert.equal(company.report.section, 'A', 'ciclo criado com Geral + setorial A');
  });

  let first;
  await t.test('envio da logo: conteúdo validado, metadados removidos, nome gerado pelo servidor', async () => {
    const r = await s.api('POST', `/companies/${company.id}/logo`, { token: admin, form: form(png(400, 100, { text: 'interno' }), '../../logo empresa.png') });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    first = r.body.avatar;
    assert.match(first, /^static\/logos\/[0-9a-f]{32}\.png$/);
    const served = await fetchStatic(first);
    assert.equal(served.status, 200);
    assert.match(served.type, /image\/png/);
    assert.ok(!served.body.includes(Buffer.from('interno')));
    const list = await s.api('GET', '/companies?perPage=50', { token: admin });
    assert.equal(list.body.data.find((c) => c.id === company.id).avatar, first, 'listagem traz a logo');
  });

  await t.test('trocar a logo apaga a anterior; até 5 MB é aceito', async () => {
    const big = Buffer.concat([png(800, 200), Buffer.alloc(3 * 1024 * 1024)]); // 3 MB: acima do limite da foto de perfil, dentro do da logo
    const r = await s.api('POST', `/companies/${company.id}/logo`, { token: admin, form: form(big) });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.notEqual(r.body.avatar, first);
    assert.equal((await fetchStatic(first)).status, 404);
    assert.ok((await fetchStatic(r.body.avatar)).body.length < 1024 * 1024, 'bytes após o fim da imagem descartados');
    const j = await s.api('POST', `/companies/${company.id}/logo`, { token: admin, form: form(jpeg(600, 300, 'EXIF-INTERNO'), 'logo.jpg', 'image/jpeg') });
    assert.equal(j.status, 201);
    assert.ok(!(await fetchStatic(j.body.avatar)).body.includes(Buffer.from('EXIF-INTERNO')));
  });

  await t.test('arquivos inválidos são recusados pelo servidor', async () => {
    const tenta = (buffer, name, type) => s.api('POST', `/companies/${company.id}/logo`, { token: admin, form: form(buffer, name, type) });
    assert.equal((await tenta(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), 'logo.svg', 'image/svg+xml')).status, 400, 'SVG não');
    assert.equal((await tenta(Buffer.from('GIF89a\x01\x00\x01\x00', 'latin1'), 'logo.gif', 'image/gif')).status, 400, 'GIF não');
    assert.equal((await tenta(Buffer.from('conteúdo qualquer'), 'logo.png', 'image/png')).status, 400, 'extensão não basta');
    const ok = png(64, 64);
    assert.equal((await tenta(ok.subarray(0, ok.length - 20), 'logo.png', 'image/png')).status, 400, 'truncado');
    assert.equal((await tenta(png(8, 8), 'logo.png', 'image/png')).status, 400, 'pequena demais');
    assert.equal((await tenta(Buffer.concat([png(64, 64), Buffer.alloc(6 * 1024 * 1024)]), 'logo.png', 'image/png')).status, 413, 'acima de 5 MB');
  });

  await t.test('somente a Administração altera a logo', async () => {
    assert.equal((await s.api('POST', `/companies/${company.id}/logo`, { token: gestor, form: form(png(64, 64)) })).status, 403);
    assert.equal((await s.api('POST', `/companies/demo-company-a/logo`, { token: consultor, form: form(png(64, 64)) })).status, 403);
    assert.equal((await s.api('DELETE', `/companies/demo-company-a/logo`, { token: gestor })).status, 403);
    assert.equal((await s.api('PATCH', `/companies/demo-company-a`, { token: gestor, body: { bussinessName: 'x' } })).status, 403, 'edição cadastral também');
  });

  await t.test('remover a logo volta ao fallback e apaga o arquivo', async () => {
    const atual = (await s.api('GET', `/companies/${company.id}`, { token: admin })).body.avatar;
    const r = await s.api('DELETE', `/companies/${company.id}/logo`, { token: admin });
    assert.equal(r.status, 200);
    assert.equal(r.body.avatar, null);
    assert.equal((await fetchStatic(atual)).status, 404);
  });

  await t.test('logo antiga por URL: preservada nas edições, substituível e removível sem tocar o endereço externo', async () => {
    const legacy = 'https://cdn.legado.example/logos/empresa-b.png';
    await db.run('UPDATE companies SET avatar = ? WHERE id = ?', legacy, 'demo-company-b');
    const edit = await s.api('PATCH', '/companies/demo-company-b', { token: admin, body: { bussinessName: 'Indústria Exemplo Editada', avatar: legacy } });
    assert.equal(edit.status, 200);
    assert.equal(edit.body.avatar, legacy, 'URL antiga preservada ao editar outros campos');
    const outra = await s.api('PATCH', '/companies/demo-company-b', { token: admin, body: { avatar: 'https://outra.example/x.png' } });
    assert.equal(outra.status, 400, 'não se troca por outra URL');
    const up = await s.api('POST', '/companies/demo-company-b/logo', { token: admin, form: form(png(200, 80)) });
    assert.equal(up.status, 201);
    assert.match(up.body.avatar, /^static\/logos\//);
    await db.run('UPDATE companies SET avatar = ? WHERE id = ?', legacy, 'demo-company-b');
    assert.equal((await s.api('DELETE', '/companies/demo-company-b/logo', { token: admin })).body.avatar, null);
  });

  await t.test('edição completa preservando dados e avaliações', async () => {
    assert.equal((await s.api('PATCH', `/companies/${company.id}`, { token: admin, body: { legalName: '   ' } })).status, 400, 'razão social não pode ficar vazia');
    assert.equal((await s.api('PATCH', `/companies/${company.id}`, { token: admin, body: { cnpj: '44.555.666/0001-81' } })).status, 409, 'CNPJ de outra empresa');
    const antes = (await s.api('GET', `/reports/company/questions/${company.report.id}`, { token: admin })).body.map((i) => i.id).sort();
    const r = await s.api('PATCH', `/companies/${company.id}`, {
      token: admin,
      body: { legalName: 'Logo Teste Editada Ltda', email: 'novo@teste.com', accessDate: '2026-04-01', size: 'GRANDE', section: 'B' },
    });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.legalName, 'Logo Teste Editada Ltda');
    assert.equal(r.body.email, 'novo@teste.com');
    assert.equal(r.body.accessDate, '2026-04-01T00:00:00.000Z');
    assert.equal(r.body.size, 'GRANDE');
    assert.equal(r.body.section, 'B', 'próxima avaliação usa o caderno B');
    assert.equal(r.body.report.section, 'A', 'o ciclo aberto mantém o caderno A');
    const depois = (await s.api('GET', `/reports/company/questions/${company.report.id}`, { token: admin })).body.map((i) => i.id).sort();
    assert.deepEqual(depois, antes, 'nenhum indicador do ciclo aberto é removido ou trocado');
    assert.equal(r.body.id, company.id, 'identificador não muda');
  });
});
