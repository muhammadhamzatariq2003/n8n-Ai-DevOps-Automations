#!/usr/bin/env node
// Runs the JavaScript inside every Code node and IF expression against sample data,
// using a tiny mock of n8n's runtime. No dependencies: node tools/test_code_nodes.js
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
const load = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const NAMES = {
  digest: 'ai-automation/inbox-digest/inbox-digest.json',
  slack: 'ai-automation/slack-ask-bot/slack-ask-bot.json',
  classifier: 'ai-automation/text-classifier-api/text-classifier-api.json',
  reviewer: 'ai-automation/pr-code-reviewer/pr-code-reviewer.json',
  prs: 'devops/pr-slack-alerts/pr-slack-alerts.json',
  ci: 'devops/ci-failure-alerts/ci-failure-alerts.json',
  labeler: 'devops/issue-auto-labeler/issue-auto-labeler.json',
  uptime: 'devops/uptime-monitor/uptime-monitor.json',
};
const wf = Object.fromEntries(Object.entries(NAMES).map(([k, v]) => [k, load(v)]));
const node = (key, name) => wf[key].nodes.find((n) => n.name === name);

// Run a Code node. nodes = { 'Node Name': json | [json, ...] } for $('Node Name').
function runCode(key, name, { input, nodes = {}, store = {} }) {
  const n = node(key, name);
  const each = n.parameters.mode === 'runOnceForEachItem';
  const items = (Array.isArray(input) ? input : [input]).map((j) => ({ json: j }));
  const ref = (nm) => {
    const list = [].concat(nodes[nm] || []).map((j) => ({ json: j }));
    return { item: list[0], first: () => list[0], all: () => list };
  };
  const $ = (nm) => ref(nm);
  const $input = each ? { item: items[0] } : { all: () => items, first: () => items[0] };
  const fn = new Function('$input', '$', '$getWorkflowStaticData', n.parameters.jsCode);
  const out = fn($input, $, () => store);
  return each ? out.json : out.map((o) => o.json);
}

// Evaluate an IF node's expression with a mock $json.
function evalIf(key, name, $json) {
  const expr = node(key, name).parameters.conditions.conditions[0].leftValue;
  assert(expr.startsWith('={{') && expr.endsWith('}}'), `${name}: unexpected expression format`);
  return new Function('$json', 'return (' + expr.slice(3, -2).trim() + ');')($json);
}

let passed = 0;
const test = (label, fn) => {
  try { fn(); passed++; console.log('ok   ' + label); }
  catch (e) { console.error('FAIL ' + label + '\n     ' + e.message); process.exitCode = 1; }
};

// 0. every Code node and expression at least compiles
for (const [key, w] of Object.entries(wf)) {
  for (const n of w.nodes.filter((x) => x.type.endsWith('.code'))) {
    test(`syntax: ${key} / ${n.name}`, () => new Function('$input', '$', '$getWorkflowStaticData', n.parameters.jsCode));
  }
}

// 1. inbox digest
const mail = { Subject: 'Quarterly plan', From: 'Boss <boss@corp.com>', To: 'me@corp.com', text: 'Please review the plan. '.repeat(40), deliverTo: 'me', replyToSender: false, minChars: 400, openaiModel: 'gpt-4o-mini' };
test('digest: normal email is summarised and delivered to the recipient', () => {
  const r = runCode('digest', 'Prepare Email', { input: mail });
  assert.strictEqual(r.skip, false);
  assert.strictEqual(r.recipient, 'me@corp.com');
  assert.strictEqual(r.from, 'boss@corp.com');
  assert.strictEqual(r.openaiRequest.model, 'gpt-4o-mini');
  assert(r.openaiRequest.messages[1].content.includes('Quarterly plan'));
});
test('digest: no-reply senders, short mails and our own digests are skipped', () => {
  assert.strictEqual(runCode('digest', 'Prepare Email', { input: { ...mail, From: 'no-reply@shop.com' } }).skip, true);
  assert.strictEqual(runCode('digest', 'Prepare Email', { input: { ...mail, text: 'ok thanks' } }).skip, true);
  assert.strictEqual(runCode('digest', 'Prepare Email', { input: { ...mail, Subject: 'AI Summary: Quarterly plan' } }).skip, true);
});
test('digest: deliverTo and replyToSender options', () => {
  assert.strictEqual(runCode('digest', 'Prepare Email', { input: { ...mail, deliverTo: 'archive@corp.com' } }).recipient, 'archive@corp.com');
  assert.strictEqual(runCode('digest', 'Prepare Email', { input: { ...mail, replyToSender: true } }).recipient, 'boss@corp.com');
});
test('digest: html-only and object-style headers', () => {
  const r = runCode('digest', 'Prepare Email', { input: { subject: 'Hi', from: { text: 'A <a@x.io>' }, to: { value: [{ address: 'me@x.io' }] }, html: '<p>' + 'Hello world. '.repeat(60) + '</p>', minChars: 100 } });
  assert.strictEqual(r.skip, false);
  assert.strictEqual(r.from, 'a@x.io');
  assert.strictEqual(r.recipient, 'me@x.io');
});
test('digest: build digest, with and without AI text', () => {
  const prep = { recipient: 'me@corp.com', subject: 'Plan', from: 'boss@corp.com' };
  const ok = runCode('digest', 'Build Digest', { input: { choices: [{ message: { content: '- a\n- b\n- c' } }] }, nodes: { 'Prepare Email': prep } });
  assert.strictEqual(ok.subject, 'AI Summary: Plan');
  assert(ok.message.startsWith('- a'));
  const empty = runCode('digest', 'Build Digest', { input: {}, nodes: { 'Prepare Email': prep } });
  assert(empty.message.includes('Summary unavailable'));
});
test('digest: worth-summarizing expression', () => {
  assert.strictEqual(evalIf('digest', 'Worth Summarizing?', { skip: false }), true);
  assert.strictEqual(evalIf('digest', 'Worth Summarizing?', { skip: true }), false);
});

// 2. slack ask bot
test('slack: mention is stripped and thread is kept', () => {
  const r = runCode('slack', 'Prepare Prompt', { input: { text: '<@U123ABC> what is DNS?', channel: 'C1', ts: '111.1', thread_ts: '100.0', openaiModel: 'gpt-4o-mini', systemPrompt: 'Be brief' } });
  assert.strictEqual(r.action, 'ask');
  assert.strictEqual(r.question, 'what is DNS?');
  assert.strictEqual(r.threadTs, '100.0');
  assert.strictEqual(r.openaiRequest.messages[0].content, 'Be brief');
});
test('slack: new thread uses message ts; bots are ignored; empty mention gets help', () => {
  assert.strictEqual(runCode('slack', 'Prepare Prompt', { input: { text: 'hi', channel: 'C1', ts: '5.5' } }).threadTs, '5.5');
  assert.strictEqual(runCode('slack', 'Prepare Prompt', { input: { text: 'hi', bot_id: 'B1', channel: 'C1', ts: '1' } }).action, 'ignore');
  assert.strictEqual(runCode('slack', 'Prepare Prompt', { input: { text: '<@U1>', channel: 'C1', ts: '1' } }).action, 'help');
});
test('slack: reply builder', () => {
  const nodes = { 'Prepare Prompt': { action: 'ask', channel: 'C1', threadTs: '1.1' } };
  const ok = runCode('slack', 'Build Reply', { input: { choices: [{ message: { content: ' Paris. ' } }] }, nodes });
  assert.deepStrictEqual(ok, { channel: 'C1', thread_ts: '1.1', text: 'Paris.' });
  assert(runCode('slack', 'Build Reply', { input: {}, nodes }).text.includes("Sorry"));
  assert(runCode('slack', 'Build Reply', { input: {}, nodes: { 'Prepare Prompt': { action: 'help', channel: 'C1', threadTs: '1' } } }).text.includes('Mention me'));
});

// 3. classifier
test('classifier: validation', () => {
  assert.strictEqual(runCode('classifier', 'Validate Input', { input: { body: { text: ' NASA launched. ' }, maxChars: 100 } }).valid, true);
  assert.strictEqual(runCode('classifier', 'Validate Input', { input: { body: {}, maxChars: 100 } }).valid, false);
  assert.strictEqual(runCode('classifier', 'Validate Input', { input: { body: { text: 5 }, maxChars: 100 } }).valid, false);
  const long = runCode('classifier', 'Validate Input', { input: { body: { text: 'x'.repeat(101) }, maxChars: 100 } });
  assert.strictEqual(long.valid, false);
  assert(long.error.includes('too long'));
  assert.strictEqual(long.openaiRequest, null);
  const good = runCode('classifier', 'Validate Input', { input: { body: { text: 'hello' } } });
  assert.strictEqual(good.openaiRequest.response_format.type, 'json_object');
});
test('classifier: parsing is strict about allowed values', () => {
  const run = (content) => runCode('classifier', 'Parse Classification', { input: { choices: [{ message: { content } }] }, nodes: { 'Validate Input': { text: 'hi' } } });
  const good = run('{"topic":"Science","sentiment":"POSITIVE","confidence":0.971,"summary":" NASA launched. "}').data;
  assert.deepStrictEqual(good.classification, { topic: 'science', sentiment: 'positive', confidence: 0.97, summary: 'NASA launched.' });
  assert.strictEqual(good.inputText, 'hi');
  const odd = run('{"topic":"cooking","sentiment":"angry","confidence":7}').data.classification;
  assert.deepStrictEqual([odd.topic, odd.sentiment, odd.confidence], ['other', 'neutral', 1]);
  const junk = run('not json at all');
  assert.strictEqual(junk.success, true);
  assert.strictEqual(junk.data.classification.confidence, 0);
});

// 4. pr reviewer
const prHook = (over = {}) => ({
  headers: { 'x-github-event': 'pull_request' },
  allowedRepos: '', openaiModel: 'gpt-4o', maxDiffChars: 50,
  body: { action: 'opened', repository: { full_name: 'acme/app' }, pull_request: { number: 7, title: 'Fix auth', body: 'Details', draft: false } },
  ...over,
});
test('reviewer: which PR events are reviewed', () => {
  assert.strictEqual(evalIf('reviewer', 'Review This PR?', prHook()), true);
  assert.strictEqual(evalIf('reviewer', 'Review This PR?', prHook({ body: { ...prHook().body, action: 'ready_for_review' } })), true);
  assert.strictEqual(evalIf('reviewer', 'Review This PR?', prHook({ body: { ...prHook().body, action: 'closed' } })), false);
  assert.strictEqual(evalIf('reviewer', 'Review This PR?', prHook({ body: { ...prHook().body, pull_request: { number: 1, draft: true } } })), false);
  assert.strictEqual(evalIf('reviewer', 'Review This PR?', { headers: { 'x-github-event': 'ping' }, body: { zen: 'Keep it logically awesome.' } }), false);
  assert.strictEqual(evalIf('reviewer', 'Review This PR?', prHook({ allowedRepos: 'acme/app, acme/web' })), true);
  assert.strictEqual(evalIf('reviewer', 'Review This PR?', prHook({ allowedRepos: 'other/repo' })), false);
});
test('reviewer: diff truncation and comment building', () => {
  const prep = runCode('reviewer', 'Prepare Review', { input: { data: 'd'.repeat(80) }, nodes: { Settings: prHook() } });
  assert.strictEqual(prep.truncated, true);
  assert(prep.openaiRequest.messages[1].content.includes('Fix auth'));
  assert(prep.openaiRequest.messages[0].content.includes('untrusted'));
  const full = runCode('reviewer', 'Prepare Review', { input: { data: 'tiny diff' }, nodes: { Settings: prHook() } });
  assert.strictEqual(full.truncated, false);
  const c = runCode('reviewer', 'Build Comment', { input: { choices: [{ message: { content: '## Summary\nGood\n\n## Verdict\nAPPROVE' } }] }, nodes: { Settings: prHook(), 'Prepare Review': prep } });
  assert.strictEqual(c.repo, 'acme/app');
  assert.strictEqual(c.number, 7);
  assert(c.body.startsWith('## AI Code Review'));
  assert(c.body.includes('truncated to 50 characters'));
});

// 5. PR slack alerts
const pr = (action, over = {}) => ({
  headers: { 'x-github-event': 'pull_request' }, slackChannel: 'eng', allowedRepos: '',
  body: { action, repository: { full_name: 'acme/app' }, sender: { login: 'carol' },
    pull_request: { html_url: 'https://github.com/acme/app/pull/7', title: 'Fix <b>null</b> & crash', user: { login: 'alice' }, additions: 142, deletions: 38, changed_files: 3, merged: false, base: { ref: 'main' }, ...over } },
});
test('pr alerts: opened', () => {
  const r = runCode('prs', 'Prepare Message', { input: pr('opened') });
  assert.strictEqual(r.send, true);
  assert.strictEqual(r.channel, 'eng');
  assert(r.text.includes('+142 / -38 lines in 3 files'));
  assert(r.text.includes('Fix &lt;b&gt;null&lt;/b&gt; &amp; crash'));
  assert(r.text.includes('By alice in acme/app'));
});
test('pr alerts: merged, closed without merge, other events, repo filter', () => {
  const m = runCode('prs', 'Prepare Message', { input: pr('closed', { merged: true, merged_by: { login: 'bob' } }) });
  assert(m.text.includes('Merged by bob into `main`'));
  assert.strictEqual(runCode('prs', 'Prepare Message', { input: pr('closed') }).send, false);
  assert.strictEqual(runCode('prs', 'Prepare Message', { input: pr('labeled') }).send, false);
  assert.strictEqual(runCode('prs', 'Prepare Message', { input: { ...pr('opened'), headers: { 'x-github-event': 'ping' } } }).send, false);
  assert.strictEqual(runCode('prs', 'Prepare Message', { input: { ...pr('opened'), allowedRepos: 'someone/else' } }).send, false);
  assert.strictEqual(runCode('prs', 'Prepare Message', { input: { headers: {}, body: {} } }).send, false);
});

// 6. CI alerts
const run = (conclusion, over = {}) => ({
  headers: { 'x-github-event': 'workflow_run' }, slackChannel: 'alerts', allowedRepos: '',
  body: { action: 'completed', repository: { full_name: 'acme/app' },
    workflow_run: { name: 'Build and Test', conclusion, head_branch: 'feature/auth', head_sha: 'a3f92bc9d0e1', head_commit: { message: 'Add JWT refresh\n\nlong body' }, triggering_actor: { login: 'alice' }, html_url: 'https://github.com/acme/app/actions/runs/1', run_attempt: 1, ...over } },
});
test('ci alerts: failure, timeout, success and wrong events', () => {
  const f = runCode('ci', 'Prepare Alert', { input: run('failure') });
  assert.strictEqual(f.send, true);
  assert(f.text.includes('`a3f92bc` — Add JWT refresh'));
  assert(f.text.includes('Triggered by:* alice'));
  assert(!f.text.includes('attempt'));
  assert(runCode('ci', 'Prepare Alert', { input: run('timed_out') }).text.includes('timed out'));
  assert(runCode('ci', 'Prepare Alert', { input: run('failure', { run_attempt: 3 }) }).text.includes('attempt 3'));
  assert.strictEqual(runCode('ci', 'Prepare Alert', { input: run('success') }).send, false);
  assert.strictEqual(runCode('ci', 'Prepare Alert', { input: { ...run('failure'), body: { ...run('failure').body, action: 'requested' } } }).send, false);
  assert.strictEqual(runCode('ci', 'Prepare Alert', { input: { ...run('failure'), headers: { 'x-github-event': 'push' } } }).send, false);
});

// 7. issue labeler
const issueHook = (over = {}) => ({
  headers: { 'x-github-event': 'issues' }, allowedRepos: '', openaiModel: 'gpt-4o-mini', addPriorityLabel: false,
  allowedLabels: 'bug, enhancement, security, good first issue',
  body: { action: 'opened', repository: { full_name: 'acme/app' }, issue: { number: 42, title: 'Crash on login', body: 'Special chars break it' } },
  ...over,
});
test('labeler: which issue events are triaged', () => {
  assert.strictEqual(evalIf('labeler', 'Triage This Issue?', issueHook()), true);
  assert.strictEqual(evalIf('labeler', 'Triage This Issue?', issueHook({ body: { ...issueHook().body, action: 'closed' } })), false);
  assert.strictEqual(evalIf('labeler', 'Triage This Issue?', issueHook({ body: { ...issueHook().body, issue: { number: 1, pull_request: {} } } })), false);
  assert.strictEqual(evalIf('labeler', 'Triage This Issue?', { headers: { 'x-github-event': 'ping' }, body: {} }), false);
  assert.strictEqual(evalIf('labeler', 'Triage This Issue?', issueHook({ allowedRepos: 'x/y' })), false);
});
test('labeler: prompt lists only the allowed labels', () => {
  const r = runCode('labeler', 'Prepare Triage Prompt', { input: issueHook() });
  assert(r.openaiRequest.messages[0].content.includes('bug, enhancement, security, good first issue'));
  assert.strictEqual(r.openaiRequest.response_format.type, 'json_object');
});
test('labeler: result parsing', () => {
  const parse = (content, hook) => runCode('labeler', 'Parse Triage Result', { input: { choices: [{ message: { content } }] }, nodes: { Settings: hook || issueHook() } });
  const a = parse('{"labels":["Bug","SECURITY","bug","invented","enhancement","good first issue"],"priority":"High"}');
  assert.deepStrictEqual(a.labels, ['bug', 'security', 'enhancement']);   // allowed only, deduped, max 3
  assert.strictEqual(a.priority, 'high');
  assert.strictEqual(a.hasLabels, true);
  assert.deepStrictEqual([a.repo, a.number], ['acme/app', 42]);
  const p = parse('{"labels":["bug"],"priority":"critical"}', issueHook({ addPriorityLabel: true }));
  assert.deepStrictEqual(p.labels, ['bug', 'priority: critical']);
  const none = parse('{"labels":["nonsense"]}');
  assert.strictEqual(none.hasLabels, false);
  assert.strictEqual(parse('garbage').hasLabels, false);
});

// 8. uptime monitor
const settings = { slackChannel: 'alerts', failuresBeforeAlert: 2, repeatAlertEvery: 3 };
const targets = [{ name: 'API', url: 'https://api.test/health', expectedStatus: 200 }, { name: 'Site', url: 'https://site.test', expectedStatus: 200 }];
const check = (results, store) => runCode('uptime', 'Detect Changes', { input: results, nodes: { Settings: settings, 'Define Targets': targets }, store });
test('uptime: defaults list builds one item per target', () => {
  const out = runCode('uptime', 'Define Targets', { input: {} });
  assert(out.length >= 2);
  assert(out.every((t) => t.name && t.url && t.expectedStatus === 200));
});
test('uptime: alerts after threshold, repeats, then recovers', () => {
  const store = {};
  const up = { statusCode: 200 }, down = { statusCode: 503 };
  assert.strictEqual(check([up, up], store).length, 0);
  assert.strictEqual(check([down, up], store).length, 0);                 // first failure: no alert yet
  const second = check([down, up], store);                                // threshold reached
  assert.strictEqual(second.length, 1);
  assert(second[0].text.includes('API') && second[0].text.includes('HTTP 503'));
  assert.strictEqual(second[0].channel, 'alerts');
  assert.strictEqual(check([down, up], store).length, 0);                 // 3rd: quiet
  assert.strictEqual(check([down, up], store).length, 0);                 // 4th: quiet
  const repeat = check([down, up], store);                                // 5th = threshold + repeatEvery
  assert.strictEqual(repeat.length, 1);
  assert(repeat[0].text.includes('Still down'));
  const recovered = check([up, up], store);
  assert.strictEqual(recovered.length, 1);
  assert(recovered[0].text.includes('Recovered'));
  assert.strictEqual(check([up, up], store).length, 0);
});
test('uptime: timeouts, wrong status and per-target expectations', () => {
  const store = {};
  const err = { error: { message: 'timeout of 10000ms exceeded' } };
  check([err, { statusCode: 200 }], store);
  const out = check([err, { statusCode: 200 }], store);
  assert(out[0].text.includes('timeout of 10000ms exceeded'));
  const custom = [{ name: 'Redirector', url: 'https://r.test', expectedStatus: 301 }];
  const s2 = {};
  const run2 = (r) => runCode('uptime', 'Detect Changes', { input: r, nodes: { Settings: { ...settings, failuresBeforeAlert: 1 }, 'Define Targets': custom }, store: s2 });
  assert.strictEqual(run2([{ statusCode: 301 }]).length, 0);
  assert(run2([{ statusCode: 200 }])[0].text.includes('expected 301'));
});

console.log(`\n${passed} checks passed.`);
