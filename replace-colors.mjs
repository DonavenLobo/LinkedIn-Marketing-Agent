import fs from 'fs';

const sidebarFile = 'apps/extension/assets/sidebar.css';
let content = fs.readFileSync(sidebarFile, 'utf8');

// The new tokens mapping
const replaceMap = [
  // Primary background
  { regex: /#ffffff/g, replacement: 'var(--surface)' },
  { regex: /#fff(?![a-fA-F0-9])/g, replacement: 'var(--surface)' },
  { regex: /background:\s*#f7f7f5/g, replacement: 'background: var(--surface-subtle)' },
  { regex: /background:\s*#eeeee9/g, replacement: 'background: var(--surface-muted)' },
  { regex: /background:\s*#f3f4f6/g, replacement: 'background: var(--surface-subtle)' },
  
  // Text
  { regex: /color:\s*#1a1a1a/g, replacement: 'color: var(--ink)' },
  { regex: /color:\s*#333/g, replacement: 'color: var(--ink)' },
  { regex: /color:\s*#4a4a4a/g, replacement: 'color: var(--ink-light)' },
  { regex: /color:\s*#666/g, replacement: 'color: var(--ink-light)' },
  { regex: /color:\s*#8a8a8a/g, replacement: 'color: var(--ink-muted)' },
  { regex: /color:\s*#999/g, replacement: 'color: var(--ink-muted)' },
  
  // Accents (LinkedIn Blue: #0a66c2)
  { regex: /#2563eb/g, replacement: 'var(--accent)' },
  { regex: /#1d4ed8/g, replacement: 'var(--accent-hover)' },
  { regex: /#0a66c2/g, replacement: 'var(--accent)' },
  { regex: /#004182/g, replacement: 'var(--accent-hover)' },
  { regex: /#eff4ff/g, replacement: 'var(--accent-light)' },
  
  // Success
  { regex: /#16a34a/g, replacement: 'var(--success)' },
  { regex: /#15803d/g, replacement: 'var(--success)' },
  
  // Borders
  { regex: /border-color:\s*#1a1a1a/g, replacement: 'border-color: var(--ink)' },
  { regex: /#e2e2dc/g, replacement: 'var(--border)' },
  { regex: /#e8e8e8/g, replacement: 'var(--border)' },
  { regex: /#f0f0f0/g, replacement: 'var(--border-light)' },
];

for (const { regex, replacement } of replaceMap) {
  content = content.replace(regex, replacement);
}

// Inject :host variables block if not exists
if (!content.includes('--ink: #1a1a1a;')) {
  content = content.replace(
    ':host {',
    `:host {
  /* Design Tokens */
  --ink: #1a1a1a;
  --ink-light: #4a4a4a;
  --ink-muted: #8a8a8a;
  --surface: #ffffff;
  --surface-subtle: #f7f7f5;
  --surface-muted: #eeeee9;
  --border: #e2e2dc;
  --border-light: #efefea;
  --accent: #0a66c2;
  --accent-hover: #004182;
  --accent-light: #e8f3ff;
  --success: #057a55;
  --error: #e02424;\n`
  );
}

fs.writeFileSync(sidebarFile, content, 'utf8');
console.log('Successfully updated sidebar.css with variables');
