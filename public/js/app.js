(function () {
  const API = '../api';
  const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  const COLORS = ['#5b8def', '#7a4b2a', '#e6a15a', '#c98b52', '#4a5a6a', '#9a5bd0'];
  const STATUS_CLASS = {
    'Présent': 'available',
    'Absent': 'absent',
    'En mission': 'mission',
    'En congé': 'conge',
    'Jour férié': 'ferie',
    'Congé': 'conge',
    'Retard': 'available'
  };
  const REPORT_BADGE = {
    'Présent': 'badge-present',
    'Absent': 'badge-absent',
    'En mission': 'badge-mission',
    'En congé': 'badge-conge',
    'Congé': 'badge-conge',
    'Jour férié': 'badge-ferie',
    'Retard': 'badge-present'
  };
  const CODE_STR_MAP = {
    SYS: 'DINF', RESEAUX: 'RES', MAINT: 'MAINT', SEC: 'SEC', DEV: 'DEV',
    DINF: 'DINF', RES: 'RES', RH: 'DINF', GEST: 'DINF', FORM: 'DINF', LIAI: 'DINF', REG: 'DINF'
  };

  function initials(name) {
    return String(name || '')
      .split(/\s+/)
      .filter(Boolean)
      .map(function (p) { return p[0]; })
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?';
  }
  function colorFrom(s) {
    var h = 0, i, str = String(s || '');
    for (i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
    return COLORS[Math.abs(h) % COLORS.length];
  }
  function splitName(full) {
    var parts = String(full || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return { nom: '', prenom: '' };
    if (parts.length === 1) return { nom: parts[0], prenom: parts[0] };
    return { nom: parts[0], prenom: parts.slice(1).join(' ') };
  }
  function fullName(row) {
    return ((row.nom || '') + ' ' + (row.prenom || '')).trim();
  }
  function fmtDate(iso) {
    if (!iso || iso === '0000-00-00') return '—';
    var p = String(iso).slice(0, 10).split('-');
    if (p.length !== 3) return iso;
    return p[2] + '/' + p[1] + '/' + p[0];
  }
  function fmtTime(t) {
    if (!t) return '—';
    return String(t).slice(0, 5);
  }
  function parseFrDate(value) {
    var m = String(value || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return '';
    return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
  }
  function toISO(ddmmyyyy) {
    return parseFrDate(ddmmyyyy);
  }
  function mapStatus(label) {
    if (label === 'Congé') return 'En congé';
    return label || '—';
  }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function monthStartISO() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01';
  }

  async function api(path, options) {
    options = options || {};
    var headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    var res = await fetch(API + '/' + path, Object.assign({ credentials: 'same-origin' }, options, { headers: headers }));
    var data = {};
    try { data = await res.json(); } catch (e) { data = {}; }
    if (res.status === 401 && path !== 'login.php') {
      location.href = 'index.html';
      throw new Error(data.erreur || 'Authentification requise');
    }
    if (!res.ok) throw new Error(data.erreur || 'Une erreur est survenue.');
    return data;
  }

  function wireNav() {
    var map = {
      'Tableau de bord': 'dashboard.html',
      'Rapports': 'rapports.html',
      'Administration': 'admin.html',
      'Paramètres': 'settings.html'
    };
    document.querySelectorAll('.nav-item').forEach(function (a) {
      var key = a.textContent.replace(/\s+/g, ' ').trim();
      Object.keys(map).forEach(function (label) {
        if (key.indexOf(label) !== -1) {
          a.addEventListener('click', function (e) {
            e.preventDefault();
            location.href = map[label];
          });
        }
      });
    });
    var logout = document.querySelector('.logout-btn');
    if (logout) {
      logout.addEventListener('click', async function () {
        try { await api('logout.php', { method: 'POST', body: '{}' }); } catch (e) {}
        location.href = 'index.html';
      });
    }
  }

  function fillUser(u) {
    var name = fullName(u) || u.login || '';
    document.querySelectorAll('.user-meta .name, .welcome .who').forEach(function (el) {
      el.textContent = name;
    });
    document.querySelectorAll('.user-avatar, .avatar-sm').forEach(function (el) {
      el.textContent = initials(name);
    });
    document.querySelectorAll('.user-meta .role').forEach(function (el) {
      el.textContent = u.role || '';
    });
  }

  async function requireUser() {
    var data = await api('get_profil.php');
    fillUser(data.utilisateur);
    wireNav();
    return data.utilisateur;
  }

  function agentToEmp(a) {
    var name = fullName(a);
    return {
      mat: a.mat,
      name: name,
      matricule: a.mat,
      dept: a.structure || a.code_str || '',
      code_str: a.code_str,
      role: 'Employé',
      status: Number(a.actif) ? 'Actif' : 'Bloqué',
      color: colorFrom(a.mat || name),
      initials: initials(name),
      phone: a.telephone || '',
      email: a.email || '',
      hireDate: fmtDate(a.date_embauche),
      address: a.adresse || '',
      birthdate: '',
      device: '',
      nom: a.nom,
      prenom: a.prenom
    };
  }

  async function initLogin() {
    var form = document.getElementById('loginForm');
    if (!form) return;
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      var button = document.getElementById('loginButton');
      var error = document.getElementById('loginError');
      error.textContent = '';
      button.disabled = true;
      button.textContent = 'Connexion…';
      try {
        var data = await api('login.php', {
          method: 'POST',
          body: JSON.stringify({
            login: document.getElementById('login').value,
            mot_de_passe: document.getElementById('motDePasse').value
          })
        });
        location.href = data.utilisateur && data.utilisateur.role === 'Administrateur'
          ? 'admin.html'
          : 'rapports.html';
      } catch (err) {
        error.textContent = err.message;
      } finally {
        button.disabled = false;
        button.textContent = 'Se connecter';
      }
    });
  }

  async function initDashboard() {
    await requireUser();
    var allRows = [];
    var stats = await api('get_stats.php');
    var values = document.querySelectorAll('.stat-value');
    if (values[0]) values[0].textContent = String(stats.agents.total || 0);
    var presents = (stats.situations_aujourdhui && (stats.situations_aujourdhui.P || 0)) || 0;
    var absents = (stats.situations_aujourdhui && (stats.situations_aujourdhui.A || 0)) || 0;
    if (values[1]) values[1].textContent = String(presents);
    if (values[2]) values[2].textContent = String(absents);

    var hist = await api('get_historique.php?date_debut=' + monthStartISO() + '&date_fin=' + todayISO());
    allRows = (hist.historique || []).map(function (r) {
      return {
        matricule: r.mat,
        name: fullName(r),
        dept: r.structure || '',
        date: fmtDate(r.date_jour),
        in: fmtTime(r.heure_entree),
        out: fmtTime(r.heure_sortie),
        status: mapStatus(r.situation),
        color: colorFrom(r.mat),
        initials: initials(fullName(r))
      };
    });

    function renderTable(data) {
      var tbody = document.getElementById('tableBody');
      if (!tbody) return;
      if (!data.length) {
        tbody.innerHTML = '<tr><td colspan="8">Aucun pointage pour cette période.</td></tr>';
      } else {
        tbody.innerHTML = data.map(function (row) {
          return '<tr>' +
            '<td>' + row.matricule + '</td>' +
            '<td><div class="emp-cell"><div class="initials" style="background:' + row.color + ';">' + row.initials + '</div><span class="full-name">' + row.name + '</span></div></td>' +
            '<td>' + row.dept + '</td>' +
            '<td>' + row.date + '</td>' +
            '<td class="time-in">' + row.in + '</td>' +
            '<td class="time-out">' + row.out + '</td>' +
            '<td><span class="badge-status ' + (STATUS_CLASS[row.status] || 'available') + '">' + row.status + '</span></td>' +
            '<td class="center"><button class="row-menu" title="Options"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg></button></td>' +
            '</tr>';
        }).join('');
      }
      var count = document.getElementById('resultsCount');
      if (count) count.textContent = data.length ? ('Showing 1 to ' + data.length + ' of ' + data.length + ' results') : 'Aucun résultat';
    }

    function applyFilters() {
      var q = (document.getElementById('searchInput').value || '').trim().toLowerCase();
      var statut = document.getElementById('statutFilter').value;
      var dept = document.getElementById('deptFilter').value;
      var date = document.getElementById('dateFilter').value;
      renderTable(allRows.filter(function (r) {
        return (r.name.toLowerCase().indexOf(q) !== -1 || r.matricule.indexOf(q) !== -1 || r.dept.toLowerCase().indexOf(q) !== -1) &&
          (!statut || r.status === statut) &&
          (!dept || r.dept === dept) &&
          (!date || toISO(r.date) === date);
      }));
    }

    renderTable(allRows);
    ['searchInput', 'statutFilter', 'deptFilter', 'dateFilter'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener(id === 'searchInput' ? 'input' : 'change', applyFilters);
    });
    var resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        document.getElementById('searchInput').value = '';
        document.getElementById('statutFilter').value = '';
        document.getElementById('deptFilter').value = '';
        document.getElementById('dateFilter').value = '';
        renderTable(allRows);
      });
    }
  }

  async function initAdmin() {
    await requireUser();
    var employees = [];
    var structures = [];
    var toast = document.getElementById('toast');
    var toastMessage = document.getElementById('toastMessage');
    var toastTimer = null;

    function showToast(message, isError) {
      if (!toast) return;
      toastMessage.textContent = message;
      toast.classList.toggle('toast-error', !!isError);
      toast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2800);
    }

    function refreshStats() {
      var values = document.querySelectorAll('.stat-value');
      var actifs = employees.filter(function (e) { return e.status === 'Actif'; }).length;
      var blocked = employees.filter(function (e) { return e.status === 'Bloqué'; }).length;
      if (values[0]) values[0].textContent = String(employees.length);
      if (values[0] && values[0].nextElementSibling) values[0].nextElementSibling.textContent = 'Autorisés : ' + actifs;
      if (values[1]) values[1].textContent = String(structures.length).padStart(2, '0');
      if (values[2]) values[2].textContent = String(blocked).padStart(2, '0');
    }

    function renderTable(data) {
      var tbody = document.getElementById('tableBody');
      tbody.innerHTML = data.map(function (emp, i) {
        return '<tr>' +
          '<td class="center avatar-cell"><div class="initials" style="background:' + emp.color + '; margin:0 auto;">' + emp.initials + '</div></td>' +
          '<td class="name-cell"><span class="full-name">' + emp.name + '</span></td>' +
          '<td>' + emp.matricule + '</td>' +
          '<td>' + emp.dept + '</td>' +
          '<td class="center"><span class="badge ' + (emp.role === 'Administrateur' ? 'role-admin' : 'role-employe') + '">' + emp.role + '</span></td>' +
          '<td><span class="status ' + (emp.status === 'Actif' ? 'active' : 'blocked') + '"><span class="dot"></span>' + emp.status + '</span></td>' +
          '<td class="center"><div class="actions" style="justify-content:center;">' +
            '<button class="icon-btn" title="Voir" data-view="' + i + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>' +
            '<button class="icon-btn" title="Modifier" data-edit="' + i + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button>' +
            '<button class="icon-btn danger" title="Supprimer" data-delete="' + i + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2"/></svg></button>' +
          '</div></td></tr>';
      }).join('');
      tbody.querySelectorAll('[data-view]').forEach(function (btn) {
        btn.addEventListener('click', function () { openModal(data[Number(btn.dataset.view)]); });
      });
      tbody.querySelectorAll('[data-edit]').forEach(function (btn) {
        btn.addEventListener('click', function () { openEditModal(data[Number(btn.dataset.edit)]); });
      });
      tbody.querySelectorAll('[data-delete]').forEach(function (btn) {
        btn.addEventListener('click', function () { openDeleteModal(data[Number(btn.dataset.delete)]); });
      });
    }

    async function reloadAgents() {
      var data = await api('get_agents.php');
      employees = (data.agents || []).map(agentToEmp);
      renderTable(employees);
      refreshStats();
    }

    var strData = await api('get_structures.php');
    structures = strData.structures || [];
    await reloadAgents();

    var modalOverlay = document.getElementById('modalOverlay');
    function openModal(emp) {
      document.getElementById('modalName').textContent = emp.name;
      document.getElementById('modalMatricule').textContent = emp.matricule;
      document.getElementById('modalPhone').textContent = emp.phone || '—';
      document.getElementById('modalEmail').textContent = emp.email || '—';
      document.getElementById('modalEmail').href = emp.email ? 'mailto:' + emp.email : '#';
      document.getElementById('modalHireDate').textContent = emp.hireDate || '—';
      document.getElementById('infoFullName').textContent = emp.name;
      document.getElementById('infoDept').textContent = emp.dept;
      document.getElementById('infoRole').textContent = emp.role;
      document.getElementById('infoAddress').textContent = emp.address || '—';
      document.getElementById('infoBirthdate').textContent = emp.birthdate || '—';
      document.getElementById('infoDevice').textContent = emp.device || '—';
      var statusEl = document.getElementById('modalStatus');
      statusEl.className = 'status ' + (emp.status === 'Actif' ? 'active' : 'blocked');
      statusEl.innerHTML = '<span class="dot"></span>' + emp.status;
      var roleBadge = document.getElementById('modalRoleBadge');
      roleBadge.textContent = emp.role;
      roleBadge.className = 'badge ' + (emp.role === 'Administrateur' ? 'role-admin' : 'role-employe');
      modalOverlay.classList.add('open');
    }
    function closeModal() { modalOverlay.classList.remove('open'); }
    document.getElementById('modalClose').addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', function (e) { if (e.target === modalOverlay) closeModal(); });

    var editModalOverlay = document.getElementById('editModalOverlay');
    var editForm = document.getElementById('editForm');
    var editingEmployee = null;
    function openEditModal(emp) {
      editingEmployee = emp;
      document.getElementById('editName').value = emp.name;
      document.getElementById('editMatricule').value = emp.matricule;
      var deptSel = document.getElementById('editDept');
      if ([].some.call(deptSel.options, function (o) { return o.value === emp.dept || o.text === emp.dept; })) {
        deptSel.value = emp.dept;
      }
      document.getElementById('editRole').value = emp.role === 'Administrateur' ? 'Administrateur' : 'Employé';
      document.getElementById('editStatus').value = emp.status;
      editModalOverlay.classList.add('open');
    }
    function closeEditModal() { editModalOverlay.classList.remove('open'); }
    document.getElementById('editModalClose').addEventListener('click', closeEditModal);
    document.getElementById('editCancelBtn').addEventListener('click', closeEditModal);
    editModalOverlay.addEventListener('click', function (e) { if (e.target === editModalOverlay) closeEditModal(); });
    editForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!editingEmployee) return;
      var parts = splitName(document.getElementById('editName').value);
      var deptLabel = document.getElementById('editDept').value;
      var str = structures.find(function (s) { return s.designation === deptLabel; });
      try {
        await api('update_agent.php', {
          method: 'PUT',
          body: JSON.stringify({
            mat: editingEmployee.matricule,
            nom: parts.nom,
            prenom: parts.prenom,
            code_str: str ? str.code_str : editingEmployee.code_str,
            actif: document.getElementById('editStatus').value === 'Actif'
          })
        });
        closeEditModal();
        await reloadAgents();
        showToast('Utilisateur modifié avec succès');
      } catch (err) {
        showToast(err.message, true);
      }
    });

    var directionDepartments = {
      DINF: {
        label: 'Direction Informatique (DINF)',
        departments: [
          { code: 'SYS', label: 'SYS - Systèmes Exploitation' },
          { code: 'RESEAUX', label: 'RÉSEAUX - Réseaux' },
          { code: 'MAINT', label: 'MAINTENANCE - Maintenance' },
          { code: 'SEC', label: 'SÉCURITÉ - Sécurité' },
          { code: 'DEV', label: 'ETUDE ET DEV - Études et Développement' }
        ]
      },
      DGP: {
        label: 'Direction des Programmes (DGP)',
        departments: [
          { code: 'RH', label: 'RH - Ressources Humaines' },
          { code: 'GEST', label: 'GESTION - Gestion' },
          { code: 'FORM', label: 'FORMATION - Formation' },
          { code: 'LIAI', label: 'LIAISON - Liaison' },
          { code: 'REG', label: 'ETUDE ET REG - Études et Réglementation' }
        ]
      }
    };

    function initDropdown(cfg) {
      var wrap = document.getElementById(cfg.wrapId);
      var trigger = document.getElementById(cfg.triggerId);
      var valueEl = document.getElementById(cfg.valueId);
      var panel = document.getElementById(cfg.panelId);
      var onSelectCb = null;
      function setOptions(options) {
        panel.innerHTML = options.length
          ? options.map(function (o) { return '<div class="csel-option" data-value="' + o.value + '">' + o.label + '</div>'; }).join('')
          : '<div class="csel-empty">Aucune option</div>';
      }
      function setValue(value, label) {
        wrap.dataset.value = value || '';
        valueEl.textContent = label || cfg.placeholder;
        valueEl.classList.toggle('placeholder', !value);
        wrap.classList.remove('error');
      }
      function setDisabled(disabled) { wrap.classList.toggle('disabled', disabled); }
      function close() { wrap.classList.remove('open'); }
      function open() {
        if (wrap.classList.contains('disabled')) return;
        document.querySelectorAll('.csel.open').forEach(function (el) { if (el !== wrap) el.classList.remove('open'); });
        wrap.classList.toggle('open');
      }
      trigger.addEventListener('click', function (e) { e.stopPropagation(); open(); });
      panel.addEventListener('click', function (e) {
        var opt = e.target.closest('.csel-option');
        if (!opt) return;
        setValue(opt.dataset.value, opt.textContent);
        close();
        if (onSelectCb) onSelectCb(opt.dataset.value);
      });
      return {
        setOptions: setOptions, setValue: setValue, setDisabled: setDisabled, close: close,
        get value() { return wrap.dataset.value || ''; },
        onSelect: function (cb) { onSelectCb = cb; }
      };
    }
    document.addEventListener('click', function () {
      document.querySelectorAll('.csel.open').forEach(function (el) { el.classList.remove('open'); });
    });

    var directionDropdown = initDropdown({
      wrapId: 'addDirectionSel', triggerId: 'addDirectionTrigger', valueId: 'addDirectionValue', panelId: 'addDirectionPanel',
      placeholder: 'Sélectionner une direction'
    });
    var deptDropdown = initDropdown({
      wrapId: 'addDeptSel', triggerId: 'addDeptTrigger', valueId: 'addDeptValue', panelId: 'addDeptPanel',
      placeholder: "Sélectionner une direction d'abord"
    });
    var roleDropdown = initDropdown({
      wrapId: 'addRoleSel', triggerId: 'addRoleTrigger', valueId: 'addRoleValue', panelId: 'addRolePanel',
      placeholder: 'Sélectionner un rôle'
    });
    function refreshAddDeptOptions(dirCode) {
      var dir = directionDepartments[dirCode];
      if (!dir) {
        deptDropdown.setOptions([]);
        deptDropdown.setDisabled(true);
        deptDropdown.setValue('', "Sélectionner une direction d'abord");
        return;
      }
      deptDropdown.setDisabled(false);
      deptDropdown.setOptions(dir.departments.map(function (d) { return { value: d.code, label: d.label }; }));
      deptDropdown.setValue('', 'Sélectionner un département');
    }
    directionDropdown.onSelect(refreshAddDeptOptions);

    var addModalOverlay = document.getElementById('addModalOverlay');
    var addForm = document.getElementById('addForm');
    var addPhotoInput = document.getElementById('addPhoto');
    var uploadLabel = document.getElementById('uploadLabel');
    addPhotoInput.addEventListener('change', function () {
      uploadLabel.textContent = addPhotoInput.files[0] ? addPhotoInput.files[0].name : 'Télécharger une image';
    });
    function resetAddForm() {
      addForm.reset();
      directionDropdown.setValue('', 'Sélectionner une direction');
      roleDropdown.setValue('', 'Sélectionner un rôle');
      refreshAddDeptOptions(null);
      uploadLabel.textContent = 'Télécharger une image';
    }
    function openAddModal() { resetAddForm(); addModalOverlay.classList.add('open'); }
    function closeAddModal() {
      addModalOverlay.classList.remove('open');
      document.querySelectorAll('.csel.open').forEach(function (el) { el.classList.remove('open'); });
    }
    document.getElementById('openAddBtn').addEventListener('click', openAddModal);
    document.getElementById('addModalClose').addEventListener('click', closeAddModal);
    document.getElementById('addCancelBtn').addEventListener('click', closeAddModal);
    addModalOverlay.addEventListener('click', function (e) { if (e.target === addModalOverlay) closeAddModal(); });

    addForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var dirCode = directionDropdown.value;
      var deptCode = deptDropdown.value;
      var role = roleDropdown.value;
      var valid = addForm.checkValidity();
      if (!valid) addForm.reportValidity();
      if (!dirCode) { document.getElementById('addDirectionSel').classList.add('error'); valid = false; }
      if (!deptCode) { document.getElementById('addDeptSel').classList.add('error'); valid = false; }
      if (!role) { document.getElementById('addRoleSel').classList.add('error'); valid = false; }
      if (!valid) return;
      var parts = splitName(document.getElementById('addName').value);
      try {
        await api('add_agent.php', {
          method: 'POST',
          body: JSON.stringify({
            mat: document.getElementById('addMatricule').value.trim(),
            nom: parts.nom,
            prenom: parts.prenom,
            email: document.getElementById('addEmail').value.trim(),
            telephone: document.getElementById('addPhone').value.trim() || null,
            date_embauche: todayISO(),
            code_str: CODE_STR_MAP[deptCode] || deptCode
          })
        });
        closeAddModal();
        await reloadAgents();
        showToast('Administrateur ajouté avec succès');
      } catch (err) {
        showToast(err.message, true);
      }
    });

    var deleteModalOverlay = document.getElementById('deleteModalOverlay');
    var deletingEmployee = null;
    function openDeleteModal(emp) {
      deletingEmployee = emp;
      document.getElementById('deleteUserName').textContent = emp.name;
      deleteModalOverlay.classList.add('open');
    }
    function closeDeleteModal() { deleteModalOverlay.classList.remove('open'); }
    document.getElementById('deleteCancelBtn').addEventListener('click', closeDeleteModal);
    deleteModalOverlay.addEventListener('click', function (e) { if (e.target === deleteModalOverlay) closeDeleteModal(); });
    document.getElementById('deleteConfirmBtn').addEventListener('click', async function () {
      if (!deletingEmployee) return;
      try {
        await api('desactiver_agent.php', {
          method: 'PATCH',
          body: JSON.stringify({ mat: deletingEmployee.matricule })
        });
        showToast(deletingEmployee.name + ' a été supprimé', true);
        closeDeleteModal();
        await reloadAgents();
      } catch (err) {
        showToast(err.message, true);
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeModal();
        closeEditModal();
        closeAddModal();
        closeDeleteModal();
      }
    });

    document.getElementById('searchInput').addEventListener('input', function (e) {
      var q = e.target.value.trim().toLowerCase();
      renderTable(employees.filter(function (emp) {
        return emp.name.toLowerCase().indexOf(q) !== -1 || emp.matricule.indexOf(q) !== -1 || emp.dept.toLowerCase().indexOf(q) !== -1;
      }));
    });
    document.getElementById('filterBtn').addEventListener('click', function () {
      var dept = document.getElementById('deptFilter').value;
      var role = document.getElementById('roleFilter').value;
      var status = document.getElementById('statusFilter').value;
      renderTable(employees.filter(function (emp) {
        return (!dept || emp.dept === dept) && (!role || emp.role === role) && (!status || emp.status === status);
      }));
    });
  }

  async function initRapports() {
    await requireUser();
    var allRows = [];
    var pageIndex = 1;
    var perPage = 9;
    var tbody = document.querySelector('.results-card tbody');
    var totalEl = document.querySelector('.results-total');
    var pageInfo = document.querySelector('.page-info');
    var searchInput = document.querySelector('.filter-card input[type="text"]');
    var deptSelect = document.querySelector('.filter-card select');
    var dateInputs = document.querySelectorAll('.filter-card .date-input');

    function badgeClass(status) {
      return REPORT_BADGE[status] || 'badge-present';
    }
    function render() {
      var start = (pageIndex - 1) * perPage;
      var slice = allRows.slice(start, start + perPage);
      var pages = Math.max(1, Math.ceil(allRows.length / perPage));
      if (!slice.length) {
        tbody.innerHTML = '<tr><td colspan="6">Aucun résultat pour ces filtres.</td></tr>';
      } else {
        tbody.innerHTML = slice.map(function (r) {
          return '<tr>' +
            '<td class="matricule">' + r.mat + '</td>' +
            '<td class="nom">' + fullName(r) + '</td>' +
            '<td>' + (r.structure || '') + '</td>' +
            '<td>' + fmtTime(r.heure_entree) + '</td>' +
            '<td>' + fmtTime(r.heure_sortie) + '</td>' +
            '<td><span class="badge ' + badgeClass(mapStatus(r.situation)) + '">' + mapStatus(r.situation) + '</span></td>' +
            '</tr>';
        }).join('');
      }
      if (totalEl) totalEl.textContent = 'Total: ' + allRows.length;
      if (pageInfo) pageInfo.textContent = 'Page ' + pageIndex + ' sur ' + pages;
    }

    async function generate() {
      var debut = parseFrDate(dateInputs[0] && dateInputs[0].value) || monthStartISO();
      var fin = parseFrDate(dateInputs[1] && dateInputs[1].value) || todayISO();
      var data = await api('get_historique.php?date_debut=' + encodeURIComponent(debut) + '&date_fin=' + encodeURIComponent(fin));
      var q = (searchInput && searchInput.value || '').trim().toLowerCase();
      var dept = deptSelect && deptSelect.value;
      allRows = (data.historique || []).filter(function (r) {
        var name = fullName(r).toLowerCase();
        var deptOk = !dept || dept.indexOf('Tous') === 0 || r.structure === dept;
        var qOk = !q || name.indexOf(q) !== -1 || String(r.mat).indexOf(q) !== -1;
        return deptOk && qOk;
      });
      pageIndex = 1;
      render();
    }

    document.querySelector('.btn-generate').addEventListener('click', function () {
      generate().catch(function (err) { alert(err.message); });
    });
    document.querySelector('.btn-reset').addEventListener('click', function () {
      if (searchInput) searchInput.value = '';
      if (deptSelect) deptSelect.selectedIndex = 0;
      if (dateInputs[0]) dateInputs[0].value = '';
      if (dateInputs[1]) dateInputs[1].value = '';
      generate().catch(function (err) { alert(err.message); });
    });
    var prev = document.querySelector('.pager-btn.prev');
    var next = document.querySelector('.pager-btn.next');
    if (prev) prev.addEventListener('click', function () { if (pageIndex > 1) { pageIndex--; render(); } });
    if (next) next.addEventListener('click', function () {
      var pages = Math.max(1, Math.ceil(allRows.length / perPage));
      if (pageIndex < pages) { pageIndex++; render(); }
    });
    document.querySelectorAll('.top-actions .btn').forEach(function (btn) {
      if (btn.textContent.indexOf('Imprimer') !== -1) btn.addEventListener('click', function () { window.print(); });
      if (btn.textContent.indexOf('PDF') !== -1) btn.addEventListener('click', function () { window.print(); });
    });
    await generate();
  }

  async function initSettings() {
    var user = await requireUser();
    var compteInputs = document.querySelectorAll('#panel-compte input');
    if (compteInputs[0]) compteInputs[0].value = user.nom || '';
    if (compteInputs[1]) compteInputs[1].value = user.prenom || '';
    if (compteInputs[2]) compteInputs[2].value = user.email || '';
    if (compteInputs[3]) compteInputs[3].value = user.telephone || '';
    document.querySelectorAll('#panel-securite .field-password input').forEach(function (input) {
      input.value = '';
    });
    document.querySelectorAll('[data-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var input = btn.previousElementSibling;
        input.type = input.type === 'password' ? 'text' : 'password';
      });
    });
    document.querySelectorAll('.tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
        document.querySelectorAll('.panel').forEach(function (p) { p.classList.remove('active'); });
        tab.classList.add('active');
        document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
      });
    });
    async function saveProfil() {
      await api('update_profil.php', {
        method: 'PUT',
        body: JSON.stringify({
          nom: compteInputs[0].value.trim(),
          prenom: compteInputs[1].value.trim(),
          email: compteInputs[2].value.trim(),
          telephone: compteInputs[3].value.trim()
        })
      });
      fillUser({
        nom: compteInputs[0].value.trim(),
        prenom: compteInputs[1].value.trim(),
        role: user.role
      });
      alert('Profil mis à jour.');
    }
    async function savePassword() {
      var pwds = document.querySelectorAll('#panel-securite .field-password input');
      if (pwds[1].value !== pwds[2].value) {
        alert('La confirmation du mot de passe ne correspond pas.');
        return;
      }
      await api('changer_mdp.php', {
        method: 'PUT',
        body: JSON.stringify({
          ancien_mot_de_passe: pwds[0].value,
          nouveau_mot_de_passe: pwds[1].value
        })
      });
      pwds[0].value = '';
      pwds[1].value = '';
      pwds[2].value = '';
      alert('Mot de passe modifié.');
    }
    var outline = document.querySelector('.btn-outline-orange');
    if (outline) outline.addEventListener('click', function () { saveProfil().catch(function (e) { alert(e.message); }); });
    var solid = document.querySelector('.btn-solid-orange');
    if (solid) solid.addEventListener('click', function () { savePassword().catch(function (e) { alert(e.message); }); });
    var save = document.querySelector('.btn-save');
    if (save) save.addEventListener('click', function () { saveProfil().catch(function (e) { alert(e.message); }); });
    var cancel = document.querySelector('.btn-cancel');
    if (cancel) cancel.addEventListener('click', function () { location.reload(); });
  }

  if (page === 'index.html' || page === '' || page === 'inject.php') {
    if (document.getElementById('loginForm')) initLogin();
    else requireUser().catch(function () {});
  } else if (page === 'dashboard.html') {
    initDashboard().catch(function (err) { console.error(err); });
  } else if (page === 'admin.html') {
    initAdmin().catch(function (err) { console.error(err); });
  } else if (page === 'rapports.html') {
    initRapports().catch(function (err) { console.error(err); });
  } else if (page === 'settings.html') {
    initSettings().catch(function (err) { console.error(err); });
  }
})();
