/**
 * backup.js — Módulo de Backup e Exportação de Dados (Admin)
 * Visível apenas para o perfil PCP (Leonardo).
 * Exporta fichas_tecnicas do Supabase em JSON e CSV.
 */
'use strict';

const Backup = {

  /** Busca TODOS os registros do Supabase (incluindo inativos) */
  async _fetchAll() {
    const url  = `${SUPABASE_URL}/rest/v1/fichas_tecnicas?select=*&order=nome.asc`;
    const hdrs = {
      'apikey':        SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Accept':        'application/json'
    };
    const r = await fetch(url, { headers: hdrs, signal: AbortSignal.timeout(12000) });
    if (!r.ok) throw new Error(`Supabase retornou HTTP ${r.status}`);
    return r.json();
  },

  /** Gera e faz download de um arquivo no navegador */
  _download(conteudo, nomeArquivo, tipo) {
    const blob = new Blob([conteudo], { type: tipo });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  },

  /** Formata data/hora no padrão brasileiro para nome de arquivo */
  _timestamp() {
    const d   = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  },

  /** Exporta fichas como JSON estruturado */
  async exportarJSON() {
    const btn = document.getElementById('btn-backup-json');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Exportando…'; }
    try {
      const dados = await this._fetchAll();
      const payload = {
        sistema:    'Gerenciador de Pulso — Espuladeira',
        versao:     '3.1',
        exportadoEm: new Date().toISOString(),
        exportadoPor: Auth.current?.nome || 'Admin',
        total:      dados.length,
        fichas:     dados
      };
      const json  = JSON.stringify(payload, null, 2);
      const nome  = `stickfran_fichas_backup_${this._timestamp()}.json`;
      this._download(json, nome, 'application/json');
      UI.toast(`✓ Backup JSON exportado — ${dados.length} fichas`, 'ok');
    } catch (e) {
      UI.toast(`✕ Erro ao exportar JSON: ${e.message}`, 'err');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '⬇ Exportar JSON'; }
    }
  },

  /** Exporta fichas como CSV compatível com Excel */
  async exportarCSV() {
    const btn = document.getElementById('btn-backup-csv');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Exportando…'; }
    try {
      const dados = await this._fetchAll();
      const cols  = ['id','nome','material','fios','d0','diam','comp','pmax','mmax','espula','obs','ativo','created_at','updated_at'];
      const esc   = v => {
        if (v == null) return '';
        const s = String(v).replace(/"/g, '""');
        return (s.includes(',') || s.includes('"') || s.includes('\n')) ? `"${s}"` : s;
      };
      const linhas = [
        cols.join(','),
        ...dados.map(r => cols.map(c => esc(r[c])).join(','))
      ];
      const csv  = '\uFEFF' + linhas.join('\r\n'); // BOM para Excel br
      const nome = `stickfran_fichas_backup_${this._timestamp()}.csv`;
      this._download(csv, nome, 'text/csv;charset=utf-8');
      UI.toast(`✓ Backup CSV exportado — ${dados.length} fichas`, 'ok');
    } catch (e) {
      UI.toast(`✕ Erro ao exportar CSV: ${e.message}`, 'err');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '⬇ Exportar CSV'; }
    }
  },

  /** Exibe contagem atual de registros no painel */
  async atualizarContagem() {
    const el = document.getElementById('backup-total');
    if (!el) return;
    el.textContent = '…';
    try {
      const dados = await this._fetchAll();
      const ativos   = dados.filter(f => f.ativo !== false).length;
      const inativos = dados.length - ativos;
      el.innerHTML = `<span style="color:var(--led-grn)">${ativos} ativas</span>`
        + (inativos ? ` · <span style="color:var(--t-lo)">${inativos} inativas</span>` : '');
    } catch {
      el.textContent = 'offline';
    }
  }
};
