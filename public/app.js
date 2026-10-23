// Initialize Supabase (shared Family project; tables are indexed in app_table_registry)
const SUPABASE_URL = 'https://twvqvutrcobedvuhnzxq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_eqUo8HEdEB1hMQM4CpSVqA_9i6b0qCo';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = (id) => document.getElementById(id);
const authBtn = $('auth-btn');
const loginForm = $('login-form');
const mainContent = $('main-content');
const loginBtn = $('login-btn');
const childPicker = $('child-picker');
const childView = $('child-view');
const recordForm = $('record-form');

let currentUser = null;
let currentChild = null;
const ANIM_MS = 3000;
const getRate = () => { const r = parseFloat(localStorage.getItem('interestRate')); return isNaN(r) ? 5 : r; };

function showError(msg) {
    console.error(msg);
    let box = document.getElementById('error-box');
    if (!box) {
        box = document.createElement('div');
        box.id = 'error-box';
        box.style.cssText = 'background:#fdecea;color:#b71c1c;padding:10px;border-radius:8px;margin:10px 0;';
        document.getElementById('app').insertBefore(box, document.getElementById('app').children[1]);
    }
    box.textContent = msg;
}
window.addEventListener('unhandledrejection', (e) => showError('Unexpected error: ' + (e.reason && e.reason.message || e.reason)));

const money = (n) => (n < 0 ? '-' : '') + '$' + Math.abs(n).toFixed(2);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

_supabase.auth.getSession().then(({ data: { session } }) => updateUI(session));

async function updateUI(session) {
    if (session) {
        currentUser = session.user;
        loginForm.style.display = 'none';
        mainContent.style.display = 'block';
        authBtn.innerText = 'Logout';
        $('settings-btn').style.display = '';
        await showChildPicker();
    } else {
        currentUser = null;
        currentChild = null;
        loginForm.style.display = 'block';
        mainContent.style.display = 'none';
        authBtn.innerText = 'Login';
        $('settings-btn').style.display = 'none';
        $('settings-card').style.display = 'none';
    }
}

async function showChildPicker() {
    currentChild = null;
    $('ledger-view').style.display = 'none';
    childView.style.display = 'none';
    childPicker.style.display = 'grid';
    const { data, error } = await _supabase
        .from('family_members').select('*').eq('role', 'kid').order('display_order');
    if (error) { console.error(error); childPicker.innerHTML = '<div>Could not load children: ' + esc(error.message) + (error.code ? ' (' + esc(error.code) + ')' : '') + '</div>'; return; }
    childPicker.innerHTML = '';
    const faces = ['🦄', '🦊', '🐸', '🐼'];
    (data || []).forEach((c, i) => {
        const b = document.createElement('button');
        b.className = 'btn child-btn c' + (i % 3);
        b.innerHTML = '<span class="face">' + faces[i % faces.length] + '</span><span>' + esc(c.name) + '</span>';
        b.addEventListener('click', () => showChild(c));
        childPicker.appendChild(b);
    });
    if (!data || !data.length) {
        childPicker.innerHTML = '<div class="card" style="grid-column:1/-1">No kids returned.<br>' +
            'Logged in as: ' + esc(currentUser && currentUser.id) + '<br>' +
            'Kids are the family_members rows with role = kid. If there are some, the RLS policy on family_members is likely missing or wrong.</div>';
    }
}

async function showChild(child) {
    currentChild = child;
    childPicker.style.display = 'none';
    childView.style.display = 'block';
    recordForm.style.display = 'none';
    $('child-name').innerText = child.name.toUpperCase() + "'S MONEY 💰";
    await loadData();
}

async function ensureInterest(child) {
    const rate = getRate();
    if (!rate) return;
    const { data, error } = await _supabase.from('allowance_transactions').select('*')
        .eq('member_name', child.name).order('occurred_at', { ascending: true });
    if (error) { showError('Interest check: ' + error.message); return; }
    const txs = data || [];
    if (!txs.length) return;
    const first = new Date(txs[0].occurred_at);
    const now = new Date();
    let y = first.getUTCFullYear(), m = first.getUTCMonth() + 1;
    while (Date.UTC(y, m, 1) <= now.getTime()) {
        const start = Date.UTC(y, m, 1), end = Date.UTC(y, m + 1, 1);
        const has = txs.some((t) => t.type === 'interest' && +new Date(t.occurred_at) >= start && +new Date(t.occurred_at) < end);
        if (!has) {
            const bal = txs.filter((t) => +new Date(t.occurred_at) < start)
                .reduce((s, t) => s + (t.type === 'withdrawal' ? -1 : 1) * Number(t.amount), 0);
            const amt = Math.round(bal * rate) / 100;
            if (amt > 0) {
                const row = { member_name: child.name, type: 'interest',
                    amount: amt, note: 'Monthly interest ' + rate + '%', occurred_at: new Date(start).toISOString() };
                const ins = await _supabase.from('allowance_transactions').insert(row);
                // 23505: another device already paid this month's interest (one per kid per month).
                if (ins.error && ins.error.code !== '23505') { showError('Interest save failed: ' + ins.error.message); return; }
                txs.push(row);
            }
        }
        m++; if (m > 11) { m = 0; y++; }
    }
}

function countUp(el, target, ms) {
    const t0 = performance.now();
    const step = (now) => {
        const p = Math.min((now - t0) / ms, 1);
        el.innerText = money(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step); else el.innerText = money(target);
    };
    requestAnimationFrame(step);
}

async function showLedger() {
    childView.style.display = 'none';
    $('ledger-view').style.display = 'block';
    $('ledger-name').innerText = currentChild.name.toUpperCase() + "'S LEDGER";
    $('ledger-balance').innerText = '$0.00';
    $('ledger-list').innerHTML = '';
    await ensureInterest(currentChild);
    const { data, error } = await _supabase.from('allowance_transactions').select('*').eq('member_name', currentChild.name)
        .order('occurred_at', { ascending: false });
    if (error) { showError('Ledger: ' + error.message); return; }
    const txs = data || [];
    const balance = txs.reduce((s, t) => s + (t.type === 'withdrawal' ? -1 : 1) * Number(t.amount), 0);
    countUp($('ledger-balance'), balance, ANIM_MS);
    const rows = txs.slice(0, 10);
    const stagger = rows.length ? (ANIM_MS - 500) / rows.length : 0;
    $('ledger-list').innerHTML = rows.map((t, i) => `
        <div class="transaction ledger-row ${t.type === 'interest' ? 'interest' : ''}" style="animation-delay:${Math.round(i * stagger)}ms">
            <span class="badge ${t.type === 'withdrawal' ? 'out' : 'in'}">${esc(t.type)}</span> ${t.type === 'withdrawal' ? '-' : ''}${money(Number(t.amount))}
            <div class="sub">${new Date(t.occurred_at).toLocaleDateString()} ${esc(t.note)}</div>
        </div>`).join('') || '<div>No transactions yet.</div>';
}

async function loadData() {
    await ensureInterest(currentChild);
    const [tx, rq] = await Promise.all([
        _supabase.from('allowance_transactions').select('*').eq('member_name', currentChild.name)
            .order('occurred_at', { ascending: false }),
        _supabase.from('allowance_withdrawal_requests').select('*').eq('member_name', currentChild.name)
            .order('created_at', { ascending: false }),
    ]);
    if (tx.error) showError('Transactions: ' + tx.error.message);
    if (rq.error) showError('Withdrawal requests: ' + rq.error.message);
    const txs = tx.data || [];
    const balance = txs.reduce((s, t) => s + (t.type === 'withdrawal' ? -1 : 1) * Number(t.amount), 0);
    $('child-balance').innerText = money(balance);
    $('transaction-list').innerHTML = txs.slice(0, 20).map((t) => `
        <div class="transaction">
            <span class="badge ${t.type === 'withdrawal' ? 'out' : 'in'}">${esc(t.type)}</span> ${t.type === 'withdrawal' ? '-' : ''}${money(Number(t.amount))}
            ${t.achievement_tag ? ' · ' + esc(t.achievement_tag) : ''}
            <div class="sub">${new Date(t.occurred_at).toLocaleDateString()} ${esc(t.note)}</div>
        </div>`).join('') || '<div>No transactions yet.</div>';
    $('request-list').innerHTML = (rq.data || []).map((r) => `
        <div class="transaction">${money(Number(r.requested_amount))} · ${esc(r.status)}
            <div class="sub">${esc(r.purpose)}</div></div>`).join('') || '<div>No requests.</div>';
}

loginBtn.addEventListener('click', async () => {
    const email = $('email').value;
    const password = $('password').value;
    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else updateUI(data.session);
});

authBtn.addEventListener('click', async () => {
    if (authBtn.innerText === 'Logout') {
        await _supabase.auth.signOut();
        updateUI(null);
    }
});

$('back-btn').addEventListener('click', showChildPicker);
$('ledger-btn').addEventListener('click', showLedger);
$('ledger-back').addEventListener('click', () => { $('ledger-view').style.display = 'none'; childView.style.display = 'block'; loadData(); });
$('settings-btn').addEventListener('click', () => {
    const c = $('settings-card');
    $('rate-input').value = getRate();
    c.style.display = c.style.display === 'none' ? 'block' : 'none';
});
$('rate-save').addEventListener('click', () => {
    const r = parseFloat($('rate-input').value);
    if (isNaN(r) || r < 0) { showError('Enter a valid interest rate.'); return; }
    localStorage.setItem('interestRate', r);
    $('settings-card').style.display = 'none';
});

$('record-btn').addEventListener('click', () => {
    recordForm.style.display = recordForm.style.display === 'none' ? 'block' : 'none';
});

recordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { error } = await _supabase.from('allowance_transactions').insert({
        member_name: currentChild.name,
        type: $('rec-type').value,
        amount: $('rec-amount').value,
        note: $('rec-note').value || null,
        achievement_tag: $('rec-tag').value || null,
    });
    if (error) { showError('Save failed: ' + error.message); return; }
    recordForm.reset();
    recordForm.style.display = 'none';
    loadData();
});





