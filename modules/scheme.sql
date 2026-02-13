BEGIN TRANSACTION;

-- テーブル作成
CREATE TABLE IF NOT EXISTS "m_accounts" (
	"account_id"	INTEGER UNIQUE,
	"account"	TEXT NOT NULL DEFAULT '',
	PRIMARY KEY("account_id")
);

CREATE TABLE IF NOT EXISTS "t_business" (
	"account_id"	INTEGER UNIQUE,
	"business_id"	INTEGER NOT NULL DEFAULT 1,
	PRIMARY KEY("account_id")
);

CREATE TABLE IF NOT EXISTS "t_journal" (
	"id"	INTEGER UNIQUE,
	"date"	TEXT NOT NULL DEFAULT (DATE('now', 'localtime')),
	"amount"	INTEGER NOT NULL DEFAULT 0,
	"debit"	INTEGER NOT NULL DEFAULT 1,
	"credit"	INTEGER NOT NULL DEFAULT 1,
	"note"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT)
);

CREATE TABLE IF NOT EXISTS "t_month" (
	"month"	INTEGER UNIQUE,
	PRIMARY KEY("month")
);

-- ビュー作成
-- 科目 (account) 一覧
CREATE VIEW IF NOT EXISTS v_accounts AS
SELECT m_accounts.account_id, m_accounts.account, CAST(m_accounts.account_id / 10 AS INT) * 10 AS subject_id, m_subjects.account AS subject
FROM m_accounts INNER JOIN m_accounts AS m_subjects ON CAST(m_accounts.account_id / 10 AS INT) * 10 = m_subjects.account_id;

-- 科目 (subject) 一覧
CREATE VIEW IF NOT EXISTS v_subjects AS
SELECT subject_id, subject
FROM v_accounts
WHERE CAST(subject_id / 10 AS INT) * 10 = subject_id
GROUP BY subject_id;

-- 仕訳帳
CREATE VIEW IF NOT EXISTS v_journal AS 
SELECT id, business_id, date, CAST(strftime('%Y%m', date(date)) AS INT) AS month, amount, debit_id, debit, credit_id, credit, note
FROM (SELECT id, date, amount, m_debit.account_id AS debit_id, m_debit.account AS debit, m_credit.account_id AS credit_id, m_credit.account AS credit, note,
CASE
	WHEN m_credit.account_id = 0 AND m_debit.account_id > m_credit.account_id THEN m_debit.account_id
	WHEN m_debit.account_id = 0 AND m_debit.account_id < m_credit.account_id THEN m_credit.account_id
	WHEN m_credit.account_id > 0 AND m_debit.account_id > m_credit.account_id THEN m_credit.account_id
	WHEN m_debit.account_id > 0 AND m_debit.account_id < m_credit.account_id THEN m_debit.account_id
	ELSE 1
END AS account_id
FROM t_journal INNER JOIN m_accounts AS m_debit ON t_journal.debit = m_debit.account_id INNER JOIN m_accounts AS m_credit ON t_journal.credit = m_credit.account_id) t INNER JOIN t_business ON t.account_id = t_business.account_id
UNION -- TG未払 カード返済
SELECT id, 1 AS business_id, date, CAST(strftime('%Y%m', date(date)) AS INT) AS month, amount, 201 AS debit_id, (SELECT account FROM m_accounts WHERE account_id = 201 ) AS debit, 903 AS credit_id, (SELECT account FROM m_accounts WHERE account_id = 903 ) AS credit, note
FROM (SELECT id, date, amount, debit, credit, note 
FROM t_journal
WHERE debit = 903 AND credit = 111 AND note LIKE '%Visaデビット翌月払い%') t
UNION -- NA未払 カード返済
SELECT id, 2 AS business_id, date, CAST(strftime('%Y%m', date(date)) AS INT) AS month, amount, 202 AS debit_id, (SELECT account FROM m_accounts WHERE account_id = 202 ) AS debit, 903 AS credit_id, (SELECT account FROM m_accounts WHERE account_id = 903 ) AS credit, note
FROM (SELECT id, date, amount, debit, credit, note 
FROM t_journal
WHERE debit = 903 AND credit = 112 AND note LIKE '%Visaデビット翌月払い%') t
UNION -- ジヤツクス カード返済
SELECT id, 1 AS business_id, date, CAST(strftime('%Y%m', date(date)) AS INT) AS month, amount, 203 AS debit_id, (SELECT account FROM m_accounts WHERE account_id = 203 ) AS debit, 903 AS credit_id, (SELECT account FROM m_accounts WHERE account_id = 903 ) AS credit, note
FROM (SELECT id, date, amount, debit, credit, note 
FROM t_journal
WHERE debit = 903 AND note LIKE '%ジヤツクス%') t
UNION -- ポケットカード カード返済
SELECT id, 2 AS business_id, date, CAST(strftime('%Y%m', date(date)) AS INT) AS month, amount, 204 AS debit_id, (SELECT account FROM m_accounts WHERE account_id = 204 ) AS debit, 903 AS credit_id, (SELECT account FROM m_accounts WHERE account_id = 903 ) AS credit, note
FROM (SELECT id, date, amount, debit, credit, note 
FROM t_journal
WHERE debit = 903 AND note LIKE '%ポケットカード%') t
UNION -- セゾン カード返済
SELECT id, 2 AS business_id, date, CAST(strftime('%Y%m', date(date)) AS INT) AS month, amount, 205 AS debit_id, (SELECT account FROM m_accounts WHERE account_id = 205 ) AS debit, 903 AS credit_id, (SELECT account FROM m_accounts WHERE account_id = 903 ) AS credit, note
FROM (SELECT id, date, amount, debit, credit, note 
FROM t_journal
WHERE debit = 903 AND note LIKE '%セゾン%') t
UNION -- TG預金 ATM入金
SELECT id, 1 AS business_id, date, CAST(strftime('%Y%m', date(date)) AS INT) AS month, amount, 901 AS debit_id, (SELECT account FROM m_accounts WHERE account_id = 901 ) AS debit, 101 AS credit_id, (SELECT account FROM m_accounts WHERE account_id = 101 ) AS credit, note
FROM (SELECT id, date, amount, debit, credit, note 
FROM t_journal
WHERE debit = 111 AND credit = 901) t
UNION -- NA預金 ATM入金
SELECT id, 2 AS business_id, date, CAST(strftime('%Y%m', date(date)) AS INT) AS month, amount, 901 AS debit_id, (SELECT account FROM m_accounts WHERE account_id = 901 ) AS debit, 102 AS credit_id, (SELECT account FROM m_accounts WHERE account_id = 102 ) AS credit, note
FROM (SELECT id, date, amount, debit, credit, note 
FROM t_journal
WHERE debit = 112 AND credit = 901) t
UNION -- 福井銀行 ATM入金
SELECT id, 1 AS business_id, date, CAST(strftime('%Y%m', date(date)) AS INT) AS month, amount, 901 AS debit_id, (SELECT account FROM m_accounts WHERE account_id = 901 ) AS debit, 101 AS credit_id, (SELECT account FROM m_accounts WHERE account_id = 101 ) AS credit, note
FROM (SELECT id, date, amount, debit, credit, note 
FROM t_journal
WHERE debit = 113 AND credit = 901) t
UNION -- 郵便局 ATM入金
SELECT id, 2 AS business_id, date, CAST(strftime('%Y%m', date(date)) AS INT) AS month, amount, 901 AS debit_id, (SELECT account FROM m_accounts WHERE account_id = 901 ) AS debit, 102 AS credit_id, (SELECT account FROM m_accounts WHERE account_id = 102 ) AS credit, note
FROM (SELECT id, date, amount, debit, credit, note 
FROM t_journal
WHERE debit = 114 AND credit = 901) t
UNION -- TG預金 ATM引き出し
SELECT id, 1 AS business_id, date, CAST(strftime('%Y%m', date(date)) AS INT) AS month, amount, 101 AS debit_id, (SELECT account FROM m_accounts WHERE account_id = 101 ) AS debit, 902 AS credit_id, (SELECT account FROM m_accounts WHERE account_id = 902 ) AS credit, note
FROM (SELECT id, date, amount, debit, credit, note 
FROM t_journal
WHERE debit = 902 AND credit = 111) t
UNION -- NA預金 ATM引き出し
SELECT id, 2 AS business_id, date, CAST(strftime('%Y%m', date(date)) AS INT) AS month, amount, 102 AS debit_id, (SELECT account FROM m_accounts WHERE account_id = 102 ) AS debit, 902 AS credit_id, (SELECT account FROM m_accounts WHERE account_id = 902 ) AS credit, note
FROM (SELECT id, date, amount, debit, credit, note 
FROM t_journal
WHERE debit = 902 AND credit = 112) t
UNION -- 福井銀行 ATM引き出し
SELECT id, 1 AS business_id, date, CAST(strftime('%Y%m', date(date)) AS INT) AS month, amount, 101 AS debit_id, (SELECT account FROM m_accounts WHERE account_id = 101 ) AS debit, 902 AS credit_id, (SELECT account FROM m_accounts WHERE account_id = 902 ) AS credit, note
FROM (SELECT id, date, amount, debit, credit, note 
FROM t_journal
WHERE debit = 902 AND credit = 113) t
UNION -- 郵便局 ATM引き出し
SELECT id, 2 AS business_id, date, CAST(strftime('%Y%m', date(date)) AS INT) AS month, amount, 102 AS debit_id, (SELECT account FROM m_accounts WHERE account_id = 102 ) AS debit, 902 AS credit_id, (SELECT account FROM m_accounts WHERE account_id = 902 ) AS credit, note
FROM (SELECT id, date, amount, debit, credit, note 
FROM t_journal
WHERE debit = 902 AND credit = 114) t
UNION -- 専業者手当
SELECT id, 2 AS business_id, date, CAST(strftime('%Y%m', date(date)) AS INT) AS month, amount, 102 AS debit_id, (SELECT account FROM m_accounts WHERE account_id = 102 ) AS debit, 301 AS credit_id, (SELECT account FROM m_accounts WHERE account_id = 301 ) AS credit, 'QWEL.DESIGN' AS note
FROM (SELECT id, date, amount, debit, credit, note 
FROM t_journal
WHERE debit = 409 AND credit = 101) t
ORDER BY business_id, date, id;

-- 総勘定元帳
CREATE VIEW IF NOT EXISTS v_book AS
SELECT id, business_id, date, CAST(strftime('%Y%m', date(date)) AS INT) AS month, amount, debit_id AS account_id, debit AS account, credit_id AS counterpart_id, credit AS counterpart, note 
FROM v_journal
WHERE debit_id < 300
UNION
SELECT id, business_id, date, CAST(strftime('%Y%m', date(date)) AS INT) AS month, amount * -1, credit_id AS account_id, credit AS account, debit_id AS counterpart_id, debit AS counterpart, note
FROM v_journal
WHERE credit_id < 300
ORDER BY business_id, account_id, date, id;

-- 売上簿
CREATE VIEW IF NOT EXISTS v_sales AS
SELECT id, business_id, date, CAST(strftime('%Y%m', date(date)) AS INT) AS month, amount, credit_id AS account_id, credit AS account, debit_id AS counterpart_id, debit AS counterpart, note
FROM v_journal
WHERE 300 <= credit_id AND credit_id < 400
ORDER BY business_id, account_id, date, id;

-- 売上簿 (subject)
CREATE VIEW IF NOT EXISTS v_sales_subject AS
SELECT id, business_id, date, month, amount, v_accounts.subject_id AS account_id, v_accounts.subject AS account, v_sales.account_id AS original_account_id, v_sales.account AS original_account, counterpart_id, counterpart, note
FROM v_sales INNER JOIN v_accounts ON v_sales.account_id = v_accounts.account_id
ORDER BY business_id, v_sales.account_id, date, id;

-- 経費簿
CREATE VIEW IF NOT EXISTS v_expenses AS
SELECT id, business_id, date, CAST(strftime('%Y%m', date(date)) AS INT) AS month, amount, debit_id AS account_id, debit AS account, credit_id AS counterpart_id, credit AS counterpart, note
FROM v_journal
WHERE 400 <= debit_id AND debit_id < 700
ORDER BY business_id, account_id, date, id;

-- 経費簿 (subject)
CREATE VIEW IF NOT EXISTS v_expenses_subject AS
SELECT id, business_id, date, month, amount, v_accounts.subject_id AS account_id, v_accounts.subject AS account, v_expenses.account_id AS original_account_id, v_expenses.account AS original_account, counterpart_id, counterpart, note
FROM v_expenses INNER JOIN v_accounts ON v_expenses.account_id = v_accounts.account_id
ORDER BY business_id, v_expenses.account_id, date, id;

-- 月次集計
CREATE VIEW IF NOT EXISTS v_monthly_cumulative AS
SELECT business_id, month, account_id, account, sum(amount) OVER (PARTITION BY business_id, account_id ORDER BY month) AS cumulative_amount
FROM (SELECT business_id, month, account_id, account, sum(amount) AS amount
FROM v_book
WHERE account_id > 0
GROUP BY business_id, month, account_id
ORDER BY business_id, month, account_id) t
UNION
SELECT business_id, month, account_id, account, sum(amount) AS cumulative_amount
FROM (SELECT * FROM v_sales UNION SELECT * FROM v_expenses)
GROUP BY business_id, month, account_id
ORDER BY business_id, month, account_id;

--月次集計 (subject)
CREATE VIEW IF NOT EXISTS v_monthly_cumulative_subject AS
SELECT month, v_accounts.subject_id AS account_id, v_accounts.subject AS account, sum(cumulative_amount) AS cumulative_amount
FROM v_monthly_cumulative INNER JOIN v_accounts ON v_monthly_cumulative.account_id = v_accounts.account_id
GROUP BY month, v_accounts.subject_id
ORDER BY month, account_id;

-- 月次収支
CREATE VIEW IF NOT EXISTS v_monthly_balance AS
SELECT month, SUM(income) AS income, SUM(expense) AS expense, SUM(income) - SUM(expense) AS balance, SUM(adjustment) AS adjustment
FROM (SELECT month, SUM(cumulative_amount) AS income, 0 AS expense, 0 AS adjustment
FROM v_monthly_cumulative
WHERE 300 <= account_id AND account_id < 389
GROUP BY month
UNION
SELECT month, 0 AS income, SUM(cumulative_amount) AS expense, 0 AS adjustment
FROM v_monthly_cumulative
WHERE 400 <= account_id AND account_id < 689
GROUP BY month
UNION
SELECT month, 0 AS income, 0 AS expense, SUM(cumulative_amount) AS adjustment
FROM v_monthly_cumulative
WHERE account_id = 390
GROUP BY month
UNION
SELECT month, 0 AS income, 0 AS expense, -SUM(cumulative_amount) AS adjustment
FROM v_monthly_cumulative
WHERE account_id = 690
GROUP BY month)
GROUP BY month
ORDER BY month DESC;

-- 年次集計
CREATE VIEW IF NOT EXISTS v_yearly_cumulative AS
SELECT business_id, year, account_id, account, sum(amount) OVER (PARTITION BY business_id, account_id ORDER BY year) AS cumulative_amount
FROM (SELECT business_id, CAST(strftime('%Y', date(date)) AS INT) AS year, account_id, account, sum(amount) AS amount
FROM v_book
WHERE account_id > 0
GROUP BY business_id, year, account_id
ORDER BY business_id, year, account_id) t
UNION
SELECT business_id, CAST(strftime('%Y', date(date)) AS INT) AS year, account_id, account, sum(amount) AS cumulative_amount
FROM (SELECT * FROM v_sales UNION SELECT * FROM v_expenses)
GROUP BY business_id, year, account_id
ORDER BY business_id, year, account_id;

--年次集計 (subject)
CREATE VIEW IF NOT EXISTS v_yearly_cumulative_subject AS
SELECT year, v_accounts.subject_id AS account_id, v_accounts.subject AS account, sum(cumulative_amount) AS cumulative_amount
FROM v_yearly_cumulative INNER JOIN v_accounts ON v_yearly_cumulative.account_id = v_accounts.account_id
GROUP BY year, v_accounts.subject_id
ORDER BY year, account_id;

-- 年次収支
CREATE VIEW IF NOT EXISTS v_yearly_balance AS
SELECT year, SUM(income) AS income, SUM(expense) AS expense, SUM(income) - SUM(expense) AS balance, SUM(adjustment) AS adjustment
FROM (SELECT year, SUM(cumulative_amount) AS income, 0 AS expense, 0 AS adjustment
FROM v_yearly_cumulative
WHERE 300 <= account_id AND account_id < 389
GROUP BY year
UNION
SELECT year, 0 AS income, SUM(cumulative_amount) AS expense, 0 AS adjustment
FROM v_yearly_cumulative
WHERE 400 <= account_id AND account_id < 689
GROUP BY year
UNION
SELECT year, 0 AS income, 0 AS expense, SUM(cumulative_amount) AS adjustment
FROM v_yearly_cumulative
WHERE account_id = 390
GROUP BY year
UNION
SELECT year, 0 AS income, 0 AS expense, -SUM(cumulative_amount) AS adjustment
FROM v_yearly_cumulative
WHERE account_id = 690
GROUP BY year)
GROUP BY year
ORDER BY year DESC;

COMMIT;
