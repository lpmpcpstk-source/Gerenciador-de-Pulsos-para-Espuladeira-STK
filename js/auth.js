/**
 * auth.js — Autenticação local (demonstração)
 * ⚠ Em produção: substituir por Supabase Auth com JWT.
 */
'use strict';

const Auth = {
  current: null,

  login(loginStr, senha) {
    const u = CFG.USERS.find(u => u.login === loginStr.trim().toLowerCase() && u.hash === senha);
    if (!u) return null;
    this.current = u;
    return u;
  },

  logout()   { this.current = null; },
  isPCP()    { return this.current?.perfil === 'PCP' || this.current?.perfil === 'Admin'; },
  isAdmin()  { return this.current?.perfil === 'Admin'; },

  applyUI() {
    const u = this.current;
    if (!u) return;
    document.getElementById('hdr-name').textContent = u.nome;
    const rt = document.getElementById('hdr-role-tag');
    const tagCls = u.perfil === 'Admin' ? 'tag-admin' : (u.perfil === 'PCP' ? 'tag-pcp' : 'tag-op');
    rt.innerHTML = `<span class="tag ${tagCls}">${u.perfil}</span>`;
    // data-pcp: visível para PCP e Admin
    document.querySelectorAll('[data-pcp]').forEach(el => {
      el.style.display = this.isPCP() ? '' : 'none';
    });
    // data-admin: visível SOMENTE para Admin
    document.querySelectorAll('[data-admin]').forEach(el => {
      el.style.display = this.isAdmin() ? '' : 'none';
    });
  }
};
