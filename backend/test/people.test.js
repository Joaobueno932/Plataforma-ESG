const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer, shutdown } = require('./helpers');
const { png, jpeg, webp, form } = require('./fixtures/images');

/* ------------------------------------------------------------------ testes */

test('pessoas e equipe: foto de perfil, listagens, filtros e isolamento', async (t) => {
  const s = await startServer();
  t.after(s.close);
  t.after(shutdown);
  const admin = await s.loginAdmin();
  const gestor = await s.login('gestor@esgdemo.com.br');
  const funcionario = await s.login('funcionario@esgdemo.com.br');
  const me = (await s.api('GET', '/auth/me', { token: gestor })).body;
  const colega = (await s.api('GET', '/users/getUsers/company', { token: gestor })).body.data.find((u) => u.id !== me.id);
  const fetchStatic = async (stored) => {
    const r = await fetch(`${s.base}/${stored}`);
    return { status: r.status, type: r.headers.get('content-type'), body: Buffer.from(await r.arrayBuffer()) };
  };

  let first;
  await t.test('a própria pessoa envia a foto: PNG validado, metadados removidos, nome gerado pelo servidor', async () => {
    const r = await s.api('POST', `/users/${me.id}/avatar`, { token: gestor, form: form(png(64, 64, { text: 'GPS -20.44 -54.64' }), '../../evil name.png') });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    first = r.body.avatar;
    assert.match(first, /^static\/avatars\/[0-9a-f]{32}\.png$/, 'nome do arquivo não vem do cliente');
    const served = await fetchStatic(first);
    assert.equal(served.status, 200);
    assert.match(served.type, /image\/png/);
    assert.ok(!served.body.includes(Buffer.from('GPS')), 'bloco de texto removido');
    assert.equal((await s.api('GET', '/auth/me', { token: gestor })).body.avatar, first, 'persistida no perfil');
  });

  await t.test('substituir a foto apaga a anterior', async () => {
    const r = await s.api('POST', `/users/${me.id}/avatar`, { token: gestor, form: form(png(128, 96)) });
    assert.equal(r.status, 201);
    assert.notEqual(r.body.avatar, first);
    assert.equal((await fetchStatic(first)).status, 404);
  });

  await t.test('JPEG e WebP: EXIF removido', async () => {
    const j = await s.api('POST', `/users/${me.id}/avatar`, { token: gestor, form: form(jpeg(200, 150, 'SEGREDO-JPEG'), 'f.jpg', 'image/jpeg') });
    assert.equal(j.status, 201, JSON.stringify(j.body));
    assert.match(j.body.avatar, /\.jpg$/);
    const jb = (await fetchStatic(j.body.avatar)).body;
    assert.ok(!jb.includes(Buffer.from('SEGREDO-JPEG')) && !jb.includes(Buffer.from('Exif')));
    assert.ok(jb.includes(Buffer.from('JFIF')), 'APP0 preservado');
    const w = await s.api('POST', `/users/${me.id}/avatar`, { token: gestor, form: form(webp(300, 300, 'SEGREDO-WEBP'), 'f.webp', 'image/webp') });
    assert.equal(w.status, 201, JSON.stringify(w.body));
    const wb = (await fetchStatic(w.body.avatar)).body;
    assert.ok(!wb.includes(Buffer.from('SEGREDO-WEBP')) && !wb.includes(Buffer.from('EXIF')));
    assert.equal(wb.readUInt32LE(4), wb.length - 8, 'tamanho RIFF recalculado');
  });

  await t.test('tipo real, integridade, dimensões e tamanho são validados no servidor', async () => {
    const tenta = (buffer, name, type) => s.api('POST', `/users/${me.id}/avatar`, { token: gestor, form: form(buffer, name, type) });
    assert.equal((await tenta(Buffer.from('<script>alert(1)</script>'), 'x.png', 'image/png')).status, 400, 'extensão/mimetype não bastam');
    assert.equal((await tenta(Buffer.from('GIF89a\x01\x00\x01\x00', 'latin1'), 'x.gif', 'image/gif')).status, 400, 'GIF não aceito');
    assert.equal((await tenta(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), 'x.svg', 'image/svg+xml')).status, 400, 'SVG não aceito');
    const ok = png(64, 64);
    assert.equal((await tenta(ok.subarray(0, ok.length - 20), 'x.png', 'image/png')).status, 400, 'PNG truncado');
    assert.equal((await tenta(png(16, 16), 'x.png', 'image/png')).status, 400, 'pequena demais');
    assert.equal((await tenta(jpeg(5000, 100, 'x'), 'x.jpg', 'image/jpeg')).status, 400, 'grande demais (dimensão)');
    assert.equal((await tenta(Buffer.concat([png(64, 64), Buffer.alloc(3 * 1024 * 1024)]), 'x.png', 'image/png')).status, 413, 'acima de 2 MB');
    assert.equal((await s.api('POST', `/users/${me.id}/avatar`, { token: gestor, body: {} })).status, 400, 'sem arquivo');
  });

  await t.test('foto de outra pessoa: só a Administração altera', async () => {
    assert.equal((await s.api('POST', `/users/${colega.id}/avatar`, { token: gestor, form: form(png(64, 64)) })).status, 403);
    assert.equal((await s.api('DELETE', `/users/${colega.id}/avatar`, { token: gestor })).status, 403);
    assert.equal((await s.api('POST', `/users/${me.id}/avatar`, { token: funcionario, form: form(png(64, 64)) })).status, 403);
    const r = await s.api('POST', `/users/${colega.id}/avatar`, { token: admin, form: form(png(64, 64)) });
    assert.equal(r.status, 201);
    assert.match(r.body.avatar, /^static\/avatars\//);
  });

  await t.test('remover a foto volta às iniciais e apaga o arquivo', async () => {
    const atual = (await s.api('GET', '/auth/me', { token: gestor })).body.avatar;
    const r = await s.api('DELETE', `/users/${me.id}/avatar`, { token: gestor });
    assert.equal(r.status, 200);
    assert.equal(r.body.avatar, null);
    assert.equal((await fetchStatic(atual)).status, 404);
  });

  await t.test('o perfil não aceita URL arbitrária como foto', async () => {
    assert.equal((await s.api('PATCH', `/users/${me.id}`, { token: gestor, body: { avatar: 'https://malicioso.example/x.png' } })).status, 400);
    assert.equal((await s.api('PATCH', `/users/${me.id}`, { token: gestor, body: { avatar: null } })).status, 200, 'remoção continua aceita');
  });

  await t.test('Equipe: data de cadastro e foto vêm na projeção (corrige "undefined NaN, NaN")', async () => {
    const r = await s.api('GET', '/users/getUsers/company', { token: gestor });
    assert.equal(r.status, 200);
    assert.ok(r.body.data.length >= 2);
    for (const u of r.body.data) {
      assert.ok(!Number.isNaN(new Date(u.createdAt).getTime()), `${u.name}: createdAt válido`);
      assert.ok('avatar' in u);
      assert.ok(!('cpf' in u), 'sem dados pessoais acessórios');
    }
    assert.equal(r.body.total, r.body.data.length);
    assert.ok(r.body.data.some((u) => u.id === colega.id && u.avatar), 'foto enviada pela Administração aparece na Equipe');
  });

  await t.test('Equipe: busca por nome, e-mail ou função, filtros e ordenação no servidor', async () => {
    const q = (qs) => s.api('GET', `/users/getUsers/company?${qs}`, { token: gestor }).then((r) => r.body);
    const porNome = await q('q=gestora');
    assert.ok(porNome.data.every((u) => /gestora/i.test(u.name)) && porNome.total >= 1);
    const porFuncao = await q('q=funcion');
    assert.ok(porFuncao.data.length >= 1 && porFuncao.data.every((u) => u.role === 'EMPLOYEE'), 'busca pela função');
    const porEmail = await q('q=auditor%40esgdemo');
    assert.ok(porEmail.data.every((u) => u.email.includes('auditor@esgdemo')));
    assert.ok((await q('role=MANAGER')).data.every((u) => u.role === 'MANAGER'));
    assert.equal((await q('status=INACTIVE')).total, 0);
    assert.equal((await q('created=7d')).total, (await q('')).total, 'cadastros de hoje entram nos últimos 7 dias');
    const nomes = (await q('sort=name&dir=desc')).data.map((u) => u.name);
    assert.deepEqual(nomes, [...nomes].sort((a, b) => b.localeCompare(a, 'pt-BR', { sensitivity: 'base' })));
    const pagina = await q('perPage=2&page=2');
    assert.equal(pagina.page, 2);
    assert.equal(pagina.perPage, 2);
    assert.ok(pagina.data.length <= 2 && pagina.total >= pagina.data.length);
  });

  await t.test('Equipe: isolamento entre empresas no servidor', async () => {
    assert.equal((await s.api('GET', '/users/getUsers/company?companyId=demo-company-b', { token: gestor })).status, 403, 'gestor não vê outra empresa');
    assert.equal((await s.api('GET', '/users/getUsers/company', { token: funcionario })).status, 403, 'funcionário não lista a equipe');
    assert.equal((await s.api('GET', '/users', { token: gestor })).status, 403, 'gestor não acessa Pessoas');
    const outra = (await s.api('GET', '/users/getUsers/company?companyId=demo-company-b', { token: admin })).body.data;
    const daA = (await s.api('GET', '/users/getUsers/company', { token: gestor })).body.data.map((u) => u.id);
    assert.ok(outra.every((u) => u.companyId === 'demo-company-b'));
    assert.ok(!outra.some((u) => u.role === 'MANAGER' && daA.includes(u.id)), 'gestor da empresa A não aparece na B');
  });

  await t.test('Pessoas (Administração): busca, filtros, ordenação e total', async () => {
    const q = (qs) => s.api('GET', `/users?${qs}`, { token: admin }).then((r) => r.body);
    const todos = await q('perPage=100');
    assert.equal(todos.total, todos.data.length);
    assert.ok(todos.data.every((u) => !Number.isNaN(new Date(u.createdAt).getTime())));
    assert.ok((await q('q=supervisor&perPage=100')).data.every((u) => u.role === 'SUPERVISOR' || /supervisor/i.test(u.name + u.email)));
    assert.ok((await q('role=AUDITOR&perPage=100')).data.every((u) => u.role === 'AUDITOR'));
    const nomes = (await q('sort=name&dir=asc&perPage=100')).data.map((u) => u.name);
    assert.deepEqual(nomes, [...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })));
    assert.equal((await q('name=gestora&perPage=100')).total, (await q('q=gestora&perPage=100')).total, '`name` continua aceito');
    // Inativação aparece no filtro de situação.
    assert.equal((await s.api('DELETE', `/users/${colega.id}`, { token: admin })).status, 200);
    const inativos = await q('status=INACTIVE&perPage=100');
    assert.ok(inativos.data.some((u) => u.id === colega.id) && inativos.data.every((u) => u.status === 'INACTIVE'));
  });
});
