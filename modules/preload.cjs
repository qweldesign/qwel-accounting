// preload.cjs
// ipcRenderer を使ってMain側へ関数を送るためのAPIを提供

const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getSubjects: (excludeCashLike) => ipcRenderer.invoke('get-subjects', excludeCashLike),
  getJournals: (month) => ipcRenderer.invoke('get-journals', month),
  getMonthlySummary: (month) => ipcRenderer.invoke('get-monthly-summary', month),
  getSalesAndExpenses: (month, accountId) => ipcRenderer.invoke('get-sales-and-expenses', month, accountId),
  getSalesAndExpensesSummary: (year, accountId) => ipcRenderer.invoke('get-sales-and-expenses-summary', year, accountId),
  getMonthlyCumulative: (month) => ipcRenderer.invoke('get-monthly-cumulative', month),
  getMonthlyBalance: (month) => ipcRenderer.invoke('get-monthly-balance', month),
  getYearlyCumulative: (year) => ipcRenderer.invoke('get-yearly-cumulative', year),
  getYearlyBalance: (year) => ipcRenderer.invoke('get-yearly-balance', year),
  getLatestMonth: () => ipcRenderer.invoke('get-latest-month'),
  updateLatestMonth: (month) => ipcRenderer.invoke('update-latest-month', month),
  importCSV: (file) => {
    const path = webUtils.getPathForFile(file);
    return ipcRenderer.invoke('import-csv', path);
  }
});
