#!/bin/env node
const { existsSync, readFileSync } = require('fs');

let root = process.cwd();
for (let attempts = 1; !existsSync(`${root}/pnpm-workspace.yaml`); attempts++) {
  if (attempts >= 3 || !existsSync(`${root}/..`)) {
    root = null;
    break;
  }
  root = `${root}/..`;
}
if (!root) {
  console.error(`E: Couldn't find repo root. Current working directory is '${process.cwd()}'`);
  process.exit(1);
}

const engines = JSON.parse(readFileSync(`${root}/package.json`, 'utf8')).engines;
const available = Object.keys(engines).sort();

const echoHelp = (out) => {
  if (!out) {
    out = console.log
  }
  out(`Usage: ${process.argv[1].split(/\//g).pop()} [ENGINE]`);
  out();
  out(`Available Engines: '${available.join(`', '`)}'`);
  out();
}

let selected = null;
for (let i = 2; i < process.argv.length; i++) {
  if (selected || !available.includes(process.argv[i])) {
    echoHelp(console.error);
    console.error(`E: Unknown argument '${process.argv[i]}'`);
    process.exit(1);
  }
  selected = process.argv[i];
}
if (!selected) {
  echoHelp(console.error);
  console.error(`E: No engine selected. Please pass one of the available engines as argument.`);
  process.exit(1);
}

process.stdout.write(engines[selected]);
