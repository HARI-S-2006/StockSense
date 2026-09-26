const fs = require('fs');
const path = require('path');

const walkSync = function(dir, filelist) {
  let files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist);
    }
    else {
      filelist.push(path.join(dir, file));
    }
  });
  return filelist;
};

const srcDir = path.join(__dirname, 'src');
const files = walkSync(srcDir);

files.forEach(file => {
  if (file.endsWith('.ts') || file.endsWith('.tsx')) {
    let content = fs.readFileSync(file, 'utf8');
    
    if (content.includes('@prisma/client')) {
      if (file.endsWith('auth.ts')) {
          content = content.replace(/import \{ Role \} from '@prisma\/client'/g, 'export enum Role { INVENTORY_MANAGER = "INVENTORY_MANAGER", WAREHOUSE_STAFF = "WAREHOUSE_STAFF" }');
          content = content.replace(/export \{ Role \} from '@prisma\/client'/g, '');
      } else {
          content = content.replace(/import \{.*?\} from '@prisma\/client'/g, '');
      }
      fs.writeFileSync(file, content);
    }
  }
});

console.log('Fixed @prisma/client imports');
