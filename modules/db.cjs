// db.cjs
// SQLiteデータベースへのアクセスを提供するモジュール

const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// データベース準備
const dbDir = process.env.PORTABLE_EXECUTABLE_DIR || app.getPath('userData');
const dbName = 'accounting.db';
const dbPath = path.join(dbDir, dbName);
const db = new Database(dbPath);

(function(db) {
  // スキーマ初期化
  const sqlPath = path.join(__dirname, 'scheme.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  db.exec(sql);

  // 初期マスタデータ投入 (暫定対応)
  const count = db.prepare(`SELECT COUNT(*) AS cnt FROM m_accounts`).get().cnt;
  if (count === 0) {
    const sqlPath = path.join(__dirname, 'masterdata.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    db.exec(sql);
  }
})(db);

// 全ての科目情報を事前に取得しておく
const accountRows = getAccounts(); 

// 科目情報 (account) を取得
function getAccounts() {
  return db.prepare('SELECT * FROM m_accounts').all();
}

// 科目情報 (subject) を取得
// excludeCashLike が true の場合, 現金, 預金, 未払金等の科目は取得しない
function getSubjects(excludeCashLike) {
  if (excludeCashLike) {
    return db.prepare(`SELECT * FROM v_subjects WHERE subject_id >= ? AND subject_id < ?`).all(300, 700)
  };
  return db.prepare(`SELECT * FROM v_subjects`).all();
}

// 指定年月の現金出納帳, 預金出納帳, 未払金出納帳を取得
function getJournals(month) {
  return db.prepare(`SELECT * FROM v_book WHERE month = ? ORDER BY date DESC`).all(month);
}

// 指定月の月次サマリーを取得
function getMonthlySummary(month) {
  return db.prepare(`SELECT * FROM v_monthly_cumulative_subject WHERE account_id < ? AND month = ?`).all(300, month);
}

// 指定科目の売上簿または経費を過去3年間分取得
function getSalesAndExpenses(month, accountId) {
  return db.prepare(`SELECT * FROM v_sales_subject WHERE month >= ? AND account_id = ? UNION SELECT * FROM v_expenses_subject WHERE month >= ? AND account_id = ? ORDER BY date DESC`).all(month - 300, accountId, month - 300, accountId);
}

// 指定科目の売上簿または経費の年次サマリーを取得
function getSalesAndExpensesSummary(year, accountId) {
  return db.prepare(`SELECT * FROM v_yearly_cumulative_subject WHERE year >= ? AND  account_id = ? ORDER BY year DESC`).all(year - 3, accountId);
}

// 指定月から1年間の月次累計レポートを取得
function getMonthlyCumulative(month) {
  return db.prepare(`SELECT * FROM v_monthly_cumulative_subject WHERE month >= ?`).all(month - 100);
}

// 指定月の月次残高レポートを取得
function getMonthlyBalance(month) {
  return db.prepare(`SELECT * FROM v_monthly_balance WHERE month = ?`).all(month);
}

// 指定年から7年間の年次累計レポートを取得
function getYearlyCumulative(year) {
  return db.prepare(`SELECT * FROM v_yearly_cumulative_subject WHERE year >= ?`).all(year - 7);
}

// 指定年の年次残高レポートを取得
function getYearlyBalance(year) {
  return db.prepare(`SELECT * FROM v_yearly_balance WHERE year = ?`).all(year);
}

function getLatestMonth() {
  return db.prepare(`SELECT max(month) AS month FROM t_month`).get().month;
}

function updateLatestMonth(month) {
  return db.prepare(`INSERT INTO t_month (month) VALUES (?)`).run(month);
}

// CSVの行データを仕訳データに変換
function convertToJournal(row) {
  if (Number(row['金額']) > 0) {
    return {
      date: parseDate(row['日付']),
      debit: parseId(row['口座名']),
      credit: parseId(row['カテゴリ']),
      amount: Number(row['金額']),
      note: row['メモ']
    };
  }

  if (Number(row['金額']) < 0) {
    return {
      date: parseDate(row['日付']),
      debit: parseId(row['カテゴリ']),
      credit: parseId(row['口座名']),
      amount: Number(row['金額']) * -1,
      note: row['メモ']
    };
  }

  return null;
}

// 仕訳データをDBに挿入
function insertJournals(journals) {
  const insertStmt = db.prepare(`
    INSERT INTO t_journal
    (date, debit, credit, amount, note)
    VALUES (?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(function (journals) {
    for (const j of journals) {
      insertStmt.run(j.date, j.debit, j.credit, j.amount, j.note);
    }
  });

  tx(journals);
}

// 日付文字列を 'YYYY-MM-DD' 形式に変換
function parseDate(text) {
  const d = new Date(text);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// 科目名から科目IDを取得
function parseId(text) {
  if (text === 'Cash Wallet') return 101;
  const account = accountRows.find(r => r['account'] === text);
  return account ? account['account_id'] : 990;
}

module.exports = {
  getSubjects,
  getJournals,
  getMonthlySummary,
  getSalesAndExpenses,
  getSalesAndExpensesSummary,
  getMonthlyCumulative,
  getMonthlyBalance,
  getYearlyCumulative,
  getYearlyBalance,
  getLatestMonth,
  updateLatestMonth,
  convertToJournal,
  insertJournals
};
