import * as fs from 'fs';

let content = fs.readFileSync('src/components/ManageCategoriesModal.tsx', 'utf-8');

// The replacement logic:
const searchString = `<button 
                     onClick={() => handleDelete(c.id!)} 
                     className={\`transition-colors p-1 rounded \${confirmDeleteId === c.id ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-rose-400'}\`}
                     title={confirmDeleteId === c.id ? "Click again to confirm delete" : "Delete category"}
                   >
                     <Trash2 size={16} />
                   </button>`;
                   
const replacementString = `<button 
                     onClick={() => setConfirmDeleteId(c.id!)} 
                     className="transition-colors p-1 rounded text-slate-400 hover:text-rose-400"
                     title="Delete category"
                   >
                     <Trash2 size={16} />
                   </button>`;

content = content.replace(searchString, replacementString);
content = content.replace(searchString, replacementString);

fs.writeFileSync('src/components/ManageCategoriesModal.tsx', content);

console.log('Managed to replace button usages.');
