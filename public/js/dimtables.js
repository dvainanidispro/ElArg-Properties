// dimtables.js

/*
 * dimtables — Μινιμαλιστικό plugin διαχείρισης πινάκων (αναζήτηση, ταξινόμηση, σελιδοποίηση)
 * Συγγραφέας: Δημήτρης Βαϊνανίδης
 * Έκδοση: 1.0.0
 * Έτος: 2025
 * Άδεια: MIT (αλλαγή κατά βούληση)
 * Απαιτήσεις: Bootstrap CSS (όχι JS)
 *
 * Χρήση
 * -----
 * 1) Πρόσθεσε την κλάση "dim-table" στο <table>.
 *    <table class="dim-table table table-striped">...</table>
 *
 * 2) Για ταξινόμηση στήλης, βάλε την κλάση που ορίζεται στο
 *    dimtables.defaultOptions.sortableHeaderClass (προεπιλογή: "sortable") στο αντίστοιχο <th>.
 *    <th class="sortable">Όνομα</th>
 *
 * 3) Δήλωσε προαιρετικά τύπο ταξινόμησης με data-sort-type στο <th>:
 *    - number   : Αριθμητική ταξινόμηση (υποστήριξη 1.234,56 → 1234.56)
 *    - date-gr  : Ημερομηνία σε μορφή dd/mm/yyyy
 *    - text     : Απλό κείμενο (προεπιλογή)
 *    Παράδειγμα: <th class="sortable" data-sort-type="number">Ποσό</th>
 *
 * 4) Προαιρετικά, για custom τιμή ταξινόμησης ανά κελί, χρησιμοποίησε data-sort-value στο <td>.
 *    Αν υπάρχει αυτό το attribute, υπερισχύει του κειμένου του κελιού.
 *    Παράδειγμα: <td data-sort-value="0012">#12</td>
 *
 * 5) Καθολικές ρυθμίσεις για όλο το site μπορούν να οριστούν ΠΡΙΝ φορτώσει το αρχείο:
 *    <script>
 *      window.dimtablesOptions = {
 *        rowsPerPage: 100,
 *        minSearchCharacters: 1,
 *        pagerButtonClass: "btn btn-outline-secondary",
 *        searchInputClass: "form-control form-control-sm",
 *        searchInputWidth: 300
 *      };
 *    </script>
 *    <script src="/path/to/dimtables.js"></script>
 */

// Global namespace
window.dimtables = window.dimtables || {};

// Καθολικές (site-wide) ρυθμίσεις που μπορεί να ορίσει ο χρήστης πριν φορτώσει το script
window.dimtablesOptions = window.dimtablesOptions || {};

// Προεπιλεγμένες ρυθμίσεις για κάθε πίνακα
window.dimtables.defaultOptions = {
    minSearchCharacters: 2,
    placeholder: "Αναζήτηση...",
    sortableHeaderClass: "sortable",
    hiddenRowClass: "d-none", // μία κλάση απόκρυψης για φίλτρο & σελιδοποίηση (ο έλεγχος γίνεται με flags)
    rowsPerPage: 50,
    pageInfoTemplate: "Εμφανίζονται {start}-{end} από {total} εγγραφές",
    pagerButtonClass: "btn btn-secondary", // κλάση για τα κουμπιά προηγ/επόμ
    searchInputClass: "form-control m-4", // κλάση για το input αναζήτησης
    searchInputWidth: 260, // πλάτος σε px για το input αναζήτησης
    sortIcon: '<svg viewBox="0 0 16 16" width="1.2em" height="1.2em" class="ms-1 dimtables-sort-icon"><path d="M8 2 L4 6 H12 L8 2 Z" fill="currentColor"></path><path d="M8 14 L4 10 H12 L8 14 Z" fill="currentColor"></path></svg>'
};

(function () {
  const state = new WeakMap(); // κατάσταση ανά πίνακα

  function mergeOptions() {
    return Object.assign(
      {},
      window.dimtables.defaultOptions,
      window.dimtablesOptions || {}
    );
  }

  // Μετατροπή ελληνικής ημερομηνίας (dd/mm/yyyy) σε timestamp
  function parseGreekDate(str) {
    const parts = (str || '').split('/');
    if (parts.length !== 3) return NaN;
    const [day, month, year] = parts.map(p => parseInt(p, 10));
    return new Date(year, month - 1, day).getTime();
  }

  // --- Βοηθητικά για ορατότητα γραμμών (flags + μία CSS κλάση) ---
  function syncRowHiddenClass(tr, opts) {
    const hidden = tr.dataset.dtFilterHidden === '1' || tr.dataset.dtPageHidden === '1';
    tr.classList.toggle(opts.hiddenRowClass, hidden);
  }
  function setFilterHidden(tr, hidden, opts) {
    if (hidden) tr.dataset.dtFilterHidden = '1'; else delete tr.dataset.dtFilterHidden;
    syncRowHiddenClass(tr, opts);
  }
  function setPageHidden(tr, hidden, opts) {
    if (hidden) tr.dataset.dtPageHidden = '1'; else delete tr.dataset.dtPageHidden;
    syncRowHiddenClass(tr, opts);
  }
  function getAllRows(table) {
    const tbodies = table.tBodies ? Array.from(table.tBodies) : [];
    const all = [];
    tbodies.forEach(tbody => {
      Array.from(tbody.rows).forEach(tr => all.push(tr));
    });
    return all;
  }
  function visibleRows(table) {
    return getAllRows(table).filter(tr => tr.dataset.dtFilterHidden !== '1');
  }

  // Δημιουργία επάνω μπάρας: αριστερά pager + info, δεξιά αναζήτηση
  function buildTopBar(table, opts) {
    const bar = document.createElement("div");
    bar.className = "dim-table-bar d-flex justify-content-between align-items-center my-2";

    const left = document.createElement("div");
    left.className = "d-flex align-items-center gap-2";

    const pagerContainer = document.createElement("div");
    pagerContainer.className = "me-3";

    const btnPrev = document.createElement("button");
    btnPrev.type = "button";
    btnPrev.className = opts.pagerButtonClass + " me-1";
    btnPrev.textContent = "<";
    btnPrev.setAttribute("aria-label", "Previous page");

    const btnNext = document.createElement("button");
    btnNext.type = "button";
    btnNext.className = opts.pagerButtonClass;
    btnNext.textContent = ">";
    btnNext.setAttribute("aria-label", "Next page");

    pagerContainer.appendChild(btnPrev);
    pagerContainer.appendChild(btnNext);

    const info = document.createElement("div");
    info.className = "small text-muted";

    // Προσθήκη pagerContainer πριν το info
    left.appendChild(pagerContainer);
    left.appendChild(info);

    const right = document.createElement("div");
    right.className = "d-flex";

    const input = document.createElement("input");
    input.type = "search";
    input.className = opts.searchInputClass;
    input.placeholder = opts.placeholder || "Αναζήτηση...";
    input.setAttribute("aria-label", "Search table");
    input.style.width = opts.searchInputWidth + "px";

    right.appendChild(input);

    bar.appendChild(left);
    bar.appendChild(right);

    table.parentNode.insertBefore(bar, table);

    return { bar, left, info, btnPrev, btnNext, right, input, pagerContainer };
  }

  // Εφαρμογή σελιδοποίησης στις τρέχουσες ορατές (μετά από φίλτρο) γραμμές
  function applyPagination(table, opts) {
    const st = state.get(table);
    const rows = visibleRows(table);
    const total = rows.length;
    const rpp = Math.max(1, parseInt(opts.rowsPerPage, 10) || 50);
    const pages = Math.max(1, Math.ceil(total / rpp));
    let page = st.page || 1;
    if (page > pages) page = pages;
    st.page = page;

    const startIndex = (page - 1) * rpp;
    const endIndex = Math.min(startIndex + rpp - 1, Math.max(total - 1, 0));

    getAllRows(table).forEach(tr => setPageHidden(tr, true, opts));
    rows.forEach((tr, idx) => {
      if (idx >= startIndex && idx <= endIndex) setPageHidden(tr, false, opts);
    });

    const humanStart = total === 0 ? 0 : startIndex + 1;
    const humanEnd = total === 0 ? 0 : endIndex + 1;
    st.info.textContent = (opts.pageInfoTemplate || "{start}-{end}/{total}")
      .replace("{start}", humanStart)
      .replace("{end}", humanEnd)
      .replace("{total}", total);

    const showPager = total > rpp;
    st.pagerContainer.classList.toggle(opts.hiddenRowClass, !showPager);
    st.btnPrev.disabled = page <= 1;
    st.btnNext.disabled = page >= pages;
  }

  // Δημιουργία μπάρας + σύνδεση αναζήτησης & pager
  function ensureTopBarAndSearch(table, opts) {
    if (table.dataset.dimtablesInitialized === "1") return; // αποφυγή διπλής αρχικοποίησης
    const { info, btnPrev, btnNext, input, pagerContainer } = buildTopBar(table, opts);

    state.set(table, { page: 1, info, btnPrev, btnNext, input, pagerContainer });

    getAllRows(table).forEach(tr => { delete tr.dataset.dtFilterHidden; delete tr.dataset.dtPageHidden; syncRowHiddenClass(tr, opts); });

    // Αναζήτηση (on input) — εφαρμόζει/αναιρεί απόκρυψη και επαναφέρει στη σελίδα 1
    input.addEventListener("input", function () {
      const q = (this.value || "").trim().toLowerCase();
      const shouldFilter = q.length >= opts.minSearchCharacters;

      getAllRows(table).forEach((tr) => {
        if (!shouldFilter) {
          setFilterHidden(tr, false, opts);
          return;
        }
        const text = tr.textContent.toLowerCase();
        setFilterHidden(tr, text.indexOf(q) === -1, opts);
      });

      const st = state.get(table);
      st.page = 1;
      applyPagination(table, opts);
    });

    // Κουμπιά σελιδοποίησης
    btnPrev.addEventListener("click", () => {
      const st = state.get(table);
      if (st.page > 1) {
        st.page -= 1;
        applyPagination(table, opts);
      }
    });
    btnNext.addEventListener("click", () => {
      const st = state.get(table);
      st.page += 1; // το clamp γίνεται στο applyPagination
      applyPagination(table, opts);
    });

    table.dataset.dimtablesInitialized = "1";
  }

  // Σύνδεση ταξινόμησης μόνο σε <th> με την κλάση sortableHeaderClass
  function attachSorting(table) {
    const opts = mergeOptions();
    if (table.dataset.dimtablesSortingAttached === "1") return;
    const headerRow = table.tHead ? table.tHead.rows[table.tHead.rows.length - 1] : null;
    if (!headerRow) return;

    const headers = Array.from(headerRow.cells);

    headers.forEach((th, colIndex) => {
      if (!th.classList.contains(opts.sortableHeaderClass)) return;
      th.setAttribute("role", "button");

      if (!th.querySelector('.dimtables-sort-icon')) {
        th.insertAdjacentHTML('beforeend', opts.sortIcon);
      }

      th.addEventListener("click", function () {
        const tbody = table.tBodies[0];
        const rows = Array.from(tbody.rows);
        const current = th.getAttribute("data-sort-order");
        const direction = current === "asc" ? "desc" : "asc";
        const sortType = th.getAttribute("data-sort-type") || "text";

        headers.forEach(h => {
          h.removeAttribute("data-sort-order");
          h.classList.remove("sorted-asc", "sorted-desc");
        });

        th.setAttribute("data-sort-order", direction);
        th.classList.add(direction === "asc" ? "sorted-asc" : "sorted-desc");

        rows.sort((a, b) => {
          // Χρήση data-sort-value αν υπάρχει, αλλιώς κείμενο
          let aCell = a.cells[colIndex];
          let bCell = b.cells[colIndex];
          let aVal = aCell.getAttribute("data-sort-value") || aCell.textContent.trim();
          let bVal = bCell.getAttribute("data-sort-value") || bCell.textContent.trim();

          if (sortType === "number") {
            aVal = parseFloat(aVal.replace(/\./g, '').replace(',', '.')) || 0;
            bVal = parseFloat(bVal.replace(/\./g, '').replace(',', '.')) || 0;
          } else if (sortType === "date-gr") {
            aVal = parseGreekDate(aVal);
            bVal = parseGreekDate(bVal);
          } else {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
          }

          if (aVal < bVal) return direction === "asc" ? -1 : 1;
          if (aVal > bVal) return direction === "asc" ? 1 : -1;
          return 0;
        });

        rows.forEach(row => tbody.appendChild(row));

        const st = state.get(table);
        st.page = 1;
        applyPagination(table, opts);
      });
    });

    table.dataset.dimtablesSortingAttached = "1";
  }

  // Εκκίνηση: βρίσκει όλους τους πίνακες και δένει αναζήτηση/ταξινόμηση/σελιδοποίηση
  window.dimtables.initialize = function initialize() {
    const opts = mergeOptions();
    const tables = document.querySelectorAll("table.dim-table");
    tables.forEach((table) => {
      ensureTopBarAndSearch(table, opts);
      attachSorting(table);
      applyPagination(table, opts);
    });
  };

  // Αυτόματη εκτέλεση στην φόρτωση
  window.dimtables.initialize();
})();
