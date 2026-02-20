// ===== Constants =====
const CATS = [
    { id: 'food', name: '食費', icon: '🍙', color: '#FF6B6B' },
    { id: 'daily', name: '日用品', icon: '🧴', color: '#FF9F43' },
    { id: 'transport', name: '交通', icon: '🚃', color: '#54A0FF' },
    { id: 'entertainment', name: '娯楽', icon: '🎮', color: '#A29BFE' },
    { id: 'medical', name: '医療', icon: '💊', color: '#00D2D3' },
    { id: 'other', name: 'その他', icon: '📦', color: '#C8D6E5' }
];
const SK = 'pochacco_kakeibo', AK = 'pochacco_apikey', BK = 'pochacco_budget';

// ===== State =====
let data = load(), curYear, curMonth, selCat = 'food', editId = null, editCatSel = 'food', receiptImg = null;
let pieChart = null, barChart = null, confirmCb = null, filterCat = 'all';
const now = new Date(); curYear = now.getFullYear(); curMonth = now.getMonth();

// ===== Data =====
function load() { try { return JSON.parse(localStorage.getItem(SK)) || [] } catch { return [] } }
function save() { localStorage.setItem(SK, JSON.stringify(data)) }
function gid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }
function getMonth(y, m) { return data.filter(e => { const d = new Date(e.date); return d.getFullYear() === y && d.getMonth() === m }).sort((a, b) => b.date.localeCompare(a.date)) }
function fmtDate(d) { const dt = new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}` }
function today() { return fmtDate(new Date()) }
function catOf(id) { return CATS.find(c => c.id === id) || CATS[5] }
function esc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML }

// ===== Navigation =====
function go(p) {
    document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
    document.getElementById('page-' + p).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => { b.classList.toggle('active', b.dataset.p === p) });
    if (p === 'home') renderHome();
    if (p === 'history') renderHistory();
    if (p === 'analysis') renderAnalysis();
    if (p === 'settings') loadSettings();
}
document.querySelectorAll('.nav-btn').forEach(b => b.addEventListener('click', () => go(b.dataset.p)));

// ===== Month =====
function changeMonth(d) { curMonth += d; if (curMonth < 0) { curMonth = 11; curYear-- } if (curMonth > 11) { curMonth = 0; curYear++ } render() }
function mlText() { return `${curYear}年 ${curMonth + 1}月` }

// ===== Pochacco Messages =====
function pochaMsg() {
    const h = new Date().getHours();
    const items = getMonth(curYear, curMonth);
    const total = items.reduce((s, e) => s + e.amount, 0);
    const budget = parseInt(localStorage.getItem(BK)) || 0;
    if (budget > 0 && total > budget) return '今月はちょっと使いすぎかも…💦\n節約がんばろう！';
    if (items.length === 0) return 'まだ記録がないよ！\nレシートを撮影してみよう📸';
    if (h < 11) return 'おはよう！☀️\n今日もいっしょにがんばろう！';
    if (h < 17) return 'こんにちは！🌤️\nお買い物してきた？';
    return 'おつかれさま！🌙\n今日の記録を確認しよう！';
}

// ===== Render Home =====
function renderHome() {
    document.getElementById('ml').textContent = mlText();
    document.getElementById('pochacco-msg').textContent = pochaMsg();
    const items = getMonth(curYear, curMonth);
    const total = items.reduce((s, e) => s + e.amount, 0);
    const budget = parseInt(localStorage.getItem(BK)) || 0;
    const todayItems = items.filter(e => e.date === today());
    const todayTotal = todayItems.reduce((s, e) => s + e.amount, 0);

    let html = `<div class="card card-main"><div class="card-label">今月の合計</div><div class="card-amount">¥${total.toLocaleString()}</div>`;
    if (budget > 0) {
        const pct = Math.min(100, Math.round(total / budget * 100));
        const col = pct > 90 ? '#FF6B6B' : pct > 70 ? '#FFB347' : '#fff';
        html += `<div class="card-budget">残り ¥${Math.max(0, budget - total).toLocaleString()} <div class="budget-bar"><div class="budget-fill" style="width:${pct}%;background:${col}"></div></div> ${pct}%</div>`;
    }
    html += `</div><div class="card-row"><div class="card"><div class="card-label">📅 今日の支出</div><div class="card-amount">¥${todayTotal.toLocaleString()}</div></div><div class="card"><div class="card-label">📋 今月の件数</div><div class="card-amount">${items.length}件</div></div></div>`;
    document.getElementById('sum-cards').innerHTML = html;

    // Category bars
    const catTotals = {}; items.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount });
    const cs = document.getElementById('cat-section');
    if (total === 0) { cs.style.display = 'none' }
    else {
        cs.style.display = '';
        const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
        let bh = ''; sorted.forEach(([id, amt]) => {
            const c = catOf(id), pct = Math.round(amt / total * 100);
            bh += `<div class="cat-row"><div class="cat-icon" style="background:${c.color}18">${c.icon}</div><div class="cat-info"><div class="cat-name">${c.name}（${pct}%）</div><div class="cat-bar-bg"><div class="cat-bar-fill" style="width:${pct}%;background:${c.color}"></div></div></div><div class="cat-amt" style="color:${c.color}">¥${amt.toLocaleString()}</div></div>`;
        });
        document.getElementById('cat-bars').innerHTML = bh;
    }

    // Recent
    const recent = items.slice(0, 5);
    if (recent.length === 0) {
        document.getElementById('recent-list').innerHTML = '<div class="empty"><div class="emoji">📝</div><p>まだ記録がありません<br>撮影ボタンから始めよう！</p></div>';
    } else {
        let lh = ''; recent.forEach(e => {
            const c = catOf(e.category), d = new Date(e.date);
            lh += `<div class="exp-item" onclick="openEdit('${e.id}')"><div class="exp-icon" style="background:${c.color}18">${c.icon}</div><div class="exp-detail"><div class="exp-store">${esc(e.store)}</div><div class="exp-meta">${d.getMonth() + 1}/${d.getDate()} ・ ${c.name}</div></div><div class="exp-amount">-¥${e.amount.toLocaleString()}</div></div>`;
        });
        document.getElementById('recent-list').innerHTML = lh;
    }
}

// ===== Camera & OCR =====
function handleFile(file) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast('⚠️ 10MB以下の画像を選んでね', '#FFB347'); return }
    const reader = new FileReader();
    reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let w = img.width, h = img.height; const max = 1200;
            if (w > max || h > max) { if (w > h) { h = Math.round(h * max / w); w = max } else { w = Math.round(w * max / h); h = max } }
            canvas.width = w; canvas.height = h; canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            receiptImg = canvas.toDataURL('image/jpeg', 0.7);
            document.getElementById('cam-preview').src = receiptImg;
            document.getElementById('cam-preview').style.display = 'block';
            analyzeReceipt(receiptImg.split(',')[1]);
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
}
document.getElementById('file-input').addEventListener('change', e => handleFile(e.target.files[0]));
document.getElementById('cam-input').addEventListener('change', e => handleFile(e.target.files[0]));

async function analyzeReceipt(base64) {
    const key = localStorage.getItem(AK);
    if (!key) {
        document.getElementById('cam-msg').textContent = 'APIキーを設定してね！⚙️\n設定画面から入力できるよ';
        openManualFromImage(); return;
    }
    document.getElementById('processing').style.display = 'flex';
    document.getElementById('cam-msg').textContent = '読み取り中...ちょっと待ってね！🔍';
    try {
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: 'このレシート画像から以下をJSON形式で抽出してください。JSONのみ返してください。\n{"store":"店名","date":"YYYY-MM-DD","total":合計金額の数値,"items":[{"name":"品名","price":金額}],"category":"food/daily/transport/entertainment/medical/otherのいずれか"}' },
                        { inlineData: { mimeType: 'image/jpeg', data: base64 } }
                    ]
                }]
            })
        });
        const json = await resp.json();
        if (!resp.ok) throw new Error(json.error?.message || 'API Error');
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('解析失敗');
        const result = JSON.parse(match[0]);
        fillResult(result);
        document.getElementById('result-msg').textContent = '読み取り完了！確認してね ✨';
        go('result');
    } catch (err) {
        console.error(err);
        document.getElementById('cam-msg').textContent = '読み取りに失敗...😢\n手入力で追加してね';
        openManualFromImage();
    } finally {
        document.getElementById('processing').style.display = 'none';
    }
}

function fillResult(r) {
    document.getElementById('r-date').value = r.date || today();
    document.getElementById('r-store').value = r.store || '';
    document.getElementById('r-amount').value = r.total || '';
    selCat = CATS.find(c => c.id === r.category) ? r.category : 'other';
    renderResultCats();
    if (r.items && r.items.length > 0) {
        document.getElementById('r-items-wrap').style.display = '';
        document.getElementById('r-items').innerHTML = r.items.map(i => `<div class="il-row"><span>${esc(i.name)}</span><span>¥${(i.price || 0).toLocaleString()}</span></div>`).join('');
    } else { document.getElementById('r-items-wrap').style.display = 'none' }
}

function openManual() { selCat = 'food'; receiptImg = null; document.getElementById('r-date').value = today(); document.getElementById('r-store').value = ''; document.getElementById('r-amount').value = ''; document.getElementById('r-items-wrap').style.display = 'none'; renderResultCats(); document.getElementById('result-msg').textContent = '手入力モードだよ ✏️'; go('result') }
function openManualFromImage() { selCat = 'food'; document.getElementById('r-date').value = today(); document.getElementById('r-store').value = ''; document.getElementById('r-amount').value = ''; document.getElementById('r-items-wrap').style.display = 'none'; renderResultCats(); document.getElementById('result-msg').textContent = '手入力で追加してね ✏️'; go('result') }

function renderResultCats() {
    document.getElementById('r-cats').innerHTML = CATS.map(c => `<div class="cat-chip ${selCat === c.id ? 'sel' : ''}" onclick="selCat='${c.id}';renderResultCats()"><span class="ci">${c.icon}</span>${c.name}</div>`).join('');
}

function saveResult() {
    const date = document.getElementById('r-date').value;
    const store = document.getElementById('r-store').value.trim();
    const amount = parseInt(document.getElementById('r-amount').value, 10);
    if (!date || !store || isNaN(amount) || amount < 0) { toast('⚠️ すべて入力してね', '#FFB347'); return }
    data.push({ id: gid(), date, store, amount, category: selCat, receipt: receiptImg, createdAt: Date.now() });
    save(); toast('✅ 保存したよ！えらい！🎉');
    document.getElementById('cam-preview').style.display = 'none';
    document.getElementById('file-input').value = '';
    document.getElementById('cam-input').value = '';
    receiptImg = null;
    go('home');
}

// ===== History =====
function renderHistory() {
    const q = (document.getElementById('search-input').value || '').trim().toLowerCase();
    let items = [...data].sort((a, b) => b.date.localeCompare(a.date));
    if (filterCat !== 'all') items = items.filter(e => e.category === filterCat);
    if (q) items = items.filter(e => e.store.toLowerCase().includes(q));

    // filter chips
    let fc = '<div class="fchip ' + (filterCat === 'all' ? 'active' : '') + '" onclick="filterCat=\'all\';renderHistory()">すべて</div>';
    CATS.forEach(c => { fc += `<div class="fchip ${filterCat === c.id ? 'active' : ''}" onclick="filterCat='${c.id}';renderHistory()">${c.icon}${c.name}</div>` });
    document.getElementById('filter-chips').innerHTML = fc;

    if (items.length === 0) {
        document.getElementById('history-list').innerHTML = '<div class="empty"><div class="emoji">📋</div><p>該当する記録がありません</p></div>'; return;
    }
    let h = ''; items.forEach(e => {
        const c = catOf(e.category), d = new Date(e.date);
        h += `<div class="exp-item" onclick="openEdit('${e.id}')"><div class="exp-icon" style="background:${c.color}18">${c.icon}</div><div class="exp-detail"><div class="exp-store">${esc(e.store)}</div><div class="exp-meta">${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ・ ${c.name}</div></div><div class="exp-amount">-¥${e.amount.toLocaleString()}</div><button class="exp-del" onclick="event.stopPropagation();confirmDel('${e.id}')">✕</button></div>`;
    });
    document.getElementById('history-list').innerHTML = h;
}

// ===== Edit =====
function openEdit(id) {
    const e = data.find(x => x.id === id); if (!e) return;
    editId = id; editCatSel = e.category;
    document.getElementById('e-date').value = e.date;
    document.getElementById('e-store').value = e.store;
    document.getElementById('e-amount').value = e.amount;
    renderEditCats();
    document.getElementById('edit-bg').classList.add('show');
    document.body.style.overflow = 'hidden';
}
function closeEdit() { document.getElementById('edit-bg').classList.remove('show'); document.body.style.overflow = ''; editId = null }
function renderEditCats() {
    document.getElementById('e-cats').innerHTML = CATS.map(c => `<div class="cat-chip ${editCatSel === c.id ? 'sel' : ''}" onclick="editCatSel='${c.id}';renderEditCats()"><span class="ci">${c.icon}</span>${c.name}</div>`).join('');
}
function saveEdit() {
    if (!editId) return;
    const i = data.findIndex(x => x.id === editId); if (i === -1) return;
    const date = document.getElementById('e-date').value;
    const store = document.getElementById('e-store').value.trim();
    const amount = parseInt(document.getElementById('e-amount').value, 10);
    if (!date || !store || isNaN(amount)) { toast('⚠️ すべて入力してね', '#FFB347'); return }
    data[i] = { ...data[i], date, store, amount, category: editCatSel };
    save(); closeEdit(); toast('✏️ 更新したよ！'); render();
}

// ===== Delete =====
function confirmDel(id) { confirmCb = () => { data = data.filter(e => e.id !== id); save(); render(); toast('🗑️ 削除したよ') }; document.getElementById('confirm-msg').textContent = 'この記録を削除する？'; document.getElementById('confirm-bg').classList.add('show') }
function confirmDeleteAll() { confirmCb = () => { data = []; save(); render(); toast('🗑️ 全データ削除したよ') }; document.getElementById('confirm-msg').textContent = 'すべてのデータを削除する？\nこの操作は取り消せないよ'; document.getElementById('confirm-bg').classList.add('show') }
function closeConfirm() { document.getElementById('confirm-bg').classList.remove('show'); confirmCb = null }
document.getElementById('btn-conf').addEventListener('click', () => { if (confirmCb) confirmCb(); closeConfirm() });

// ===== Analysis =====
function renderAnalysis() {
    document.getElementById('ml2').textContent = mlText();
    const items = getMonth(curYear, curMonth);
    const total = items.reduce((s, e) => s + e.amount, 0);

    // Pie chart
    const catTotals = {}; items.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount });
    const pieLabels = [], pieData = [], pieColors = [];
    Object.entries(catTotals).sort((a, b) => b[1] - a[1]).forEach(([id, amt]) => {
        const c = catOf(id); pieLabels.push(c.icon + ' ' + c.name); pieData.push(amt); pieColors.push(c.color);
    });
    const pieCtx = document.getElementById('pie-chart').getContext('2d');
    if (pieChart) pieChart.destroy();
    pieChart = new Chart(pieCtx, { type: 'doughnut', data: { labels: pieLabels, datasets: [{ data: pieData, backgroundColor: pieColors, borderWidth: 0 }] }, options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { family: 'M PLUS Rounded 1c', size: 11 }, padding: 12, usePointStyle: true, pointStyle: 'circle' } } } } });

    // Bar chart (6 months)
    const barLabels = [], barData = [], barColors = [];
    for (let i = 5; i >= 0; i--) {
        let y = curYear, m = curMonth - i; while (m < 0) { m += 12; y-- }
        barLabels.push(`${m + 1}月`);
        const mi = getMonth(y, m);
        barData.push(mi.reduce((s, e) => s + e.amount, 0));
        barColors.push(i === 0 ? '#7ECBE6' : '#B8E4F0');
    }
    const barCtx = document.getElementById('bar-chart').getContext('2d');
    if (barChart) barChart.destroy();
    barChart = new Chart(barCtx, { type: 'bar', data: { labels: barLabels, datasets: [{ data: barData, backgroundColor: barColors, borderRadius: 8, borderSkipped: false }] }, options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: v => '¥' + v.toLocaleString(), font: { family: 'M PLUS Rounded 1c', size: 10 } }, grid: { color: '#f0ebe6' } }, x: { ticks: { font: { family: 'M PLUS Rounded 1c', size: 11 } }, grid: { display: false } } } } });

    // Insights
    let prevY = curYear, prevM = curMonth - 1; if (prevM < 0) { prevM = 11; prevY-- }
    const prevItems = getMonth(prevY, prevM);
    const prevTotal = prevItems.reduce((s, e) => s + e.amount, 0);
    const diff = total - prevTotal;
    const diffPct = prevTotal > 0 ? Math.round(Math.abs(diff) / prevTotal * 100) : 0;

    let ih = '';
    ih += `<div class="insight-row"><span>今月の合計</span><span style="font-weight:700">¥${total.toLocaleString()}</span></div>`;
    ih += `<div class="insight-row"><span>前月の合計</span><span>¥${prevTotal.toLocaleString()}</span></div>`;
    if (prevTotal > 0) {
        ih += `<div class="insight-row"><span>前月比</span><span class="${diff > 0 ? 'insight-up' : 'insight-down'}">${diff > 0 ? '▲' : '▼'} ¥${Math.abs(diff).toLocaleString()}（${diffPct}%${diff > 0 ? '増' : '減'}）</span></div>`;
    }

    // Top category
    if (pieLabels.length > 0) {
        ih += `<div class="insight-row"><span>最も多いカテゴリ</span><span style="font-weight:600">${pieLabels[0]} ¥${pieData[0].toLocaleString()}</span></div>`;
    }

    // Advice
    const budget = parseInt(localStorage.getItem(BK)) || 0;
    let advice = '';
    if (total === 0) advice = '📝 まだ記録がないよ。レシートを撮影してみよう！';
    else if (budget > 0 && total > budget) advice = '⚠️ 予算を超えちゃったよ！残りの日は節約を心がけよう。';
    else if (budget > 0 && total > budget * 0.8) advice = '💡 予算の80%を超えたよ。少しペースを落とそう！';
    else if (diff > 0 && diffPct > 20) advice = '📈 前月より支出が増えてるよ。必要な出費か振り返ってみよう。';
    else advice = '🌟 いい感じ！この調子で節約がんばろう！';
    ih += `<div style="margin-top:10px;padding:10px;background:#FFF8F0;border-radius:10px;font-size:.78rem;line-height:1.5">${advice}</div>`;

    document.getElementById('insight-body').innerHTML = ih;
}

// ===== Settings =====
function loadSettings() {
    document.getElementById('s-apikey').value = localStorage.getItem(AK) || '';
    document.getElementById('s-budget').value = localStorage.getItem(BK) || '';
}
function saveApiKey() { localStorage.setItem(AK, document.getElementById('s-apikey').value.trim()); toast('🔑 APIキーを保存したよ') }
function saveBudget() { localStorage.setItem(BK, document.getElementById('s-budget').value.trim()); toast('💰 予算を保存したよ'); render() }

// ===== Export/Import =====
function exportCSV() {
    if (data.length === 0) { toast('⚠️ データがないよ', '#FFB347'); return }
    let csv = '\uFEFF日付,店名,金額,カテゴリ\n';
    [...data].sort((a, b) => a.date.localeCompare(b.date)).forEach(e => { csv += `${e.date},"${e.store}",${e.amount},${catOf(e.category).name}\n` });
    dl(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'kakeibo.csv'); toast('📤 CSVをダウンロードしたよ')
}
function exportJSON() {
    if (data.length === 0) { toast('⚠️ データがないよ', '#FFB347'); return }
    dl(new Blob([JSON.stringify({ expenses: data, exported: new Date().toISOString() }, null, 2)], { type: 'application/json' }), 'kakeibo_backup.json'); toast('📤 バックアップ完了！')
}
function dl(blob, name) { const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = name; a.click(); URL.revokeObjectURL(u) }
document.getElementById('import-input').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = ev => {
        try { const j = JSON.parse(ev.target.result); if (j.expenses && Array.isArray(j.expenses)) { data = j.expenses; save(); render(); toast('📥 インポート完了！'); } else throw 0 }
        catch { toast('⚠️ ファイル形式が正しくないよ', '#FFB347') }
    }; r.readAsText(f);
});

// ===== Toast =====
function toast(msg, bg = '#6BCB77') { const el = document.getElementById('toast'); el.textContent = msg; el.style.background = bg; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2200) }

// ===== Render All =====
function render() { renderHome(); if (document.getElementById('page-history').classList.contains('active')) renderHistory(); if (document.getElementById('page-analysis').classList.contains('active')) renderAnalysis() }

// ===== Init =====
render();
