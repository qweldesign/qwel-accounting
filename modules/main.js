// main.js
// ipcMainハンドラを使ってRenderer側から関数を受け取る

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { getSubjects, getJournals, getMonthlySummary, getSalesAndExpenses, getSalesAndExpensesSummary, getMonthlyCumulative, getMonthlyBalance, getYearlyCumulative, getYearlyBalance, getLatestMonth, updateLatestMonth, convertToJournal, insertJournals } from './db.cjs';

app.whenReady().then(createWindow);

function createWindow() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, './preload.cjs')
    }
  });

  mainWindow.loadFile('index.html');
}

ipcMain.handle('get-subjects', async (event, excludeCashLike) => {
  return getSubjects(excludeCashLike);
});

ipcMain.handle('get-journals', async (event, month) => {
  return getJournals(month);
});

ipcMain.handle('get-monthly-summary', async (event, month) => {
  return getMonthlySummary(month);
});

ipcMain.handle('get-sales-and-expenses', async (event, month, accountId) => {
  return getSalesAndExpenses(month, accountId);
});

ipcMain.handle('get-sales-and-expenses-summary', async (event, year, accountId) => {
  return getSalesAndExpensesSummary(year, accountId);
});

ipcMain.handle('get-monthly-cumulative', async (event, month) => {
  return getMonthlyCumulative(month);
});

ipcMain.handle('get-monthly-balance', async (event, month) => {
  return getMonthlyBalance(month);
});

ipcMain.handle('get-yearly-cumulative', async (event, year) => {
  return getYearlyCumulative(year);
});

ipcMain.handle('get-yearly-balance', async (event, year) => {
  return getYearlyBalance(year);
});

ipcMain.handle('get-latest-month', async (event) => {
  return getLatestMonth();
});

ipcMain.handle('update-latest-month', async (event, month) => {
  return updateLatestMonth(month);
});

ipcMain.handle('import-csv', async (event, filePath) => {
  const text = fs.readFileSync(filePath, 'utf-8');

  const records = parse(text, {
    columns: true,
    skip_empty_lines: true
  });

  const journals = [];

  for (const row of records) {
    const journal = convertToJournal(row);
    if (journal) journals.push(journal);
  }

  insertJournals(journals); // ← ここで完全同期完了

  return { success: true, count: journals.length };
});

