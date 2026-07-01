const fs = require('fs');

const file = 'c:/Users/user/Documents/project/store/useStore.ts';
let content = fs.readFileSync(file, 'utf8');

// Replace .finally(() => set({ isMutating: false })) with setTimeout block
content = content.replace(/\.finally\(\(\) => set\(\{ isMutating: false \}\)\)/g, '.finally(() => setTimeout(() => set({ isMutating: false }), 2000))');

fs.writeFileSync(file, content, 'utf8');
console.log('useStore.ts updated successfully!');
