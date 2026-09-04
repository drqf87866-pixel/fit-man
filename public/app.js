/* ===========================================================================
   FitMan – Client
   Progressive Enhancement: alles außer dem aktiven Workout ist serverseitig
   gerendert. Der Tracker läuft clientseitig, damit Sätze auch bei Funkloch,
   Sperrbildschirm oder Reload im Gym erhalten bleiben.
   =========================================================================== */
(() => {
  'use strict';

  // -------------------------------------------------------------------------
  // Helfer
  // -------------------------------------------------------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const esc = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch],
    );

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  const mmss = (sec) => {
    const s = Math.max(0, Math.round(sec));
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  };

  const hhmmss = (sec) => {
    const s = Math.max(0, Math.round(sec));
    const h = Math.floor(s / 3600);
    return h > 0 ? `${h}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : mmss(s);
  };

  const num = (v) => {
    const n = parseFloat(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };

  const fmtKg = (n) => String(Math.round(n * 100) / 100).replace('.', ',');

  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* Private Mode o. ä. – der Tracker funktioniert dann nur ohne Resume */
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    },
  };

  const ICON = {
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    minus: '<path d="M5 12h14"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    timer: '<circle cx="12" cy="14" r="8"/><path d="M10 2h4"/><path d="M12 14v-4"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.34-4.34"/>',
    sparkles:
      '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>',
    // Von exerciseThumb() für Übungen ohne Bild gebraucht.
    dumbbell:
      '<path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/>',
    flame:
      '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  };

  // Muss zu src/lib/tags.ts passen.
  const MOVEMENT_LABELS = { push: 'Push', pull: 'Pull', core: 'Core', cardio: 'Ausdauer' };
  const EQUIPMENT_LABELS = { freihantel: 'Freihantel', maschine: 'Maschine', koerpergewicht: 'Körpergewicht' };

  const tagBadges = (movement, equipment) => {
    const parts = [];
    if (movement && MOVEMENT_LABELS[movement]) {
      parts.push(
        `<span class="rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">${esc(MOVEMENT_LABELS[movement])}</span>`,
      );
    }
    if (equipment && EQUIPMENT_LABELS[equipment]) {
      parts.push(
        `<span class="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">${esc(EQUIPMENT_LABELS[equipment])}</span>`,
      );
    }
    return parts.join('');
  };

  const icon = (name, size = 20) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0" aria-hidden="true">${ICON[name]}</svg>`;

  /**
   * Vorschaubild einer Übung – Gegenstück zu <ExerciseThumb> in
   * src/components/exercise-image.tsx. `image` ist der free-exercise-db-Slug,
   * leer (eigene Übung) => Icon-Kachel.
   */
  const exerciseThumb = (image, category, cls, iconSize = 18) =>
    image
      ? `<img src="/img/exercises/${esc(image)}.jpg" alt="" loading="lazy" decoding="async"
             onerror="this.onerror=null;this.src='/img/exercise-fallback.svg'"
             class="${cls} shrink-0 bg-surface-2 object-cover">`
      : `<span class="${cls} grid shrink-0 place-items-center bg-surface-2 text-muted">${icon(
          category === 'Cardio' ? 'flame' : 'dumbbell',
          iconSize,
        )}</span>`;

  // -------------------------------------------------------------------------
  // Globale Kleinigkeiten: Bestätigungen und Bottom-Sheets
  // -------------------------------------------------------------------------
  function initConfirms() {
    document.addEventListener('submit', (e) => {
      const form = e.target.closest('form[data-confirm]');
      if (form && !window.confirm(form.dataset.confirm)) e.preventDefault();
    });
  }

  function openDialog(name) {
    const el = $(`[data-dialog="${name}"]`);
    if (!el) return;
    el.classList.remove('hidden');
    el.classList.add('flex');
    document.body.style.overflow = 'hidden';
    const first = el.querySelector('input, select, textarea');
    if (first) setTimeout(() => first.focus(), 50);
  }

  function closeDialog(el) {
    el.classList.add('hidden');
    el.classList.remove('flex');
    document.body.style.overflow = '';
  }

  function initDialogs() {
    document.addEventListener('click', (e) => {
      const opener = e.target.closest('[data-open-dialog]');
      if (opener) {
        e.preventDefault();
        openDialog(opener.dataset.openDialog);
        return;
      }
      const closer = e.target.closest('[data-close-dialog]');
      if (closer) {
        e.preventDefault();
        closeDialog(closer.closest('[data-dialog]'));
        return;
      }
      const backdrop = e.target.closest('[data-dialog]');
      if (backdrop && e.target === backdrop) closeDialog(backdrop);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const open = $$('[data-dialog]').find((d) => !d.classList.contains('hidden'));
      if (open) closeDialog(open);
    });
  }

  /** Gemeinsame Filter-Logik für Übungsbibliothek und Plan-Formular. */
  /**
   * Jede Filterzeile (data-filter-group) ist eine eigene Gruppe: innerhalb einer
   * Zeile gilt Einfachauswahl, zwischen den Zeilen werden die Filter
   * UND-verknüpft. `active` ist deshalb ein Objekt Gruppe -> Wert, ein leerer
   * Wert bedeutet "diese Gruppe filtert nicht".
   */
  function initFilterList({ searchSel, chipSel, itemSel, emptySel, matches }) {
    const search = $(searchSel);
    const chips = $$(chipSel);
    const items = $$(itemSel);
    if (!items.length) return null;

    const active = Object.create(null);
    const apply = () => {
      const q = (search?.value ?? '').trim().toLowerCase();
      let visible = 0;
      for (const item of items) {
        const show = matches(item, q, active);
        item.classList.toggle('hidden', !show);
        if (show) visible++;
      }
      const empty = emptySel && $(emptySel);
      if (empty) empty.classList.toggle('hidden', visible > 0);
      return visible;
    };

    search?.addEventListener('input', apply);
    for (const chip of chips) {
      chip.addEventListener('click', () => {
        const group = chip.dataset.filterGroup;
        active[group] = chip.dataset.filterValue ?? '';
        for (const other of chips) {
          if (other.dataset.filterGroup === group) {
            other.classList.toggle('chip-active', other === chip);
          }
        }
        apply();
      });
    }
    apply();
    return { apply };
  }

  /** Prüft die Tag-Gruppen, die sich Übungsbibliothek und Plan-Formular teilen. */
  function matchesTags(item, active) {
    if (active.category && item.dataset.category !== active.category) return false;
    if (active.movement && item.dataset.movement !== active.movement) return false;
    if (active.equipment && item.dataset.equipment !== active.equipment) return false;
    return true;
  }

  // -------------------------------------------------------------------------
  // Übungsbibliothek (/exercises)
  // -------------------------------------------------------------------------
  function initExerciseLibrary() {
    initFilterList({
      searchSel: '[data-ex-search]',
      chipSel: '[data-ex-filters] [data-filter-group]',
      itemSel: '[data-ex-item]',
      emptySel: '[data-ex-empty]',
      matches: (item, q, active) => {
        if (active.custom === '1' && item.dataset.custom !== '1') return false;
        if (!matchesTags(item, active)) return false;
        return !q || item.dataset.search.includes(q);
      },
    });
  }

  // -------------------------------------------------------------------------
  // Plan-Formular (/plans/new)
  // -------------------------------------------------------------------------
  function initPlanForm() {
    const form = $('[data-plan-form]');
    if (!form) return;

    initFilterList({
      searchSel: '[data-plan-search]',
      chipSel: '[data-plan-filters] [data-filter-group]',
      itemSel: '[data-plan-item]',
      matches: (item, q, active) => {
        // Bereits ausgewählte Übungen bleiben sichtbar, sonst verschwänden sie
        // beim Filtern aus der Liste und wirkten abgewählt.
        if (item.querySelector('[data-plan-check]').checked) return true;
        if (!matchesTags(item, active)) return false;
        return !q || item.dataset.name.includes(q);
      },
    });

    const list = $('[data-plan-list]');
    const counter = $('[data-plan-count]');
    const isChecked = (item) => item.querySelector('[data-plan-check]').checked;
    const checkedItems = () => $$('[data-plan-item]', list).filter(isChecked);

    /**
     * Ausgewählte Übungen stehen immer oben in Plan-Reihenfolge; die
     * order_<id>-Hiddens werden dabei auf 0..n-1 durchnummeriert. Sie sind die
     * einzige Quelle der Reihenfolge für den Server – die DOM-Reihenfolge von
     * getAll('exerciseId') wäre die Bibliothekssortierung.
     */
    const renumber = () => {
      checkedItems().forEach((item, i) => {
        item.querySelector('[data-plan-order]').value = String(i);
      });
    };

    const refreshCount = () => {
      const n = checkedItems().length;
      if (counter) counter.textContent = `${n} ausgewählt`;
    };

    form.addEventListener('change', (e) => {
      const check = e.target.closest('[data-plan-check]');
      if (!check) return;
      const item = check.closest('[data-plan-item]');
      const sets = item.querySelector('[data-plan-sets]');
      sets.classList.toggle('hidden', !check.checked);
      sets.classList.toggle('flex', check.checked);
      item.classList.toggle('border-accent', check.checked);
      // Neu angehakte Übungen ans Ende der Auswahl, abgewählte hinter die Auswahl.
      const selected = checkedItems();
      if (check.checked) {
        const last = selected[selected.length - 1];
        if (last && last !== item) last.after(item);
      } else {
        const last = selected[selected.length - 1];
        if (last) last.after(item);
      }
      renumber();
      refreshCount();
    });

    form.addEventListener('click', (e) => {
      const up = e.target.closest('[data-order-up]');
      const down = e.target.closest('[data-order-down]');
      if (up || down) {
        const item = (up ?? down).closest('[data-plan-item]');
        const selected = checkedItems();
        const i = selected.indexOf(item);
        const swap = selected[i + (up ? -1 : 1)];
        if (swap) {
          if (up) swap.before(item);
          else swap.after(item);
          renumber();
          item.scrollIntoView({ block: 'nearest' });
        }
        return;
      }

      const dec = e.target.closest('[data-sets-dec]');
      const inc = e.target.closest('[data-sets-inc]');
      if (!dec && !inc) return;
      const input = (dec ?? inc).closest('[data-plan-sets]').querySelector('[data-sets-input]');
      input.value = String(clamp(parseInt(input.value, 10) + (inc ? 1 : -1), 1, 20));
    });

    form.addEventListener('submit', (e) => {
      if ($$('[data-plan-check]:checked').length === 0) {
        e.preventDefault();
        window.alert('Wähle mindestens eine Übung für den Plan aus.');
      }
    });

    renumber();
    refreshCount();
  }

  // =========================================================================
  // Aktives Workout (/workout/active)
  // =========================================================================
  const STATE_KEY = 'fitman.activeWorkout';
  const REST_KEY = 'fitman.restSeconds';

  function initWorkout() {
    const root = $('#workout-root');
    const payloadEl = $('#workout-payload');
    if (!root || !payloadEl) return;

    const payload = JSON.parse(payloadEl.textContent);
    let state = restoreOrCreate(payload);
    let rest = null; // { endsAt, total, handle }
    let wakeLock = null;

    // --------------------------------------------------------------------
    // State
    // --------------------------------------------------------------------
    function makeEntry(ex, targetSets) {
      const prev = payload.previous[ex.exerciseId ?? ex.id];
      const count = Math.max(1, targetSets || prev?.sets.length || 3);
      const sets = [];
      for (let i = 0; i < count; i++) {
        const p = prev?.sets[i] ?? prev?.sets[prev.sets.length - 1];
        // Vorbelegung mit den letzten Werten – spart Tipparbeit an der Hantel.
        sets.push({ weight: p ? p.weightKg : 0, reps: p ? p.reps : 0, completed: false });
      }
      return {
        exerciseId: ex.exerciseId ?? ex.id,
        name: ex.name,
        category: ex.category,
        targetMuscle: ex.targetMuscle ?? '',
        movement: ex.movement ?? '',
        equipment: ex.equipment ?? '',
        sets,
      };
    }

    /** exerciseId -> Bild-Slug; der State selbst speichert das Bild nicht. */
    const IMAGE_BY_ID = Object.fromEntries(payload.library.map((e) => [e.id, e.image || '']));
    const imageOf = (e) => IMAGE_BY_ID[e.exerciseId] ?? e.image ?? '';

    function createState() {
      return {
        v: 1,
        planId: payload.planId,
        planName: payload.planName,
        startedAt: Date.now(),
        notes: '',
        current: 0,
        entries: payload.exercises.map((ex) => makeEntry(ex, ex.targetSets)),
      };
    }

    function restoreOrCreate(p) {
      const saved = store.get(STATE_KEY, null);
      if (!saved || saved.v !== 1 || !Array.isArray(saved.entries)) return createState();
      if (saved.planId === p.planId) return saved;

      const label = saved.planName || 'Freies Training';
      const started = new Date(saved.startedAt).toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const resume = window.confirm(
        `Es läuft noch ein Training: "${label}" (gestartet ${started}).\n\n` +
          'OK = fortsetzen, Abbrechen = verwerfen und neu starten.',
      );
      return resume ? saved : createState();
    }

    const save = () => store.set(STATE_KEY, state);
    const entry = () => state.entries[state.current];
    const doneSets = () => state.entries.flatMap((e) => e.sets).filter((s) => s.completed);

    // --------------------------------------------------------------------
    // Rendering
    // --------------------------------------------------------------------
    function render() {
      state.current = clamp(state.current, 0, Math.max(0, state.entries.length - 1));
      root.innerHTML = `
        ${renderHeader()}
        ${state.entries.length === 0 ? renderEmpty() : renderChips() + renderExercise()}
        ${renderFooter()}
      `;
      tickElapsed();
      renderRest();
    }

    function renderHeader() {
      const done = doneSets().length;
      const total = state.entries.reduce((n, e) => n + e.sets.length, 0);
      return `
        <header class="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur-md">
          <div class="flex items-center gap-2 px-3 py-2.5">
            <button type="button" class="btn-ghost !min-w-11 !px-0" data-action="leave" aria-label="Verlassen">
              ${icon('x', 22)}
            </button>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-bold leading-tight">${esc(state.planName)}</p>
              <p class="text-xs text-muted tabular-nums">
                <span data-elapsed>0:00</span> · ${done}/${total} Sätze
              </p>
            </div>
            <button type="button" class="btn-done !px-4" data-action="finish">
              ${icon('flag', 18)} Beenden
            </button>
          </div>
        </header>`;
    }

    function renderChips() {
      return `
        <div class="no-scrollbar flex gap-2 overflow-x-auto border-b border-border px-3 py-2.5">
          ${state.entries
            .map((e, i) => {
              const done = e.sets.filter((s) => s.completed).length;
              const all = done === e.sets.length && e.sets.length > 0;
              return `<button type="button" class="chip ${i === state.current ? 'chip-active' : all ? '!border-done/40 !text-done' : ''}" data-action="goto" data-index="${i}">
                ${all && i !== state.current ? icon('check', 14) : ''}
                <span>${esc(e.name)}</span>
                <span class="opacity-70 tabular-nums">${done}/${e.sets.length}</span>
              </button>`;
            })
            .join('')}
          <button type="button" class="chip !border-dashed" data-action="add-exercise">
            ${icon('plus', 14)} Übung
          </button>
        </div>`;
    }

    function renderEmpty() {
      return `
        <div class="flex flex-col items-center gap-4 px-6 py-16 text-center">
          <h2 class="text-lg font-semibold">Noch keine Übung</h2>
          <p class="max-w-xs text-sm text-muted">
            Füge deine erste Übung hinzu und leg los.
          </p>
          <button type="button" class="btn-primary" data-action="add-exercise">
            ${icon('plus', 20)} Übung hinzufügen
          </button>
        </div>`;
    }

    function renderExercise() {
      const e = entry();
      const prev = payload.previous[e.exerciseId];
      const prevDate = prev
        ? new Date(prev.date * 1000).toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
          })
        : null;

      return `
        <main class="px-3 pt-4 pb-40">
          ${
            imageOf(e)
              ? // Detailseite in neuem Tab – das laufende Workout soll nicht verlassen werden.
                `<a href="/exercises/${esc(e.exerciseId)}" target="_blank" rel="noopener"
                     class="relative mb-3 block" aria-label="Übungsdetails öffnen">
                   <img src="/img/exercises/${esc(imageOf(e))}.jpg" alt="" decoding="async"
                        onerror="this.closest('a').remove()"
                        width="850" height="567" class="h-48 w-full rounded-2xl bg-surface-2 object-cover">
                   <span class="absolute right-2 bottom-2 rounded-lg bg-black/60 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                     Details
                   </span>
                 </a>`
              : ''
          }
          <div class="mb-3 flex items-start gap-3 px-1">
            <div class="min-w-0 flex-1">
              <h1 class="text-xl font-bold leading-tight">${esc(e.name)}</h1>
              <p class="text-sm text-muted">
                ${esc(e.category)}${e.targetMuscle ? ' · ' + esc(e.targetMuscle) : ''}
              </p>
              ${(() => {
                const badges = tagBadges(e.movement, e.equipment);
                return badges ? `<div class="mt-1 flex flex-wrap gap-1">${badges}</div>` : '';
              })()}
            </div>
            <button type="button" class="btn-ghost !min-w-11 !px-0 text-accent" data-action="alternatives"
              aria-label="Ersatzübung vorschlagen (Gerät belegt)">
              ${icon('sparkles', 20)}
            </button>
            <button type="button" class="btn-ghost !min-w-11 !px-0" data-action="remove-exercise" aria-label="Übung entfernen">
              ${icon('x', 20)}
            </button>
          </div>

          <div class="overflow-hidden rounded-2xl border border-border bg-surface">
            <div class="grid grid-cols-[2.5rem_1fr_4.5rem_4.5rem_2.75rem] items-center gap-2 border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
              <span>Satz</span>
              <span>Vorher${prevDate ? ` (${prevDate})` : ''}</span>
              <span class="text-center">kg</span>
              <span class="text-center">Wdh.</span>
              <span></span>
            </div>
            ${e.sets.map((s, i) => renderSetRow(e, s, i, prev)).join('')}
          </div>

          <div class="mt-3 flex gap-2">
            <button type="button" class="btn-secondary flex-1" data-action="add-set">
              ${icon('plus', 18)} Satz hinzufügen
            </button>
            <button type="button" class="btn-secondary !min-w-11 !px-0" data-action="remove-set"
              ${e.sets.length <= 1 ? 'disabled' : ''} aria-label="Letzten Satz entfernen">
              ${icon('minus', 18)}
            </button>
          </div>

          <div class="mt-6">
            <label class="label" for="wo-notes">Notizen zum Training</label>
            <textarea id="wo-notes" class="input py-2.5" rows="2" data-notes
              placeholder="Gefühl, Schmerzen, Anpassungen">${esc(state.notes)}</textarea>
          </div>
        </main>`;
    }

    function renderSetRow(e, s, i, prev) {
      const p = prev?.sets[i];
      const prevText = p ? `${fmtKg(p.weightKg)} kg × ${p.reps}` : '—';
      return `
        <div class="grid grid-cols-[2.5rem_1fr_4.5rem_4.5rem_2.75rem] items-center gap-2 border-b border-border/60 px-3 py-2 last:border-b-0 ${s.completed ? 'bg-done-soft' : ''}" data-set="${i}">
          <span class="text-center text-sm font-bold tabular-nums ${s.completed ? 'text-done' : 'text-muted'}">${i + 1}</span>
          <span class="truncate text-xs text-muted tabular-nums">${prevText}</span>
          <input type="text" inputmode="decimal" data-field="weight" value="${s.weight ? fmtKg(s.weight) : ''}"
            placeholder="${p ? fmtKg(p.weightKg) : '0'}"
            class="input !h-11 !px-1 text-center font-semibold tabular-nums" aria-label="Gewicht Satz ${i + 1}">
          <input type="text" inputmode="numeric" data-field="reps" value="${s.reps ? s.reps : ''}"
            placeholder="${p ? p.reps : '0'}"
            class="input !h-11 !px-1 text-center font-semibold tabular-nums" aria-label="Wiederholungen Satz ${i + 1}">
          <button type="button" data-action="toggle-set" aria-pressed="${s.completed}"
            aria-label="Satz ${i + 1} abhaken"
            class="grid size-11 place-items-center rounded-xl border transition ${
              s.completed
                ? 'border-done bg-done text-black'
                : 'border-border bg-surface-2 text-muted'
            }">${icon('check', 20)}</button>
        </div>`;
    }

    function renderFooter() {
      const last = state.current >= state.entries.length - 1;
      return `
        <div class="fixed inset-x-0 bottom-0 z-30 safe-bottom">
          <div data-rest-slot></div>
          <div class="mx-auto flex max-w-lg gap-2 border-t border-border bg-surface/95 p-3 backdrop-blur-md">
            <button type="button" class="btn-secondary !px-3" data-action="prev" ${state.current === 0 ? 'disabled' : ''} aria-label="Vorherige Übung">
              ${icon('left', 20)}
            </button>
            <button type="button" class="btn-secondary flex-1" data-action="add-exercise">
              ${icon('plus', 18)} Weitere Übung
            </button>
            <button type="button" class="btn-primary !px-3" data-action="next" ${last ? 'disabled' : ''} aria-label="Nächste Übung">
              ${icon('right', 20)}
            </button>
          </div>
        </div>`;
    }

    // --------------------------------------------------------------------
    // Laufzeit-Anzeige
    // --------------------------------------------------------------------
    function tickElapsed() {
      const el = $('[data-elapsed]', root);
      if (el) el.textContent = hhmmss((Date.now() - state.startedAt) / 1000);
    }
    setInterval(tickElapsed, 1000);

    // --------------------------------------------------------------------
    // Rest-Timer
    // --------------------------------------------------------------------
    function restSeconds() {
      return clamp(parseInt(store.get(REST_KEY, 90), 10) || 90, 15, 600);
    }

    function startRest(seconds = restSeconds()) {
      stopRest(false);
      rest = { endsAt: Date.now() + seconds * 1000, total: seconds };
      rest.handle = setInterval(renderRest, 250);
      renderRest();
    }

    function stopRest(rerender = true) {
      if (rest?.handle) clearInterval(rest.handle);
      rest = null;
      if (rerender) renderRest();
    }

    function renderRest() {
      const slot = $('[data-rest-slot]', root);
      if (!slot) return;

      if (!rest) {
        slot.innerHTML = '';
        return;
      }

      const left = (rest.endsAt - Date.now()) / 1000;
      if (left <= 0) {
        stopRest(false);
        slot.innerHTML = '';
        notifyRestOver();
        return;
      }

      const pct = clamp((left / rest.total) * 100, 0, 100);
      slot.innerHTML = `
        <div class="mx-auto max-w-lg border-t border-accent/30 bg-accent-soft">
          <div class="h-1 bg-accent/20"><div class="h-full bg-accent transition-[width] duration-200" style="width:${pct}%"></div></div>
          <div class="flex items-center gap-3 px-3 py-2.5">
            <span class="text-accent">${icon('timer', 22)}</span>
            <div class="min-w-0 flex-1">
              <p class="text-xs text-muted">Satzpause</p>
              <p class="text-xl font-bold leading-tight tabular-nums">${mmss(left)}</p>
            </div>
            <button type="button" class="btn-secondary !px-3 text-sm" data-action="rest-plus">+15s</button>
            <button type="button" class="btn-ghost !min-w-11 !px-0" data-action="rest-skip" aria-label="Pause überspringen">
              ${icon('x', 22)}
            </button>
          </div>
        </div>`;
    }

    function notifyRestOver() {
      if (navigator.vibrate) navigator.vibrate([180, 90, 180]);
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain).connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
        setTimeout(() => ctx.close(), 800);
      } catch {
        /* Audio ohne User-Geste blockiert – Vibration reicht */
      }
    }

    // --------------------------------------------------------------------
    // Übungs-Picker
    // --------------------------------------------------------------------
    function openPicker() {
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm';
      overlay.innerHTML = `
        <div class="mx-auto flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-3xl border-t border-border bg-surface pb-6 safe-bottom">
          <div class="mx-auto mt-3 mb-3 h-1 w-10 rounded-full bg-border"></div>
          <div class="flex items-center gap-2 px-4 pb-3">
            <h2 class="flex-1 text-lg font-bold">Übung anfügen</h2>
            <button type="button" class="btn-ghost !min-w-11 !px-0" data-picker-close aria-label="Schließen">
              ${icon('x', 22)}
            </button>
          </div>
          <div class="relative px-4 pb-3">
            <span class="pointer-events-none absolute left-7 top-1/2 -translate-y-1/2 text-muted">${icon('search', 18)}</span>
            <input class="input pl-10" type="search" placeholder="Übung suchen" data-picker-search autocomplete="off">
          </div>
          <ul class="flex-1 overflow-y-auto px-4" data-picker-list>
            ${payload.library
              .map(
                (ex) => `
              <li data-picker-item data-search="${esc((ex.name + ' ' + ex.targetMuscle + ' ' + ex.category + ' ' + (MOVEMENT_LABELS[ex.movement] ?? '') + ' ' + (EQUIPMENT_LABELS[ex.equipment] ?? '')).toLowerCase())}">
                <button type="button" class="flex w-full touch items-center gap-3 border-b border-border/60 py-3 text-left" data-picker-pick="${esc(ex.id)}">
                  ${exerciseThumb(ex.image, ex.category, 'size-10 rounded-lg')}
                  <span class="min-w-0 flex-1">
                    <span class="block truncate font-semibold">${esc(ex.name)}</span>
                    <span class="block truncate text-xs text-muted">${esc(ex.targetMuscle || ex.category)}</span>
                    ${tagBadges(ex.movement, ex.equipment) ? `<span class="mt-1 flex flex-wrap gap-1">${tagBadges(ex.movement, ex.equipment)}</span>` : ''}
                  </span>
                  <span class="shrink-0 rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted">${esc(ex.category)}</span>
                </button>
              </li>`,
              )
              .join('')}
          </ul>
          <div class="px-4 pt-3">
            <a href="/exercises" class="btn-secondary w-full">${icon('plus', 18)} Neue Übung anlegen</a>
          </div>
        </div>`;

      document.body.appendChild(overlay);
      document.body.style.overflow = 'hidden';

      const close = () => {
        overlay.remove();
        document.body.style.overflow = '';
      };

      $('[data-picker-search]', overlay).addEventListener('input', (e) => {
        const q = e.target.value.trim().toLowerCase();
        for (const li of $$('[data-picker-item]', overlay)) {
          li.classList.toggle('hidden', Boolean(q) && !li.dataset.search.includes(q));
        }
      });

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay || e.target.closest('[data-picker-close]')) return close();
        const pick = e.target.closest('[data-picker-pick]');
        if (!pick) return;
        const ex = payload.library.find((x) => x.id === pick.dataset.pickerPick);
        if (ex) {
          state.entries.push(makeEntry(ex, 3));
          state.current = state.entries.length - 1;
          save();
          render();
        }
        close();
      });

      setTimeout(() => $('[data-picker-search]', overlay)?.focus(), 60);
    }

    // --------------------------------------------------------------------
    // KI-Ersatzübungen ("Gerät belegt")
    // --------------------------------------------------------------------

    /** Tauscht die aktuelle Übung gegen `ex`, behält die Satzanzahl bei. */
    function replaceCurrentExercise(ex) {
      const old = entry();
      const doneCount = old.sets.filter((s) => s.completed).length;
      if (
        doneCount > 0 &&
        !window.confirm(
          `${doneCount} bereits abgehakte${doneCount === 1 ? 'r Satz geht' : ' Sätze gehen'} von "${old.name}" verloren. Trotzdem tauschen?`,
        )
      ) {
        return false;
      }
      // Neue Übung mit derselben Satzanzahl; Vorwerte kommen – falls vorhanden –
      // aus payload.previous der neuen Übung, sonst leer.
      state.entries[state.current] = makeEntry(ex, old.sets.length);
      save();
      render();
      return true;
    }

    function openAlternativesSheet() {
      const source = entry();
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm';

      const shell = (body) => `
        <div class="mx-auto flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-3xl border-t border-border bg-surface pb-6 safe-bottom">
          <div class="mx-auto mt-3 mb-3 h-1 w-10 rounded-full bg-border"></div>
          <div class="flex items-start gap-2 px-4 pb-3">
            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-bold">Ersatz für ${esc(source.name)}</h2>
              <p class="truncate text-sm text-muted">Gerät belegt? Diese Übungen treffen denselben Muskel.</p>
            </div>
            <button type="button" class="btn-ghost !min-w-11 !px-0" data-alt-close aria-label="Schließen">
              ${icon('x', 22)}
            </button>
          </div>
          <div class="flex-1 overflow-y-auto px-4" data-alt-body>${body}</div>
        </div>`;

      const loading = `
        <p class="flex items-center gap-2 py-8 text-sm text-muted">
          ${icon('sparkles', 18)} Suche passende Alternativen …
        </p>`;

      overlay.innerHTML = shell(loading);
      document.body.appendChild(overlay);
      document.body.style.overflow = 'hidden';

      const close = () => {
        overlay.remove();
        document.body.style.overflow = '';
      };

      let results = [];

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay || e.target.closest('[data-alt-close]')) return close();
        if (e.target.closest('[data-alt-fallback]')) {
          close();
          openPicker();
          return;
        }
        const pick = e.target.closest('[data-alt-pick]');
        if (!pick) return;
        const ex = results.find((x) => x.exerciseId === pick.dataset.altPick);
        if (ex && replaceCurrentExercise(ex) === false) return;
        close();
      });

      const failure = (message) => `
        <div class="flex flex-col gap-3 py-6">
          <p class="text-sm text-muted">${esc(message)}</p>
          <button type="button" class="btn-secondary w-full" data-alt-fallback>
            ${icon('search', 18)} Alle Übungen durchsuchen
          </button>
        </div>`;

      fetch(`/api/exercises/${encodeURIComponent(source.exerciseId)}/alternatives`)
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.message || 'Vorschläge nicht verfügbar.');
          return data;
        })
        .then((data) => {
          results = data.alternatives ?? [];
          const body = $('[data-alt-body]', overlay);
          if (!body) return;
          if (results.length === 0) {
            body.innerHTML = failure('Keine passende Alternative gefunden.');
            return;
          }
          body.innerHTML = results
            .map(
              (ex) => `
              <button type="button" class="flex w-full touch items-start gap-3 border-b border-border/60 py-3 text-left"
                      data-alt-pick="${esc(ex.exerciseId)}">
                ${exerciseThumb(ex.image, ex.category, 'size-12 rounded-lg')}
                <span class="min-w-0 flex-1">
                  <span class="block truncate font-semibold">${esc(ex.name)}</span>
                  <span class="block truncate text-xs text-muted">${esc(ex.targetMuscle || ex.category)}</span>
                  ${tagBadges(ex.movement, ex.equipment) ? `<span class="mt-1 flex flex-wrap gap-1">${tagBadges(ex.movement, ex.equipment)}</span>` : ''}
                  ${ex.reason ? `<span class="mt-1 block text-xs text-accent">${esc(ex.reason)}</span>` : ''}
                </span>
              </button>`,
            )
            .join('');
        })
        .catch((err) => {
          console.error('[fit-man] Alternativen', err);
          const body = $('[data-alt-body]', overlay);
          if (body) body.innerHTML = failure(err.message || 'Vorschläge nicht verfügbar.');
        });
    }

    // --------------------------------------------------------------------
    // Beenden & Speichern
    // --------------------------------------------------------------------
    function openFinishSheet() {
      const done = doneSets();
      const volume = done.reduce((sum, s) => sum + s.reps * s.weight, 0);
      const duration = Math.round((Date.now() - state.startedAt) / 1000);

      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm';
      overlay.innerHTML = `
        <div class="mx-auto w-full max-w-lg rounded-t-3xl border-t border-border bg-surface p-4 pb-8 safe-bottom">
          <div class="mx-auto mb-4 h-1 w-10 rounded-full bg-border"></div>
          <h2 class="mb-1 text-xl font-bold">Workout beenden</h2>
          <p class="mb-4 text-sm text-muted">${esc(state.planName)}</p>

          <div class="mb-4 grid grid-cols-3 gap-2 text-center">
            <div class="rounded-xl bg-surface-2 p-3">
              <p class="text-lg font-bold tabular-nums">${hhmmss(duration)}</p>
              <p class="text-[11px] text-muted">Dauer</p>
            </div>
            <div class="rounded-xl bg-surface-2 p-3">
              <p class="text-lg font-bold tabular-nums">${done.length}</p>
              <p class="text-[11px] text-muted">Sätze</p>
            </div>
            <div class="rounded-xl bg-surface-2 p-3">
              <p class="text-lg font-bold tabular-nums">${Math.round(volume)} kg</p>
              <p class="text-[11px] text-muted">Volumen</p>
            </div>
          </div>

          <label class="label" for="finish-notes">Notizen</label>
          <textarea id="finish-notes" class="input mb-4 py-2.5" rows="3"
            placeholder="Wie lief es?">${esc(state.notes)}</textarea>

          <p class="mb-3 hidden text-sm text-red-400" data-finish-error></p>

          <div class="flex flex-col gap-2">
            <button type="button" class="btn-primary w-full !h-13" data-finish-save>
              ${icon('check', 20)} Speichern
            </button>
            <button type="button" class="btn-ghost w-full" data-finish-cancel>Weiter trainieren</button>
            <button type="button" class="btn-danger w-full" data-finish-discard>Training verwerfen</button>
          </div>
        </div>`;

      document.body.appendChild(overlay);
      document.body.style.overflow = 'hidden';

      const close = () => {
        overlay.remove();
        document.body.style.overflow = '';
      };

      $('[data-finish-cancel]', overlay).addEventListener('click', close);

      $('[data-finish-discard]', overlay).addEventListener('click', () => {
        if (!window.confirm('Training verwerfen? Alle erfassten Sätze gehen verloren.')) return;
        store.remove(STATE_KEY);
        window.onbeforeunload = null;
        window.location.href = '/';
      });

      $('[data-finish-save]', overlay).addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        const err = $('[data-finish-error]', overlay);
        state.notes = $('#finish-notes', overlay).value;
        save();

        if (done.length === 0) {
          err.textContent = 'Hake mindestens einen Satz ab, bevor du speicherst.';
          err.classList.remove('hidden');
          return;
        }

        btn.disabled = true;
        btn.innerHTML = 'Speichern …';
        try {
          const res = await fetch('/api/workouts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(serialize()),
          });
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          store.remove(STATE_KEY);
          window.onbeforeunload = null;
          window.location.href = data.url ?? '/history';
        } catch (error) {
          console.error(error);
          err.textContent = 'Speichern fehlgeschlagen. Verbindung prüfen und erneut versuchen.';
          err.classList.remove('hidden');
          btn.disabled = false;
          btn.innerHTML = `${icon('check', 20)} Speichern`;
        }
      });
    }

    /** Nur Sätze mit Inhalt wandern nach D1 – leere Platzhalter nicht. */
    function serialize() {
      const sets = [];
      for (const e of state.entries) {
        let n = 0;
        for (const s of e.sets) {
          if (!s.completed && !s.reps && !s.weight) continue;
          n += 1;
          sets.push({
            exerciseId: e.exerciseId,
            setNumber: n,
            reps: Math.round(s.reps),
            weightKg: s.weight,
            completed: Boolean(s.completed),
          });
        }
      }
      return {
        planId: state.planId,
        planName: state.planName,
        date: Date.now(),
        durationSeconds: Math.round((Date.now() - state.startedAt) / 1000),
        notes: state.notes,
        sets,
      };
    }

    // --------------------------------------------------------------------
    // Events
    // --------------------------------------------------------------------
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const { action } = btn.dataset;

      if (action === 'toggle-set') {
        const i = Number(btn.closest('[data-set]').dataset.set);
        const s = entry().sets[i];
        s.completed = !s.completed;
        // Leere Felder beim Abhaken mit dem Platzhalter (= Vorwert) füllen.
        if (s.completed) {
          const p = payload.previous[entry().exerciseId]?.sets[i];
          if (!s.weight && p) s.weight = p.weightKg;
          if (!s.reps && p) s.reps = p.reps;
        }
        save();
        render();
        if (s.completed) startRest();
        return;
      }

      const actions = {
        'add-set': () => {
          const sets = entry().sets;
          const last = sets[sets.length - 1];
          sets.push({ weight: last?.weight ?? 0, reps: last?.reps ?? 0, completed: false });
        },
        'remove-set': () => {
          if (entry().sets.length > 1) entry().sets.pop();
        },
        'add-exercise': openPicker,
        alternatives: openAlternativesSheet,
        'remove-exercise': () => {
          if (!window.confirm(`"${entry().name}" aus diesem Training entfernen?`)) return false;
          state.entries.splice(state.current, 1);
          state.current = clamp(state.current, 0, Math.max(0, state.entries.length - 1));
        },
        goto: () => {
          state.current = Number(btn.dataset.index);
        },
        prev: () => {
          state.current = Math.max(0, state.current - 1);
        },
        next: () => {
          state.current = Math.min(state.entries.length - 1, state.current + 1);
        },
        finish: openFinishSheet,
        leave: () => {
          if (doneSets().length === 0) {
            store.remove(STATE_KEY);
            window.onbeforeunload = null;
            window.location.href = '/';
            return false;
          }
          openFinishSheet();
          return false;
        },
        'rest-plus': () => {
          if (rest) {
            rest.endsAt += 15000;
            rest.total += 15;
            store.set(REST_KEY, restSeconds() + 15);
          }
          renderRest();
          return false;
        },
        'rest-skip': () => {
          stopRest();
          return false;
        },
      };

      const fn = actions[action];
      if (!fn) return;
      const result = fn();
      if (result === false) return;
      // Sheets rendern selbst, sobald der Nutzer darin etwas gewählt hat.
      if (action === 'add-exercise' || action === 'finish' || action === 'alternatives') return;
      save();
      render();
    });

    root.addEventListener('input', (e) => {
      const field = e.target.dataset?.field;
      if (field) {
        const i = Number(e.target.closest('[data-set]').dataset.set);
        const s = entry().sets[i];
        if (field === 'weight') s.weight = Math.max(0, num(e.target.value));
        else s.reps = Math.max(0, Math.round(num(e.target.value)));
        save();
        return;
      }
      if (e.target.hasAttribute('data-notes')) {
        state.notes = e.target.value;
        save();
      }
    });

    // Versehentliches Wegnavigieren verhindern, solange Sätze erfasst sind.
    window.addEventListener('beforeunload', (e) => {
      if (doneSets().length === 0) return;
      e.preventDefault();
      e.returnValue = '';
    });

    // Bildschirm während des Trainings wach halten (falls unterstützt).
    async function requestWakeLock() {
      try {
        wakeLock = await navigator.wakeLock?.request('screen');
      } catch {
        /* nicht unterstützt oder verweigert */
      }
    }
    requestWakeLock();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        if (!wakeLock) requestWakeLock();
        renderRest();
        tickElapsed();
      }
    });

    render();
  }

  // -------------------------------------------------------------------------
  // Bootstrap
  // -------------------------------------------------------------------------
  const boot = () => {
    initConfirms();
    initDialogs();
    initExerciseLibrary();
    initPlanForm();
    initWorkout();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
