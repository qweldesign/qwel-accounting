// Vue
import { createApp } from 'https://cdnjs.cloudflare.com/ajax/libs/vue/3.0.0/vue.esm-browser.prod.js';

createApp({
  data() {
    return {
      currentPage: 'account',
      currentYear: 2026,
      currentMonth: 202601,
      currentMonthLabel: '2026.01',
      currentAccount: 300,
      inputMonth: 202601,
      subjects: [],
      labels: [],
      rows: [],
      summary: [],
      loading: false
    };
  },
  methods: {
    async initPage() {
      this.loading = true;
      if (this.currentPage === 'account') {
        await this.initAccountPage();
      }
      if (this.currentPage === 'subject') {
        await this.initSubjectPage();
      }
      if (this.currentPage === 'monthly') {
        await this.initMonthlyPage();
      }
      if (this.currentPage === 'yearly') {
        await this.initYearlyPage();
      }
      if (this.currentPage === 'import-csv') {
        await this.initImportCSVPage();
      }
      this.loading = false;
    },

    async changepage(page) {
      if (this.currentPage === page) return;
      this.currentPage = page;
      this.currentAccount = 300;
      this.subjects = [];
      this.labels = [];
      this.rows = [];
      this.summary = [];
      await this.initPage();
    },

    initMonth() {
      const date = new Date();
      const year = date.getFullYear();
      let month = date.getMonth();
      month = month === 0 ? 12 : month; // 先月を現在月として取得する
      this.currentYear = year;
      this.currentMonth = year * 100 + month;
      this.currentMonthLabel = this.makeMonthLabel(this.currentMonth);
    },

    getMonth(yyyymm, i) {
      const y = Math.floor(yyyymm / 100);
      const m = yyyymm - y * 100;
      const d = new Date(y, m - 1 + i);
      const year = d.getFullYear();
      const month = year * 100 + (d.getMonth() + 1);
      return { year, month };
    },

    getPrevMonth(yyyymm) {
      return this.getMonth(yyyymm, -1);
    },

    getNextMonth(yyyymm) {
      return this.getMonth(yyyymm, 1);
    },

    makeMonthLabel(yyyymm) {
      const year = Math.floor(Number(yyyymm) / 100);
      const month = Number(yyyymm) - year * 100;
      return `${String(year)}.${String(month).padStart(2, '0')}`;
    },

    async initAccountPage() {
      this.initMonth();
      await this.fetchJournals();
    },

    async fetchJournals() {
      this.rows = await window.api.getJournals(this.currentMonth);
      this.summary = await window.api.getMonthlySummary(this.currentMonth);
    },

    async initSubjectPage() {
      this.initMonth();
      this.subjects = await window.api.getSubjects(true);
      await this.fetchSubjects();
    },

    async fetchSubjects() {
      this.rows = await window.api.getSalesAndExpenses(this.currentMonth, this.currentAccount);
      this.summary = await window.api.getSalesAndExpensesSummary(this.currentYear, this.currentAccount);
    },

    async initMonthlyPage() {
      this.initMonth();
      await this.fetchMonthlyReport();
    },

    async fetchMonthlyReport() {
      this.subjects = await window.api.getSubjects(false);
      const rows = await window.api.getMonthlyCumulative(this.currentMonth);
      this.rows = this.makeMonthlyReport(rows);
      this.summary = await window.api.getMonthlyBalance(this.currentMonth);
    },

    async initYearlyPage() {
      this.initMonth();
      await this.fetchYearlyReport();
    },

    async fetchYearlyReport() {
      this.subjects = await window.api.getSubjects(false);
      const rows = await window.api.getYearlyCumulative(this.currentYear);
      this.rows = this.makeYearlyReport(rows);
      this.summary = await window.api.getYearlyBalance(this.currentYear);
    },

    makeMonthlyReport(rows) {
      const report = [];
      const currentYear = this.currentYear;
      const currentMonth = this.currentMonth - currentYear * 100;
      const months = [];
      const len = 7; // 当月から7ヶ月分
      for (let i = 0; i < len; i++) {
        let month = currentMonth - i;
        let year = currentYear;
        if (month <= 0) {
          month += 12;
          year -= 1;
        }
        months.unshift(year * 100 + month);
        this.labels.unshift(this.makeMonthLabel(months[0]));
      }
      const prevYear = this.currentMonth - 100; // 前年
      this.labels.unshift(this.makeMonthLabel(prevYear));
      this.subjects.forEach(subject => {
        const amounts = [];
        const lastYearAmount = rows.find(r => r.account_id === subject.subject_id && r.month === prevYear);
        amounts.push(lastYearAmount ? Number(lastYearAmount.cumulative_amount) : 0);
        for (let i = 0; i < len; i++) {
          const monthAmount = rows.find(r => r.account_id === subject.subject_id && r.month === months[i]);
          amounts.push(monthAmount ? Number(monthAmount.cumulative_amount) : 0);
        }
        if (amounts.every(amount => amount === 0)) {
          return; // 全て0ならスキップ
        }
        report.push({
          subject: subject.subject,
          amounts: amounts
        });
      });
      return report;
    },

    makeYearlyReport(rows) {
      const report = [];
      const years = [];
      const len = 6; // 当年から6年分
      for (let i = 0; i < len; i++) {
        const year = this.currentYear - i;
        years.unshift(year);
        this.labels.unshift(year);
      }
      this.subjects.forEach(subject => {
        const amounts = [];
        for (let i = 0; i < len; i++) {
          const monthAmount = rows.find(r => r.account_id === subject.subject_id && r.year === years[i]);
          amounts.push(monthAmount ? Number(monthAmount.cumulative_amount) : 0);
        }
        if (amounts.every(amount => amount === 0)) {
          return; // 全て0ならスキップ
        }
        report.push({
          subject: subject.subject,
          amounts: amounts
        });
      });
      return report;
    },

    moveMonth(i) {
      const { year, month } = this.getMonth(this.currentMonth, i);
      this.currentYear = year;
      this.currentMonth = month;
      this.currentMonthLabel = this.makeMonthLabel(this.currentMonth);
      this.subjects = [];
      this.labels = [];
      
      if (this.currentPage === 'account') {
        this.fetchJournals();
      }
      if (this.currentPage === 'monthly') {
        this.fetchMonthlyReport();
      }
    },

    prevMonth() {
      this.moveMonth(-1);
    },

    nextMonth() {
      this.moveMonth(1);
    },

    moveYear(i) {
      this.currentYear = this.currentYear + i;
      this.subjects = [];
      this.labels = [];
      
      this.fetchYearlyReport();
    },

    prevYear() {
      this.moveYear(-1);
    },

    nextYear() {
      this.moveYear(1);
    },

    // Drag and Drop to Import CSV
    async initImportCSVPage() {
      const latestMonth = await window.api.getLatestMonth();
      this.inputMonth = latestMonth ? this.getNextMonth(latestMonth).month : this.currentMonth;
    },

    handleDragOver(e) {
      e.preventDefault()
    },

    async handleDrop(e) {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (!file) return
      if (file.name === `${this.inputMonth}.csv` ) {
        await window.api.importCSV(file);
        await window.api.updateLatestMonth(this.inputMonth);
        this.inputMonth = this.getNextMonth(this.inputMonth).month;
      } else {
        alert(`ファイル名が不正です。${this.inputMonth}.csv をドロップしてください。`)
      }
    }
  },

  async mounted() {
    await this.initPage();
  }
}).mount('#app');

/**
 * Auto Copyright
 * © 2026 QWEL.DESIGN (https://qwel.design)
 * Released under the MIT License.
 * See LICENSE file for details.
 */

class AutoCopyright {
  constructor(startYear, companyName, elem) {
    elem ||= document.querySelector('.footer__copyright');
    if (elem) elem.innerHTML = this.generate(startYear, companyName);
  }

  generate(startYear, companyName) {
    const currentYear = new Date().getFullYear();
    return `&copy; ${startYear} - ${currentYear} ${companyName}`;
  }
}

new AutoCopyright(2019, 'QWEL.DESIGN');

/**
 * Back To Top:
 * トップへ戻るボタンの生成と制御
 * 
 * 使い方:
 * _back-to-top.scss をバンドルした css を読み込み,
 * インスタンス化するだけで自動的にボタンが生成・制御される
 * 
 * オプション:
 * offsetRatio: ボタンが出現する位置 (window.innerHeightの何倍か)
 */
class BackToTop {
  constructor(options = {}) {
    // オプション
    this.offsetRatio = options.offsetRatio || 0;

    // 状態管理
    this.isShown = false;
    
    // bind
    this.onScroll = this.onScroll.bind(this);
    this.onClick = this.onClick.bind(this);

    // ボタン生成
    this.createButton();

    // イベント登録
    this.handleEvents();

    // 初期表示
    this.updateVisibility();
  }

  createButton() {
    // ボタン要素
    this.btn = document.createElement('div');
    this.btn.classList.add('backToTop');
    this.btn.setAttribute('role', 'button');
    this.btn.setAttribute('tabindex', '0');
    this.btn.setAttribute('aria-label', 'トップへ戻る');

    // アイコン要素
    const icon = document.createElement('div');
    icon.classList.add('icon', 'is-chevron-up', 'is-lg');

    // span要素
    const span = document.createElement('span');
    span.classList.add('icon__span');

    // bodyに挿入
    icon.appendChild(span);
    this.btn.appendChild(icon);
    document.body.appendChild(this.btn);
  }

  handleEvents() {
    // ボタン操作
    this.btn.addEventListener('click', this.onClick);

    // ボタン表示制御
    window.addEventListener('scroll', this.onScroll, { passive: true });
  }

  onClick(event) {
    event.preventDefault();
    this.backToTop();
  }

  onScroll() {
    this.updateVisibility();
  }

  backToTop() {
    window.scroll({ top: 0, behavior: 'smooth' });
  }

  updateVisibility() {
    const shouldShow = window.innerHeight * this.offsetRatio < window.scrollY;
    if (shouldShow !== this.isShown) {
      this.isShown = shouldShow;
      this.btn.classList.toggle('is-active', shouldShow);
    }
  }

  destroy() {
    this.isShown = false;
    this.btn?.removeEventListener('click', this.onClick);
    this.btn?.remove();
    window.removeEventListener('scroll', this.onScroll);
  }
}

new BackToTop();
