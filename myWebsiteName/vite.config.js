import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

// Get all HTML files in the pages directory
const pages = fs.readdirSync('./src/pages')
 .filter(file => file.endsWith('.html'))
 .reduce((obj, file) => {
   const name = file.replace('.html', '');
   obj[name] = resolve(__dirname, 'src/pages', file);
   return obj;
 }, {});

export default defineConfig({
 plugins: [
 ],
 build: {
   rollupOptions: {
	 input: {
	   main: resolve(__dirname, 'index.html'),
	   ...pages
	 }
   }
 }
});