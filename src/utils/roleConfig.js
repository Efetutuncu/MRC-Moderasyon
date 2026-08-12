import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src', 'data', 'roles.json');

if (!fs.existsSync(path.dirname(filePath))) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
}
if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([]));
}

export function getRoles() {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return [];
    }
}

export function saveRoles(roles) {
    fs.writeFileSync(filePath, JSON.stringify(roles, null, 2));
}