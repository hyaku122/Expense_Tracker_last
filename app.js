(function () {
  "use strict";

  const APP_VERSION = window.EXPENSE_TRACKER_VERSION || "2026-03-14-01";
  const STORAGE_KEY = "expense-tracker-state";
  const SESSION_TOAST_KEY = "expense-tracker-post-refresh-toast";
  const SCHEMA_VERSION = 1;
  const CACHE_PREFIX = "expense-tracker-static-";
  const UPDATE_CONFIRM_MESSAGE = "キャッシュを削除して最新版を読み込みます。入力データは消えません。実行しますか？";
  const MONTH_LABELS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
  const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
  const PENCIL_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16.8V20h3.2l9.44-9.44-3.2-3.2L4 16.8Zm14.76-8.92c.32-.32.32-.84 0-1.16l-1.48-1.48a.82.82 0 0 0-1.16 0l-1.16 1.16 3.2 3.2 1.16-1.16Z"></path></svg>';
  const NOTE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm8 1.5V9h4.5"></path><path d="M8 12h8M8 15h8M8 18h5"></path></svg>';

  const CATEGORY_SEEDS = [
    { id: "investment", name: "投資", color: "#a9d6ff", stores: ["NISA積立", "iDeCo"] },
    { id: "fixed", name: "固定費", color: "#c9d7ff", stores: ["アフラック保険", "都バス定期", "携帯代", "お家に"] },
    { id: "self-investment", name: "自己投資", color: "#d9f0c9", stores: ["Chat-GPT"] },
    { id: "online-shopping", name: "ネットショッピング", color: "#ffd0d7", stores: ["Amazon"] },
    { id: "daily-items", name: "日用品など", color: "#fff0b9", stores: ["ダイソー", "ニトリ", "ケユカ"] },
    { id: "fashion", name: "服飾雑貨", color: "#f5d7ff", stores: ["靴下屋"] },
    { id: "grocery", name: "スーパーでお買い物", color: "#dfe5ff", stores: ["コモディイイダ", "ワイズマート"] },
    { id: "dining", name: "外食", color: "#fff3c2", stores: ["餃子の満州", "タリーズ", "コンチャ", "スシロー"] },
    { id: "souvenir", name: "お土産", color: "#f7d8e2", stores: ["パン屋"] },
    { id: "transportation", name: "交通費", color: "#aeeff3", stores: ["都バス", "Suica"] }
  ];

  const dom = {};
  const runtime = {
    view: "main",
    toastTimer: null,
    serviceWorkerRegistration: null,
    reloadOnControllerChange: false,
    openNoteEntryId: ""
  };

  let state = loadState();

  init();

  function init() {
    cacheDom();
    populateMonthOptions();
    bindEvents();
    ensureMonthMaterialized(state.ui.selectedYear, state.ui.selectedMonth, true);
    restorePostRefreshToast();
    render();
    registerServiceWorker();
  }

  function cacheDom() {
    dom.mainView = document.getElementById("mainView");
    dom.summaryView = document.getElementById("summaryView");
    dom.settingsView = document.getElementById("settingsView");
    dom.yearLabel = document.getElementById("yearLabel");
    dom.summaryButton = document.getElementById("summaryButton");
    dom.monthTabs = document.getElementById("monthTabs");
    dom.monthSummary = document.getElementById("monthSummary");
    dom.categoryList = document.getElementById("categoryList");
    dom.summaryYearLabel = document.getElementById("summaryYearLabel");
    dom.yearSummaryList = document.getElementById("yearSummaryList");
    dom.categorySettingsList = document.getElementById("categorySettingsList");
    dom.storeCategorySelect = document.getElementById("storeCategorySelect");
    dom.storeOptionList = document.getElementById("storeOptionList");
    dom.recurringTemplateList = document.getElementById("recurringTemplateList");
    dom.backupOutput = document.getElementById("backupOutput");
    dom.restoreInput = document.getElementById("restoreInput");
    dom.newCategoryName = document.getElementById("newCategoryName");
    dom.newCategoryColor = document.getElementById("newCategoryColor");
    dom.newStoreOption = document.getElementById("newStoreOption");
    dom.recurringTemplateForm = document.getElementById("recurringTemplateForm");
    dom.templateId = document.getElementById("templateId");
    dom.templateCategory = document.getElementById("templateCategory");
    dom.templateStore = document.getElementById("templateStore");
    dom.templateDay = document.getElementById("templateDay");
    dom.templateInterval = document.getElementById("templateInterval");
    dom.templateStartYear = document.getElementById("templateStartYear");
    dom.templateStartMonth = document.getElementById("templateStartMonth");
    dom.templateAmount = document.getElementById("templateAmount");
    dom.templatePointEnabled = document.getElementById("templatePointEnabled");
    dom.templatePointAmount = document.getElementById("templatePointAmount");
    dom.templateItem = document.getElementById("templateItem");
    dom.templateGoodValuePoint = document.getElementById("templateGoodValuePoint");
    dom.templateRating = document.getElementById("templateRating");
    dom.templateNotes = document.getElementById("templateNotes");
    dom.addEntryButton = document.getElementById("addEntryButton");
    dom.sheetOverlay = document.getElementById("sheetOverlay");
    dom.entrySheet = document.getElementById("entrySheet");
    dom.sheetTitle = document.getElementById("sheetTitle");
    dom.entryForm = document.getElementById("entryForm");
    dom.entryId = document.getElementById("entryId");
    dom.entryCategory = document.getElementById("entryCategory");
    dom.entryDate = document.getElementById("entryDate");
    dom.entryStore = document.getElementById("entryStore");
    dom.entryStoreSelect = document.getElementById("entryStoreSelect");
    dom.entryAmount = document.getElementById("entryAmount");
    dom.entryPointEnabled = document.getElementById("entryPointEnabled");
    dom.entryPointAmount = document.getElementById("entryPointAmount");
    dom.entryItem = document.getElementById("entryItem");
    dom.entryGoodValuePoint = document.getElementById("entryGoodValuePoint");
    dom.entryRating = document.getElementById("entryRating");
    dom.entryNotes = document.getElementById("entryNotes");
    dom.deleteEntryButton = document.getElementById("deleteEntryButton");
    dom.toast = document.getElementById("toast");
  }

  function bindEvents() {
    document.getElementById("prevYearButton").addEventListener("click", function () {
      changeYear(-1);
    });

    document.getElementById("nextYearButton").addEventListener("click", function () {
      changeYear(1);
    });

    dom.summaryButton.addEventListener("click", function () {
      runtime.view = "summary";
      ensureYearMaterialized(state.ui.selectedYear);
      render();
    });

    document.getElementById("summaryBackButton").addEventListener("click", function () {
      runtime.view = "main";
      render();
    });

    document.getElementById("settingsButton").addEventListener("click", function () {
      runtime.view = "settings";
      render();
    });

    document.getElementById("settingsBackButton").addEventListener("click", function () {
      runtime.view = "main";
      render();
    });

    document.getElementById("refreshButton").addEventListener("click", handleAppRefresh);

    dom.monthTabs.addEventListener("click", function (event) {
      const button = event.target.closest("[data-month]");
      if (!button) {
        return;
      }

      state.ui.selectedMonth = Number(button.dataset.month);
      ensureMonthMaterialized(state.ui.selectedYear, state.ui.selectedMonth, true);
      saveState();
      render();
    });

    dom.categoryList.addEventListener("click", function (event) {
      const actionButton = event.target.closest("[data-action]");
      if (!actionButton) {
        return;
      }

      const action = actionButton.dataset.action;
      const categoryId = actionButton.dataset.categoryId;
      const entryId = actionButton.dataset.entryId;

      if (action === "toggle-category" && categoryId) {
        toggleCategory(categoryId);
      }

      if (action === "add-entry" && categoryId) {
        openEntrySheet(null, categoryId);
      }

      if (action === "toggle-note" && entryId) {
        toggleNote(entryId);
      }

      if (action === "edit-entry" && entryId) {
        openEntrySheet(entryId, null);
      }
    });

    dom.yearSummaryList.addEventListener("click", function (event) {
      const button = event.target.closest("[data-summary-month]");
      if (!button) {
        return;
      }

      state.ui.selectedMonth = Number(button.dataset.summaryMonth);
      runtime.view = "main";
      ensureMonthMaterialized(state.ui.selectedYear, state.ui.selectedMonth, true);
      saveState();
      render();
    });

    dom.addEntryButton.addEventListener("click", function () {
      openEntrySheet(null, null);
    });

    document.getElementById("closeSheetButton").addEventListener("click", closeEntrySheet);
    document.getElementById("cancelEntryButton").addEventListener("click", closeEntrySheet);
    dom.sheetOverlay.addEventListener("click", closeEntrySheet);

    dom.entryCategory.addEventListener("change", function () {
      refreshEntryStoreOptions();
    });

    dom.entryStoreSelect.addEventListener("change", function () {
      if (!dom.entryStoreSelect.value) {
        return;
      }

      dom.entryStore.value = dom.entryStoreSelect.value;
      dom.entryStoreSelect.value = "";
    });

    dom.entryPointEnabled.addEventListener("change", toggleEntryPointAmountState);

    dom.entryForm.addEventListener("submit", function (event) {
      event.preventDefault();
      saveEntryFromSheet();
    });

    dom.deleteEntryButton.addEventListener("click", deleteEntryFromSheet);

    document.getElementById("createBackupButton").addEventListener("click", createBackupString);
    document.getElementById("copyBackupButton").addEventListener("click", copyBackupString);
    document.getElementById("restoreBackupButton").addEventListener("click", restoreBackupString);

    document.getElementById("addCategoryForm").addEventListener("submit", function (event) {
      event.preventDefault();
      addCategory();
    });

    dom.categorySettingsList.addEventListener("change", function (event) {
      const target = event.target;
      const categoryId = target.dataset.categoryId;
      const field = target.dataset.field;
      if (!categoryId || !field) {
        return;
      }

      const category = findCategory(categoryId);
      if (!category) {
        return;
      }

      if (field === "name") {
        const nextName = cleanText(target.value, 24);
        if (!nextName) {
          target.value = category.name;
          showToast("カテゴリ名は空欄にできません");
          return;
        }

        category.name = nextName;
      }

      if (field === "color") {
        category.color = normalizeHexColor(target.value) || category.color;
      }

      saveState();
      render();
    });

    dom.categorySettingsList.addEventListener("click", function (event) {
      const button = event.target.closest("[data-category-action]");
      if (!button) {
        return;
      }

      const categoryId = button.dataset.categoryId;
      if (!categoryId) {
        return;
      }

      if (button.dataset.categoryAction === "move-up") {
        moveCategory(categoryId, -1);
      }

      if (button.dataset.categoryAction === "move-down") {
        moveCategory(categoryId, 1);
      }
    });

    dom.storeCategorySelect.addEventListener("change", function () {
      state.ui.settingsStoreCategoryId = dom.storeCategorySelect.value;
      saveState();
      renderStoreOptionList();
    });

    document.getElementById("addStoreOptionForm").addEventListener("submit", function (event) {
      event.preventDefault();
      addStoreOption();
    });

    dom.storeOptionList.addEventListener("click", function (event) {
      const button = event.target.closest("[data-store-action]");
      if (!button) {
        return;
      }

      const categoryId = button.dataset.categoryId;
      const index = Number(button.dataset.index);

      if (!categoryId || Number.isNaN(index)) {
        return;
      }

      if (button.dataset.storeAction === "delete") {
        removeStoreOption(categoryId, index);
      }

      if (button.dataset.storeAction === "move-up") {
        moveStoreOption(categoryId, index, -1);
      }

      if (button.dataset.storeAction === "move-down") {
        moveStoreOption(categoryId, index, 1);
      }
    });

    dom.recurringTemplateList.addEventListener("click", function (event) {
      const button = event.target.closest("[data-template-action]");
      if (!button) {
        return;
      }

      const templateId = button.dataset.templateId;
      if (!templateId) {
        return;
      }

      if (button.dataset.templateAction === "edit") {
        fillTemplateForm(templateId);
      }

      if (button.dataset.templateAction === "delete") {
        deleteTemplate(templateId);
      }
    });

    dom.recurringTemplateForm.addEventListener("submit", function (event) {
      event.preventDefault();
      saveRecurringTemplate();
    });

    document.getElementById("resetTemplateButton").addEventListener("click", function () {
      resetTemplateForm();
    });

    dom.templatePointEnabled.addEventListener("change", toggleTemplatePointAmountState);
  }

  function render() {
    if (runtime.view === "summary") {
      ensureYearMaterialized(state.ui.selectedYear);
    } else {
      ensureMonthMaterialized(state.ui.selectedYear, state.ui.selectedMonth, true);
    }

    dom.mainView.classList.toggle("hidden", runtime.view !== "main");
    dom.summaryView.classList.toggle("hidden", runtime.view !== "summary");
    dom.settingsView.classList.toggle("hidden", runtime.view !== "settings");
    dom.addEntryButton.classList.toggle("hidden", runtime.view !== "main");

    renderHeader();
    renderMonthTabs();
    renderMonthSummary();
    renderCategoryList();
    renderYearSummary();
    renderCategorySelects();
    renderCategorySettingsList();
    renderStoreOptionList();
    renderRecurringTemplateList();
    toggleEntryPointAmountState();
    toggleTemplatePointAmountState();
  }

  function renderHeader() {
    dom.yearLabel.textContent = state.ui.selectedYear + "年";
    dom.summaryButton.textContent = state.ui.selectedYear + "年まとめ";
    dom.summaryYearLabel.textContent = state.ui.selectedYear + "年の集計";
  }

  function renderMonthTabs() {
    const activeMonth = state.ui.selectedMonth;
    dom.monthTabs.innerHTML = MONTH_LABELS.map(function (label, index) {
      const month = index + 1;
      return '<button class="month-tab' + (month === activeMonth ? " active" : "") + '" type="button" data-month="' + month + '">' + escapeHtml(label) + "</button>";
    }).join("");

    window.requestAnimationFrame(function () {
      const activeButton = dom.monthTabs.querySelector(".month-tab.active");
      if (!activeButton) {
        return;
      }

      const targetLeft = activeButton.offsetLeft - 16;
      dom.monthTabs.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
    });
  }

  function renderMonthSummary() {
    const entries = getEntriesForMonth(state.ui.selectedYear, state.ui.selectedMonth);
    const totals = calculateTotals(entries);

    dom.monthSummary.innerHTML = [
      renderSummaryCard("総利用額", totals.total),
      renderSummaryCard("実質支払額", totals.actual),
      renderSummaryCard("ポイント利用額", totals.point)
    ].join("");
  }

  function renderSummaryCard(label, value) {
    return '<article class="summary-card"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(formatCurrency(value)) + "</strong></article>";
  }

  function renderCategoryList() {
    const monthEntries = getEntriesForMonth(state.ui.selectedYear, state.ui.selectedMonth);

    dom.categoryList.innerHTML = state.categories.map(function (category) {
      const entries = sortEntries(monthEntries.filter(function (entry) {
        return entry.categoryId === category.id;
      }));
      const totals = calculateTotals(entries);
      const isCollapsed = Boolean(category.collapsed);
      const styleValue = "--category-color:" + category.color + ";--category-soft:" + hexToRgba(category.color, 0.2) + ";--category-soft-strong:" + hexToRgba(category.color, 0.94);
      const categoryMetaParts = [];

      if (totals.actual !== 0) {
        categoryMetaParts.push('<span class="meta-pill">支払 ' + escapeHtml(formatCurrency(totals.actual)) + "</span>");
      }

      if (totals.point !== 0) {
        categoryMetaParts.push('<span class="meta-pill category-point-pill">Pt ' + escapeHtml(formatCurrency(totals.point)) + "</span>");
      }

      return (
        '<section class="category-card" style="' + styleValue + '">' +
        '<div class="category-header">' +
        '<button class="category-toggle category-main-toggle" type="button" data-action="toggle-category" data-category-id="' + escapeHtml(category.id) + '">' +
        '<span class="category-title">' +
        '<span class="category-name">' + escapeHtml(category.name) + "</span>" +
        (categoryMetaParts.length ? '<span class="category-submeta">' + categoryMetaParts.join("") + "</span>" : "") +
        "</span>" +
        "</button>" +
        '<div class="category-header-actions">' +
        '<button class="category-quick-add" type="button" data-action="add-entry" data-category-id="' + escapeHtml(category.id) + '" aria-label="明細を追加">' + PENCIL_ICON + "</button>" +
        '<button class="category-toggle category-total" type="button" data-action="toggle-category" data-category-id="' + escapeHtml(category.id) + '"><strong>' + escapeHtml(formatCurrency(totals.total)) + '</strong><span class="meta-pill">' + (isCollapsed ? "開く" : "閉じる") + "</span></button>" +
        "</div>" +
        "</div>" +
        (isCollapsed ? "" : renderCategoryBody(category, entries)) +
        "</section>"
      );
    }).join("");
  }

  function renderCategoryBody(category, entries) {
    return (
      '<div class="category-body">' +
      (entries.length ? '<div class="entry-list">' + entries.map(renderEntryRow).join("") + "</div>" : '<div class="empty-state">まだ明細がありません</div>') +
      "</div>"
    );
  }

  function renderEntryRow(entry) {
    const amount = parseMoney(entry.amount);
    const pointAmount = entry.pointEnabled ? parseMoney(entry.pointAmount) : 0;
    const total = amount + pointAmount;
    const storeLabel = entry.store || "店名未入力";
    const itemLabel = (entry.item || "").trim();
    const detailBlocks = [];
    const hasHiddenDetails = Boolean(itemLabel || entry.goodValuePoint || entry.notes);
    const noteButton = hasHiddenDetails
      ? '<button class="note-icon-button" type="button" data-action="toggle-note" data-entry-id="' + escapeHtml(entry.id) + '" aria-label="詳細を表示">' + NOTE_ICON + "</button>"
      : "";
    const ratingClass = entry.rating === "⭐⭐⭐" ? " rating-three" : (entry.rating === "⭐⭐" ? " rating-two" : "");

    if (itemLabel) {
      detailBlocks.push('<div class="entry-detail-block"><p class="entry-detail-label">Item</p><p class="entry-detail-value">' + escapeHtml(itemLabel) + "</p></div>");
    }

    if (entry.goodValuePoint) {
      detailBlocks.push('<div class="entry-detail-block"><p class="entry-detail-label">good value point</p><p class="entry-detail-value">' + escapeHtml(entry.goodValuePoint) + "</p></div>");
    }

    if (entry.notes) {
      detailBlocks.push('<div class="entry-detail-block"><p class="entry-detail-label">Notes</p><p class="entry-detail-value">' + escapeHtml(entry.notes) + "</p></div>");
    }

    const noteBody = hasHiddenDetails && runtime.openNoteEntryId === entry.id
      ? '<div class="entry-note-popover">' + detailBlocks.join("") + "</div>"
      : "";
    const metaParts = [];

    if (amount !== 0) {
      metaParts.push('<span class="meta-pill entry-money-pill"><span class="entry-meta-label">支払</span><strong class="entry-meta-value">' + escapeHtml(formatCurrency(amount)) + "</strong></span>");
    }

    if (pointAmount !== 0) {
      metaParts.push('<span class="meta-pill entry-money-pill entry-point-pill"><span class="entry-meta-label">Pt</span><strong class="entry-meta-value">' + escapeHtml(formatCurrency(pointAmount)) + "</strong></span>");
    }

    metaParts.push('<span class="meta-pill entry-money-pill"><span class="entry-meta-label">合計</span><strong class="entry-meta-value">' + escapeHtml(formatCurrency(total)) + "</strong></span>");

    return (
      '<article class="entry-row' + ratingClass + '" data-action="edit-entry" data-entry-id="' + escapeHtml(entry.id) + '" role="button" tabindex="0">' +
      '<div class="entry-row-top"><span class="entry-date">' + escapeHtml(formatDateLabel(entry.date, entry.year, entry.month)) + '</span><span class="entry-store">' + escapeHtml(storeLabel) + '</span><span class="entry-top-actions">' + noteButton + '<span class="meta-pill entry-rating-pill">' + escapeHtml(entry.rating || "未評価") + "</span></span></div>" +
      '<div class="entry-row-meta">' + metaParts.join("") + "</div>" +
      noteBody +
      "</article>"
    );
  }

  function renderYearSummary() {
    dom.yearSummaryList.innerHTML = MONTH_LABELS.map(function (label, index) {
      const month = index + 1;
      const entries = getEntriesForMonth(state.ui.selectedYear, month);
      const totals = calculateTotals(entries);

      return (
        '<button class="summary-row" type="button" data-summary-month="' + month + '">' +
        '<span class="summary-row-month">' + escapeHtml(label) + "</span>" +
        '<span class="summary-values"><span>総利用額<strong>' + escapeHtml(formatCurrency(totals.total)) + '</strong></span><span>実質支払額<strong>' + escapeHtml(formatCurrency(totals.actual)) + '</strong></span><span>Pt利用<strong>' + escapeHtml(formatCurrency(totals.point)) + "</strong></span></span>" +
        "</button>"
      );
    }).join("");
  }

  function renderCategorySelects() {
    const currentCategory = dom.entryCategory.value || state.categories[0].id;
    const settingsCategory = state.ui.settingsStoreCategoryId || state.categories[0].id;
    const templateCategory = dom.templateCategory.value || state.categories[0].id;
    const optionsHtml = state.categories.map(function (category) {
      return '<option value="' + escapeHtml(category.id) + '">' + escapeHtml(category.name) + "</option>";
    }).join("");

    dom.entryCategory.innerHTML = optionsHtml;
    dom.storeCategorySelect.innerHTML = optionsHtml;
    dom.templateCategory.innerHTML = optionsHtml;

    dom.entryCategory.value = findCategory(currentCategory) ? currentCategory : state.categories[0].id;
    dom.storeCategorySelect.value = findCategory(settingsCategory) ? settingsCategory : state.categories[0].id;
    dom.templateCategory.value = findCategory(templateCategory) ? templateCategory : state.categories[0].id;
    refreshEntryStoreOptions();
  }

  function renderCategorySettingsList() {
    dom.categorySettingsList.innerHTML = state.categories.map(function (category, index) {
      return (
        '<div class="settings-row">' +
        '<div class="settings-row-head">' +
        '<div class="inline-columns">' +
        '<label><span class="field-label">カテゴリ名</span><input class="text-input" type="text" value="' + escapeHtml(category.name) + '" data-category-id="' + escapeHtml(category.id) + '" data-field="name" maxlength="24"></label>' +
        '<label><span class="field-label">色</span><input class="color-input" type="color" value="' + escapeHtml(category.color) + '" data-category-id="' + escapeHtml(category.id) + '" data-field="color"></label>' +
        "</div>" +
        '<div class="settings-row-actions">' +
        '<button class="action-chip" type="button" data-category-action="move-up" data-category-id="' + escapeHtml(category.id) + '"' + (index === 0 ? " disabled" : "") + '>↑</button>' +
        '<button class="action-chip" type="button" data-category-action="move-down" data-category-id="' + escapeHtml(category.id) + '"' + (index === state.categories.length - 1 ? " disabled" : "") + '>↓</button>' +
        "</div>" +
        "</div>" +
        "</div>"
      );
    }).join("");
  }

  function renderStoreOptionList() {
    const categoryId = state.ui.settingsStoreCategoryId && findCategory(state.ui.settingsStoreCategoryId)
      ? state.ui.settingsStoreCategoryId
      : state.categories[0].id;
    const options = getStoreOptions(categoryId);

    state.ui.settingsStoreCategoryId = categoryId;

    dom.storeOptionList.innerHTML = options.length
      ? options.map(function (option, index) {
        return (
          '<div class="compact-row">' +
          "<strong>" + escapeHtml(option) + "</strong>" +
          '<span class="compact-actions">' +
          '<button class="action-chip" type="button" data-store-action="move-up" data-category-id="' + escapeHtml(categoryId) + '" data-index="' + index + '"' + (index === 0 ? " disabled" : "") + '>↑</button>' +
          '<button class="action-chip" type="button" data-store-action="move-down" data-category-id="' + escapeHtml(categoryId) + '" data-index="' + index + '"' + (index === options.length - 1 ? " disabled" : "") + '>↓</button>' +
          '<button class="action-chip" type="button" data-store-action="delete" data-category-id="' + escapeHtml(categoryId) + '" data-index="' + index + '">削除</button>' +
          "</span>" +
          "</div>"
        );
      }).join("")
      : '<div class="empty-state">このカテゴリの店名候補はまだありません</div>';
  }

  function renderRecurringTemplateList() {
    dom.recurringTemplateList.innerHTML = state.recurringTemplates.length
      ? state.recurringTemplates.map(function (template) {
        const category = findCategory(template.categoryId);
        const amount = parseMoney(template.amount);
        const pointAmount = template.pointEnabled ? parseMoney(template.pointAmount) : 0;

        return (
          '<div class="template-row">' +
          '<div class="template-row-head">' +
          '<div><strong>' + escapeHtml(template.store || "定期項目") + "</strong>" +
          '<div class="template-summary">' +
          '<span class="meta-pill">' + escapeHtml(category ? category.name : "カテゴリなし") + "</span>" +
          '<span class="meta-pill">' + escapeHtml(template.startYear + "年" + template.startMonth + "月開始") + "</span>" +
          '<span class="meta-pill">' + escapeHtml(template.intervalMonths + "か月ごと") + "</span>" +
          '<span class="meta-pill">' + escapeHtml("Amount " + formatCurrency(amount)) + "</span>" +
          (template.pointEnabled ? '<span class="meta-pill">Pt ' + escapeHtml(formatCurrency(pointAmount)) + "</span>" : "") +
          "</div></div>" +
          '<div class="template-row-actions">' +
          '<button class="action-chip" type="button" data-template-action="edit" data-template-id="' + escapeHtml(template.id) + '">編集</button>' +
          '<button class="action-chip" type="button" data-template-action="delete" data-template-id="' + escapeHtml(template.id) + '">削除</button>' +
          "</div>" +
          "</div>" +
          (template.notes ? '<div class="entry-notes">Notes: ' + escapeHtml(template.notes) + "</div>" : "") +
          "</div>"
        );
      }).join("")
      : '<div class="empty-state">定期入力はまだありません</div>';
  }

  function changeYear(delta) {
    state.ui.selectedYear += delta;
    saveState();
    render();
  }

  function toggleCategory(categoryId) {
    const category = findCategory(categoryId);
    if (!category) {
      return;
    }

    category.collapsed = !category.collapsed;
    saveState();
    renderCategoryList();
  }

  function toggleNote(entryId) {
    runtime.openNoteEntryId = runtime.openNoteEntryId === entryId ? "" : entryId;
    renderCategoryList();
  }

  function addCategory() {
    const name = cleanText(dom.newCategoryName.value, 24);
    if (!name) {
      showToast("カテゴリ名を入力してください");
      return;
    }

    const color = normalizeHexColor(dom.newCategoryColor.value) || "#ffc38f";
    const newId = "custom-" + Date.now();

    state.categories.push({
      id: newId,
      name: name,
      color: color,
      collapsed: false
    });
    state.storeOptions[newId] = [];
    state.ui.settingsStoreCategoryId = newId;

    dom.newCategoryName.value = "";
    dom.newCategoryColor.value = "#ffc38f";
    saveState();
    render();
    showToast("カテゴリを追加しました");
  }

  function moveCategory(categoryId, delta) {
    const index = state.categories.findIndex(function (category) {
      return category.id === categoryId;
    });
    const nextIndex = index + delta;

    if (index < 0 || nextIndex < 0 || nextIndex >= state.categories.length) {
      return;
    }

    const moved = state.categories.splice(index, 1)[0];
    state.categories.splice(nextIndex, 0, moved);
    saveState();
    render();
  }

  function addStoreOption() {
    const categoryId = state.ui.settingsStoreCategoryId || state.categories[0].id;
    const storeName = cleanText(dom.newStoreOption.value, 40);

    if (!storeName) {
      showToast("店名候補を入力してください");
      return;
    }

    ensureStoreOption(categoryId, storeName);
    dom.newStoreOption.value = "";
    saveState();
    renderStoreOptionList();
    refreshEntryStoreOptions();
    showToast("店名候補を追加しました");
  }

  function removeStoreOption(categoryId, index) {
    const options = getStoreOptions(categoryId);
    if (!options[index]) {
      return;
    }

    options.splice(index, 1);
    saveState();
    renderStoreOptionList();
    refreshEntryStoreOptions();
  }

  function moveStoreOption(categoryId, index, delta) {
    const options = getStoreOptions(categoryId);
    const nextIndex = index + delta;
    if (!options[index] || nextIndex < 0 || nextIndex >= options.length) {
      return;
    }

    const moved = options.splice(index, 1)[0];
    options.splice(nextIndex, 0, moved);
    saveState();
    renderStoreOptionList();
    refreshEntryStoreOptions();
  }

  function resetTemplateForm() {
    const today = getTodayParts();
    dom.templateId.value = "";
    dom.templateCategory.value = state.categories[0].id;
    dom.templateStore.value = "";
    dom.templateDay.value = "1";
    dom.templateInterval.value = "1";
    dom.templateStartYear.value = String(today.year);
    dom.templateStartMonth.value = String(today.month);
    dom.templateAmount.value = "";
    dom.templatePointEnabled.checked = false;
    dom.templatePointAmount.value = "";
    dom.templateItem.value = "";
    dom.templateGoodValuePoint.value = "";
    dom.templateRating.value = "";
    dom.templateNotes.value = "";
    toggleTemplatePointAmountState();
  }

  function fillTemplateForm(templateId) {
    const template = state.recurringTemplates.find(function (item) {
      return item.id === templateId;
    });

    if (!template) {
      return;
    }

    dom.templateId.value = template.id;
    dom.templateCategory.value = template.categoryId;
    dom.templateStore.value = template.store;
    dom.templateDay.value = String(template.day);
    dom.templateInterval.value = String(template.intervalMonths);
    dom.templateStartYear.value = String(template.startYear);
    dom.templateStartMonth.value = String(template.startMonth);
    dom.templateAmount.value = template.amount;
    dom.templatePointEnabled.checked = Boolean(template.pointEnabled);
    dom.templatePointAmount.value = template.pointAmount;
    dom.templateItem.value = template.item;
    dom.templateGoodValuePoint.value = template.goodValuePoint;
    dom.templateRating.value = template.rating;
    dom.templateNotes.value = template.notes;
    toggleTemplatePointAmountState();
    dom.recurringTemplateForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function saveRecurringTemplate() {
    const template = {
      id: dom.templateId.value || ("template-" + Date.now()),
      categoryId: dom.templateCategory.value || state.categories[0].id,
      store: cleanText(dom.templateStore.value, 40),
      day: clampNumber(dom.templateDay.value, 1, 31, 1),
      intervalMonths: clampNumber(dom.templateInterval.value, 1, 12, 1),
      startYear: clampNumber(dom.templateStartYear.value, 2000, 2100, getTodayParts().year),
      startMonth: clampNumber(dom.templateStartMonth.value, 1, 12, getTodayParts().month),
      amount: cleanNumericText(dom.templateAmount.value),
      pointEnabled: Boolean(dom.templatePointEnabled.checked),
      pointAmount: cleanNumericText(dom.templatePointAmount.value),
      item: cleanText(dom.templateItem.value, 100),
      goodValuePoint: cleanText(dom.templateGoodValuePoint.value, 100),
      rating: dom.templateRating.value || "",
      notes: cleanText(dom.templateNotes.value, 240)
    };

    if (!findCategory(template.categoryId)) {
      showToast("カテゴリを選んでください");
      return;
    }

    const existingIndex = state.recurringTemplates.findIndex(function (item) {
      return item.id === template.id;
    });

    if (existingIndex >= 0) {
      state.recurringTemplates[existingIndex] = template;
      syncEntriesForTemplate(template);
      showToast("定期入力を更新しました");
    } else {
      state.recurringTemplates.push(template);
      showToast("定期入力を追加しました");
    }

    ensureStoreOption(template.categoryId, template.store);
    ensureMonthMaterialized(state.ui.selectedYear, state.ui.selectedMonth, true);
    saveState();
    render();
    resetTemplateForm();
  }

  function deleteTemplate(templateId) {
    const template = state.recurringTemplates.find(function (item) {
      return item.id === templateId;
    });
    if (!template) {
      return;
    }

    const confirmed = window.confirm("この定期入力を削除しますか？ 既存の明細は残します。");
    if (!confirmed) {
      return;
    }

    state.recurringTemplates = state.recurringTemplates.filter(function (item) {
      return item.id !== templateId;
    });

    state.entries = state.entries.map(function (entry) {
      if (entry.templateId !== templateId) {
        return entry;
      }

      return Object.assign({}, entry, {
        templateId: "",
        generatedYear: null,
        generatedMonth: null,
        manualOverride: true
      });
    });

    if (dom.templateId.value === templateId) {
      resetTemplateForm();
    }

    saveState();
    render();
    showToast("定期入力を削除しました");
  }

  function openEntrySheet(entryId, categoryId) {
    const entry = entryId ? findEntry(entryId) : null;
    const today = getTodayParts();
    const defaultDate = state.ui.selectedYear === today.year && state.ui.selectedMonth === today.month
      ? today.dateString
      : buildDateString(state.ui.selectedYear, state.ui.selectedMonth, 1);

    dom.entryId.value = entry ? entry.id : "";
    dom.sheetTitle.textContent = entry ? "明細を編集" : "明細を追加";
    dom.deleteEntryButton.classList.toggle("hidden", !entry);
    dom.entryCategory.value = entry ? entry.categoryId : (categoryId || state.categories[0].id);
    dom.entryDate.value = entry ? entry.date : defaultDate;
    dom.entryStore.value = entry ? entry.store : "";
    dom.entryAmount.value = entry ? entry.amount : "";
    dom.entryPointEnabled.checked = entry ? Boolean(entry.pointEnabled) : false;
    dom.entryPointAmount.value = entry ? entry.pointAmount : "";
    dom.entryItem.value = entry ? entry.item : "";
    dom.entryGoodValuePoint.value = entry ? entry.goodValuePoint : "";
    dom.entryRating.value = entry ? entry.rating : "";
    dom.entryNotes.value = entry ? entry.notes : "";

    refreshEntryStoreOptions();
    toggleEntryPointAmountState();

    dom.sheetOverlay.classList.remove("hidden");
    dom.entrySheet.classList.remove("hidden");
    dom.entrySheet.scrollTop = 0;
    window.requestAnimationFrame(function () {
      dom.entrySheet.scrollTop = 0;
      if (typeof dom.entrySheet.scrollTo === "function") {
        dom.entrySheet.scrollTo(0, 0);
      }
    });
  }

  function closeEntrySheet() {
    dom.sheetOverlay.classList.add("hidden");
    dom.entrySheet.classList.add("hidden");
  }

  function refreshEntryStoreOptions() {
    const categoryId = dom.entryCategory.value || state.categories[0].id;
    const options = getStoreOptions(categoryId);
    const currentStore = dom.entryStore.value;

    dom.entryStoreSelect.innerHTML = '<option value="">候補から選ぶ</option>' + options.map(function (option) {
      return '<option value="' + escapeHtml(option) + '">' + escapeHtml(option) + "</option>";
    }).join("");

    dom.entryStoreSelect.value = options.indexOf(currentStore) >= 0 ? currentStore : "";
  }

  function toggleEntryPointAmountState() {
    dom.entryPointAmount.disabled = !dom.entryPointEnabled.checked;
    if (!dom.entryPointEnabled.checked) {
      dom.entryPointAmount.value = "";
    }
  }

  function toggleTemplatePointAmountState() {
    dom.templatePointAmount.disabled = !dom.templatePointEnabled.checked;
    if (!dom.templatePointEnabled.checked) {
      dom.templatePointAmount.value = "";
    }
  }

  function saveEntryFromSheet() {
    const dateValue = dom.entryDate.value;
    const yearMonth = dateValue ? extractYearMonth(dateValue) : { year: state.ui.selectedYear, month: state.ui.selectedMonth };
    const entryId = dom.entryId.value || ("entry-" + Date.now());
    const existing = dom.entryId.value ? findEntry(dom.entryId.value) : null;
    const categoryId = dom.entryCategory.value || state.categories[0].id;

    if (!findCategory(categoryId)) {
      showToast("カテゴリを選んでください");
      return;
    }

    const entry = {
      id: entryId,
      year: yearMonth.year,
      month: yearMonth.month,
      date: dateValue,
      categoryId: categoryId,
      store: cleanText(dom.entryStore.value, 40),
      amount: cleanNumericText(dom.entryAmount.value),
      pointEnabled: Boolean(dom.entryPointEnabled.checked),
      pointAmount: cleanNumericText(dom.entryPointAmount.value),
      item: cleanText(dom.entryItem.value, 100),
      goodValuePoint: cleanText(dom.entryGoodValuePoint.value, 100),
      rating: dom.entryRating.value || "",
      notes: cleanText(dom.entryNotes.value, 240),
      templateId: existing ? existing.templateId : "",
      generatedYear: existing ? existing.generatedYear : null,
      generatedMonth: existing ? existing.generatedMonth : null,
      manualOverride: existing && existing.templateId ? true : Boolean(existing && existing.manualOverride),
      updatedAt: new Date().toISOString()
    };

    if (existing) {
      const index = state.entries.findIndex(function (item) {
        return item.id === existing.id;
      });
      state.entries[index] = entry;
    } else {
      state.entries.push(entry);
    }

    ensureStoreOption(categoryId, entry.store);

    state.ui.selectedYear = entry.year;
    state.ui.selectedMonth = entry.month;
    saveState();
    closeEntrySheet();
    runtime.view = "main";
    render();
    showToast(existing ? "明細を更新しました" : "明細を追加しました");
  }

  function deleteEntryFromSheet() {
    const entryId = dom.entryId.value;
    if (!entryId) {
      return;
    }

    const confirmed = window.confirm("この明細を削除しますか？");
    if (!confirmed) {
      return;
    }

    state.entries = state.entries.filter(function (entry) {
      return entry.id !== entryId;
    });

    saveState();
    closeEntrySheet();
    render();
    showToast("明細を削除しました");
  }

  function createBackupString() {
    const payload = {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      state: state
    };

    dom.backupOutput.value = JSON.stringify(payload);
    showToast("バックアップ文字列を作成しました");
  }

  async function copyBackupString() {
    const text = dom.backupOutput.value;
    if (!text) {
      showToast("先にバックアップを作成してください");
      return;
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        fallbackCopyText(dom.backupOutput);
      }

      showToast("コピーしました");
    } catch (error) {
      fallbackCopyText(dom.backupOutput);
      showToast("コピーできないため文字列を選択しました");
    }
  }

  function restoreBackupString() {
    const text = dom.restoreInput.value.trim();
    if (!text) {
      showToast("復元用文字列を貼り付けてください");
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      showToast("バックアップ文字列が壊れています");
      return;
    }

    if (!parsed || typeof parsed !== "object" || typeof parsed.schemaVersion !== "number" || !parsed.state) {
      showToast("バックアップ形式を確認できませんでした");
      return;
    }

    const confirmed = window.confirm("現在の保存データを復元データで置き換えます。実行しますか？");
    if (!confirmed) {
      return;
    }

    state = normalizeState(parsed.state);
    saveState();
    ensureMonthMaterialized(state.ui.selectedYear, state.ui.selectedMonth, true);
    runtime.view = "main";
    closeEntrySheet();
    render();
    showToast("復元しました");
  }

  async function handleAppRefresh() {
    const confirmed = window.confirm(UPDATE_CONFIRM_MESSAGE);
    if (!confirmed) {
      return;
    }

    showToast("更新を確認しています");

    try {
      let updateDetected = false;
      let registration = runtime.serviceWorkerRegistration;

      if ("serviceWorker" in navigator) {
        registration = registration || await navigator.serviceWorker.getRegistration();
      }

      if (registration) {
        updateDetected = await checkForServiceWorkerUpdate(registration);
      }

      await clearManagedCaches();
      await fetchLatestAssets();
      sessionStorage.setItem(SESSION_TOAST_KEY, updateDetected ? "最新版を読み込みました" : "更新なし");

      if (registration && registration.waiting) {
        runtime.reloadOnControllerChange = true;
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }

      window.location.reload();
    } catch (error) {
      console.error(error);
      showToast("更新に失敗しました");
    }
  }

  async function checkForServiceWorkerUpdate(registration) {
    if (registration.waiting) {
      return true;
    }

    const resultPromise = new Promise(function (resolve) {
      let resolved = false;

      function finish(value) {
        if (!resolved) {
          resolved = true;
          resolve(value);
        }
      }

      registration.addEventListener("updatefound", function () {
        const worker = registration.installing;
        if (!worker) {
          finish(false);
          return;
        }

        worker.addEventListener("statechange", function () {
          if (worker.state === "installed") {
            finish(Boolean(navigator.serviceWorker.controller));
          }

          if (worker.state === "redundant") {
            finish(false);
          }
        });
      }, { once: true });

      setTimeout(function () {
        finish(Boolean(registration.waiting));
      }, 2000);
    });

    await registration.update();
    return resultPromise;
  }

  async function clearManagedCaches() {
    if (!("caches" in window)) {
      return;
    }

    const keys = await caches.keys();
    await Promise.all(keys.filter(function (key) {
      return key.indexOf(CACHE_PREFIX) === 0;
    }).map(function (key) {
      return caches.delete(key);
    }));
  }

  async function fetchLatestAssets() {
    const assets = [
      "./",
      "./index.html",
      "./styles.css?v=" + encodeURIComponent(APP_VERSION),
      "./app.js?v=" + encodeURIComponent(APP_VERSION),
      "./manifest.webmanifest?v=" + encodeURIComponent(APP_VERSION),
      "./icons/app-icon.svg"
    ];

    await Promise.all(assets.map(function (asset) {
      return fetch(asset, { cache: "reload" }).catch(function () {
        return null;
      });
    }));
  }

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register("./service-worker.js?v=" + encodeURIComponent(APP_VERSION));
      runtime.serviceWorkerRegistration = registration;
      navigator.serviceWorker.addEventListener("controllerchange", function () {
        if (!runtime.reloadOnControllerChange) {
          return;
        }

        runtime.reloadOnControllerChange = false;
        window.location.reload();
      });
    } catch (error) {
      console.error(error);
    }
  }

  function restorePostRefreshToast() {
    const message = sessionStorage.getItem(SESSION_TOAST_KEY);
    if (!message) {
      return;
    }

    sessionStorage.removeItem(SESSION_TOAST_KEY);
    window.requestAnimationFrame(function () {
      showToast(message);
    });
  }

  function showToast(message) {
    dom.toast.textContent = message;
    dom.toast.classList.add("visible");

    window.clearTimeout(runtime.toastTimer);
    runtime.toastTimer = window.setTimeout(function () {
      dom.toast.classList.remove("visible");
    }, 2400);
  }

  function loadState() {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return createDefaultState();
    }

    try {
      return normalizeState(JSON.parse(saved));
    } catch (error) {
      console.error(error);
      return createDefaultState();
    }
  }

  function saveState() {
    state.noteHistory = [];
    state.lastSavedAt = new Date().toISOString();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function createDefaultState() {
    const today = getTodayParts();
    const categories = CATEGORY_SEEDS.map(function (seed) {
      return {
        id: seed.id,
        name: seed.name,
        color: seed.color,
        collapsed: false
      };
    });
    const storeOptions = {};

    CATEGORY_SEEDS.forEach(function (seed) {
      storeOptions[seed.id] = seed.stores.slice();
    });

    return {
      schemaVersion: SCHEMA_VERSION,
      lastSavedAt: new Date().toISOString(),
      categories: categories,
      entries: [],
      recurringTemplates: createDefaultRecurringTemplates(today.year),
      storeOptions: storeOptions,
      noteHistory: [],
      ui: {
        selectedYear: today.year,
        selectedMonth: today.month,
        settingsStoreCategoryId: categories[0].id
      }
    };
  }

  function normalizeState(raw) {
    const fallback = createDefaultState();
    const normalizedCategories = Array.isArray(raw.categories)
      ? raw.categories.map(normalizeCategory).filter(Boolean)
      : [];

    CATEGORY_SEEDS.forEach(function (seed) {
      if (!normalizedCategories.some(function (category) {
        return category.id === seed.id;
      })) {
        normalizedCategories.push({
          id: seed.id,
          name: seed.name,
          color: seed.color,
          collapsed: false
        });
      }
    });

    const storeOptions = {};
    normalizedCategories.forEach(function (category) {
      const saved = raw.storeOptions && Array.isArray(raw.storeOptions[category.id]) ? raw.storeOptions[category.id] : [];
      const seed = CATEGORY_SEEDS.find(function (item) {
        return item.id === category.id;
      });
      storeOptions[category.id] = uniqueStrings(saved.concat(seed ? seed.stores : []));
    });

    const entries = Array.isArray(raw.entries) ? raw.entries.map(normalizeEntry).filter(Boolean) : [];
    const templates = Array.isArray(raw.recurringTemplates) && raw.recurringTemplates.length
      ? raw.recurringTemplates.map(normalizeTemplate).filter(Boolean)
      : fallback.recurringTemplates;

    const today = getTodayParts();
    const selectedYear = clampNumber(raw.ui && raw.ui.selectedYear, 2000, 2100, today.year);
    const selectedMonth = clampNumber(raw.ui && raw.ui.selectedMonth, 1, 12, today.month);
    const storeCategoryId = raw.ui && raw.ui.settingsStoreCategoryId;

    return {
      schemaVersion: SCHEMA_VERSION,
      lastSavedAt: cleanText(raw.lastSavedAt || "", 40),
      categories: normalizedCategories.length ? normalizedCategories : fallback.categories,
      entries: entries,
      recurringTemplates: templates,
      storeOptions: storeOptions,
      noteHistory: [],
      ui: {
        selectedYear: selectedYear,
        selectedMonth: selectedMonth,
        settingsStoreCategoryId: normalizedCategories.some(function (category) {
          return category.id === storeCategoryId;
        }) ? storeCategoryId : normalizedCategories[0].id
      }
    };
  }

  function normalizeCategory(category) {
    if (!category || typeof category !== "object" || !category.id) {
      return null;
    }

    return {
      id: cleanText(String(category.id), 48),
      name: cleanText(category.name || "", 24) || "カテゴリ",
      color: normalizeHexColor(category.color) || "#ffc38f",
      collapsed: Boolean(category.collapsed)
    };
  }

  function normalizeEntry(entry) {
    if (!entry || typeof entry !== "object" || !entry.id) {
      return null;
    }

    return {
      id: cleanText(String(entry.id), 64),
      year: clampNumber(entry.year, 2000, 2100, getTodayParts().year),
      month: clampNumber(entry.month, 1, 12, getTodayParts().month),
      date: cleanText(entry.date || "", 16),
      categoryId: cleanText(entry.categoryId || "", 48),
      store: cleanText(entry.store || "", 40),
      amount: cleanNumericText(entry.amount),
      pointEnabled: Boolean(entry.pointEnabled),
      pointAmount: cleanNumericText(entry.pointAmount),
      item: cleanText(entry.item || "", 100),
      goodValuePoint: cleanText(entry.goodValuePoint || "", 100),
      rating: normalizeRating(entry.rating),
      notes: cleanText(entry.notes || "", 240),
      templateId: cleanText(entry.templateId || "", 64),
      generatedYear: entry.generatedYear ? clampNumber(entry.generatedYear, 2000, 2100, null) : null,
      generatedMonth: entry.generatedMonth ? clampNumber(entry.generatedMonth, 1, 12, null) : null,
      manualOverride: Boolean(entry.manualOverride),
      updatedAt: cleanText(entry.updatedAt || "", 40)
    };
  }

  function normalizeTemplate(template) {
    if (!template || typeof template !== "object" || !template.id) {
      return null;
    }

    return {
      id: cleanText(String(template.id), 64),
      categoryId: cleanText(template.categoryId || "", 48),
      store: cleanText(template.store || "", 40),
      day: clampNumber(template.day, 1, 31, 1),
      intervalMonths: clampNumber(template.intervalMonths, 1, 12, 1),
      startYear: clampNumber(template.startYear, 2000, 2100, getTodayParts().year),
      startMonth: clampNumber(template.startMonth, 1, 12, getTodayParts().month),
      amount: cleanNumericText(template.amount),
      pointEnabled: Boolean(template.pointEnabled),
      pointAmount: cleanNumericText(template.pointAmount),
      item: cleanText(template.item || "", 100),
      goodValuePoint: cleanText(template.goodValuePoint || "", 100),
      rating: normalizeRating(template.rating),
      notes: cleanText(template.notes || "", 240)
    };
  }

  function createDefaultRecurringTemplates(currentYear) {
    return [
      { id: "template-investment-nisa", categoryId: "investment", store: "NISA積立", day: 1, intervalMonths: 1, startYear: currentYear, startMonth: 1, amount: "100000", pointEnabled: false, pointAmount: "", item: "積立投資", goodValuePoint: "楽天カード引落", rating: "", notes: "" },
      { id: "template-investment-ideco", categoryId: "investment", store: "iDeCo", day: 1, intervalMonths: 1, startYear: currentYear, startMonth: 1, amount: "23000", pointEnabled: false, pointAmount: "", item: "積立投資", goodValuePoint: "", rating: "", notes: "" },
      { id: "template-fixed-aflac", categoryId: "fixed", store: "アフラック保険", day: 1, intervalMonths: 1, startYear: currentYear, startMonth: 1, amount: "8695", pointEnabled: false, pointAmount: "", item: "保険料", goodValuePoint: "", rating: "", notes: "" },
      { id: "template-fixed-bus-pass", categoryId: "fixed", store: "都バス定期", day: 1, intervalMonths: 6, startYear: currentYear, startMonth: 2, amount: "51030", pointEnabled: false, pointAmount: "", item: "定期代", goodValuePoint: "", rating: "", notes: "6か月ごとの定期代" },
      { id: "template-fixed-mobile", categoryId: "fixed", store: "携帯代", day: 1, intervalMonths: 1, startYear: currentYear, startMonth: 1, amount: "2974", pointEnabled: false, pointAmount: "", item: "携帯代", goodValuePoint: "", rating: "", notes: "" },
      { id: "template-fixed-home", categoryId: "fixed", store: "お家に", day: 1, intervalMonths: 1, startYear: currentYear, startMonth: 1, amount: "20000", pointEnabled: false, pointAmount: "", item: "家計へ", goodValuePoint: "", rating: "", notes: "" },
      { id: "template-self-chatgpt", categoryId: "self-investment", store: "Chat-GPT", day: 1, intervalMonths: 1, startYear: currentYear, startMonth: 1, amount: "3000", pointEnabled: false, pointAmount: "", item: "サブスク", goodValuePoint: "", rating: "⭐⭐⭐", notes: "固定の自己投資" }
    ];
  }

  function ensureYearMaterialized(year) {
    const today = getTodayParts();
    const maxMonth = year < today.year ? 12 : year > today.year ? 0 : today.month;
    for (let month = 1; month <= maxMonth; month += 1) {
      ensureMonthMaterialized(year, month, false);
    }
  }

  function ensureMonthMaterialized(year, month, saveAfter) {
    let changed = false;

    state.recurringTemplates.forEach(function (template) {
      if (!templateAppliesToMonth(template, year, month)) {
        return;
      }

      const exists = state.entries.some(function (entry) {
        return entry.templateId === template.id && entry.generatedYear === year && entry.generatedMonth === month;
      });

      if (exists) {
        return;
      }

      state.entries.push(buildEntryFromTemplate(template, year, month));
      changed = true;
    });

    if (changed && saveAfter) {
      saveState();
    }
  }

  function syncEntriesForTemplate(template) {
    state.entries = state.entries.map(function (entry) {
      if (entry.templateId !== template.id || entry.manualOverride) {
        return entry;
      }

      if (!templateAppliesToMonth(template, entry.generatedYear, entry.generatedMonth)) {
        return null;
      }

      return buildEntryFromTemplate(template, entry.generatedYear, entry.generatedMonth, entry.id);
    }).filter(Boolean);
  }

  function buildEntryFromTemplate(template, year, month, existingId) {
    const day = clampNumber(template.day, 1, daysInMonth(year, month), 1);

    return {
      id: existingId || ("entry-" + template.id + "-" + year + "-" + month),
      year: year,
      month: month,
      date: buildDateString(year, month, day),
      categoryId: template.categoryId,
      store: template.store,
      amount: template.amount,
      pointEnabled: Boolean(template.pointEnabled),
      pointAmount: template.pointAmount,
      item: template.item,
      goodValuePoint: template.goodValuePoint,
      rating: template.rating,
      notes: template.notes,
      templateId: template.id,
      generatedYear: year,
      generatedMonth: month,
      manualOverride: false,
      updatedAt: new Date().toISOString()
    };
  }

  function templateAppliesToMonth(template, year, month) {
    if (!template || !template.startYear || !template.startMonth) {
      return false;
    }

    const startIndex = template.startYear * 12 + (template.startMonth - 1);
    const targetIndex = year * 12 + (month - 1);
    const diff = targetIndex - startIndex;
    return diff >= 0 && diff % template.intervalMonths === 0;
  }

  function getEntriesForMonth(year, month) {
    return state.entries.filter(function (entry) {
      return entry.year === year && entry.month === month;
    });
  }

  function calculateTotals(entries) {
    return entries.reduce(function (totals, entry) {
      const amount = parseMoney(entry.amount);
      const pointAmount = entry.pointEnabled ? parseMoney(entry.pointAmount) : 0;
      totals.actual += amount;
      totals.point += pointAmount;
      totals.total += amount + pointAmount;
      return totals;
    }, { actual: 0, point: 0, total: 0 });
  }

  function sortEntries(entries) {
    return entries.slice().sort(function (left, right) {
      const leftDate = left.date || "9999-99-99";
      const rightDate = right.date || "9999-99-99";

      if (leftDate !== rightDate) {
        return leftDate.localeCompare(rightDate);
      }

      return (left.updatedAt || "").localeCompare(right.updatedAt || "");
    });
  }

  function ensureStoreOption(categoryId, storeName) {
    const cleanStore = cleanText(storeName, 40);
    if (!cleanStore) {
      return;
    }

    if (!state.storeOptions[categoryId]) {
      state.storeOptions[categoryId] = [];
    }

    if (state.storeOptions[categoryId].indexOf(cleanStore) === -1) {
      state.storeOptions[categoryId].push(cleanStore);
    }
  }

  function getStoreOptions(categoryId) {
    if (!state.storeOptions[categoryId]) {
      state.storeOptions[categoryId] = [];
    }

    return state.storeOptions[categoryId];
  }

  function findCategory(categoryId) {
    return state.categories.find(function (category) {
      return category.id === categoryId;
    }) || null;
  }

  function findEntry(entryId) {
    return state.entries.find(function (entry) {
      return entry.id === entryId;
    }) || null;
  }

  function populateMonthOptions() {
    const options = MONTH_LABELS.map(function (label, index) {
      return '<option value="' + (index + 1) + '">' + escapeHtml(label) + "</option>";
    }).join("");
    dom.templateStartMonth.innerHTML = options;
    resetTemplateForm();
  }

  function normalizeHexColor(value) {
    if (typeof value !== "string") {
      return "";
    }

    const match = value.trim().match(/^#([0-9a-f]{6})$/i);
    return match ? "#" + match[1].toLowerCase() : "";
  }

  function cleanText(value, maxLength) {
    return String(value || "").trim().slice(0, maxLength);
  }

  function cleanNumericText(value) {
    const cleanValue = String(value || "").replace(/[^\d.]/g, "");
    if (!cleanValue) {
      return "";
    }

    const number = Number(cleanValue);
    if (!Number.isFinite(number) || number < 0) {
      return "";
    }

    return String(Math.floor(number));
  }

  function clampNumber(value, min, max, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return fallback;
    }

    return Math.max(min, Math.min(max, Math.floor(number)));
  }

  function parseMoney(value) {
    const number = Number(String(value || "").replace(/[^\d.-]/g, ""));
    return Number.isFinite(number) ? number : 0;
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0
    }).format(value);
  }

  function formatDateLabel(date, year, month) {
    if (!date) {
      return year + "/" + month;
    }

    const parts = date.split("-");
    if (parts.length !== 3) {
      return year + "/" + month;
    }

    const parsedYear = Number(parts[0]);
    const parsedMonth = Number(parts[1]);
    const parsedDay = Number(parts[2]);
    const parsedDate = new Date(parsedYear, parsedMonth - 1, parsedDay);

    if (
      !Number.isFinite(parsedYear) ||
      !Number.isFinite(parsedMonth) ||
      !Number.isFinite(parsedDay) ||
      parsedDate.getFullYear() !== parsedYear ||
      parsedDate.getMonth() !== parsedMonth - 1 ||
      parsedDate.getDate() !== parsedDay
    ) {
      return year + "/" + month;
    }

    return parsedMonth + "/" + parsedDay + "(" + WEEKDAY_LABELS[parsedDate.getDay()] + ")";
  }

  function buildDateString(year, month, day) {
    return year + "-" + pad(month) + "-" + pad(day);
  }

  function extractYearMonth(dateString) {
    const parts = String(dateString).split("-");
    return {
      year: Number(parts[0]),
      month: Number(parts[1])
    };
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function daysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  }

  function getTodayParts() {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      dateString: buildDateString(now.getFullYear(), now.getMonth() + 1, now.getDate())
    };
  }

  function normalizeRating(value) {
    if (value === "⭐" || value === "⭐⭐" || value === "⭐⭐⭐") {
      return value;
    }

    return "";
  }

  function uniqueStrings(values) {
    const seen = [];
    (values || []).forEach(function (value) {
      const text = cleanText(value, 240);
      if (text && seen.indexOf(text) === -1) {
        seen.push(text);
      }
    });
    return seen;
  }

  function fallbackCopyText(textarea) {
    textarea.removeAttribute("readonly");
    textarea.focus();
    textarea.select();
    document.execCommand("copy");
    textarea.setAttribute("readonly", "readonly");
  }

  function hexToRgba(hex, alpha) {
    const clean = normalizeHexColor(hex).replace("#", "");
    if (!clean) {
      return "rgba(255, 195, 143, " + alpha + ")";
    }

    const red = parseInt(clean.slice(0, 2), 16);
    const green = parseInt(clean.slice(2, 4), 16);
    const blue = parseInt(clean.slice(4, 6), 16);
    return "rgba(" + red + ", " + green + ", " + blue + ", " + alpha + ")";
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
