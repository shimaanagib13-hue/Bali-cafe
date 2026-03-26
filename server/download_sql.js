import https from 'https';
import fs from 'fs';
import path from 'path';

const files = [
  { url: 'https://unpkg.com/sql.js@1.8.0/dist/sql-wasm.js', name: 'sql-wasm.js' },
  { url: 'https://unpkg.com/sql.js@1.8.0/dist/sql-wasm.wasm', name: 'sql-wasm.wasm' }
];

const dir = path.join(process.cwd(), 'sql.js');

Promise.all(files.map(file => {
  return new Promise((resolve, reject) => {
    const dest = path.join(dir, file.name);
    const fileStream = fs.createWriteStream(dest);
    https.get(file.url, response => {
      // Handle redirects
      if (response.statusCode === 302) {
        https.get(response.headers.location, redirectResponse => {
            redirectResponse.pipe(fileStream);
            fileStream.on('finish', () => fileStream.close(resolve));
        });
      } else {
        response.pipe(fileStream);
        fileStream.on('finish', () => {
            fileStream.close(resolve);
        });
      }
    }).on('error', err => {
      fs.unlink(dest, () => reject(err));
    });
  });
})).then(() => {
  console.log('Downloaded correct npm versions of sql.js');
}).catch(err => {
  console.error('Failed to download:', err);
});
