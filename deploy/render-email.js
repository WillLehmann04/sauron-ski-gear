#!/usr/bin/env node
// Render the backup report email from the Handlebars template.
// Reads a JSON data object on stdin, writes HTML to stdout.
//
//   echo '{"success":true,...}' | node render-email.js > email.html
//
// Used by backup-db.sh. Kept dependency-light: only handlebars (an app dependency).
'use strict';

const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

const TEMPLATE = path.join(__dirname, 'templates', 'backup-email.hbs');

try {
  const data = JSON.parse(fs.readFileSync(0, 'utf8')); // fd 0 = stdin
  const render = Handlebars.compile(fs.readFileSync(TEMPLATE, 'utf8'));
  process.stdout.write(render(data));
} catch (err) {
  // Caller (backup-db.sh) falls back to a text-only email on empty output.
  process.stderr.write('render-email: ' + err.message + '\n');
  process.exit(1);
}
