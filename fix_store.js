const fs = require('fs');

const file = 'c:/Users/user/Documents/project/store/useStore.ts';
let content = fs.readFileSync(file, 'utf8');

// 1 & 2 & 3: basic state and syncData
content = content.replace(
  'isGlobalSyncing: boolean;',
  'isMutating: boolean;\n  isGlobalSyncing: boolean;'
);
content = content.replace(
  'isGlobalSyncing: false,',
  'isMutating: false,\n  isGlobalSyncing: false,'
);
content = content.replace(
  'if (get().isGlobalSyncing) return;',
  'if (get().isMutating || get().isGlobalSyncing) return;'
);

// 4: Add set({ isMutating: true }); at the beginning of each action
const actions = [
  'addNotice: (notice) => {',
  'editNotice: (id, fields) => {',
  'deleteNotice: (id) => {',
  'addHandover: (handover) => {',
  'signHandover: (id, employeeId) => {',
  'editHandover: (id, fields) => {',
  'deleteHandover: (id) => {',
  'approveHandover: (id, isApproved) => {',
  'addEquipmentIssue: (issue) => {',
  'confirmEquipment: (id) => {',
  'changeEquipmentStatus: (id, newStatus) => {',
  'addComment: (type, targetId, comment) => {',
  'markAsRead: (category, id, userName) => {',
  'editEquipment: (id, fields) => {',
  'deleteEquipment: (id) => {',
  'approveEquipment: (id, isApproved) => {',
  'addEmployee: (employee) => {',
  'updateEmployee: (employeeId, updatedFields) => {',
  'deleteEmployee: (employeeId) => {',
  'addVacation: (vacation) => {',
  'updateVacationStatus: (id, status) => {',
  'editVacation: (id, fields) => {',
  'deleteVacation: (id) => {'
];

actions.forEach(action => {
  content = content.replace(action, action + '\n    set({ isMutating: true });');
});

// 5: Add .finally(() => set({ isMutating: false })) to the end of all catch blocks in these functions.
// We can use a regex that matches:
// console.error('[Store] ... 롤백합니다.', err);\n    });
// or console.error('[Store] ... 롤백합니다.');\n    });

content = content.replace(/(console\.error\(\'\[Store\].*?롤백합니다\.\'.*?\);\s*\}\);)/g, '$1 // replaced');

// Wait, the regex replacement needs to be careful.
// Let's replace `});` with `}).finally(() => set({ isMutating: false }));` ONLY where it's a fetch catch block for CRUD.
// A better way is to do it like this:
content = content.replace(/(console\.error\(\'\[Store\][^;]+롤백합니다\.\'[^;]*\);\s*\})\);/g, '$1).finally(() => set({ isMutating: false }));');

fs.writeFileSync(file, content, 'utf8');
console.log('Done!');
