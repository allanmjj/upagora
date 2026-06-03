/**
 * Migration Guide for UpAgora
 *
 * This script scans the supabase/migrations/ directory, identifies which
 * migrations are already applied (.done suffix), and creates a unified
 * migration script for clean database setup.
 *
 * Run: node scripts/migration-consolidate.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, '../supabase/migrations');

// Read all migration files
const allFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql') || f.endsWith('.sql.done'));

// Sort by filename (chronological order)
allFiles.sort();

const applied = [];
const pending = [];

for (const file of allFiles) {
  const filePath = path.join(migrationsDir, file);
  
  if (file.endsWith('.sql.done')) {
    applied.push({
      name: file.replace('.sql.done', '.sql'),
      status: 'APPLIED',
      size: fs.statSync(filePath).size,
    });
  } else if (file.endsWith('.sql')) {
    // Check if there's a corresponding .done file
    const doneFile = file + '.done';
    const isApplied = fs.existsSync(path.join(migrationsDir, doneFile));
    
    if (isApplied) {
      // This file has a companion .done marker, skip it from pending
      continue;
    }
    
    pending.push({
      name: file,
      status: 'PENDING',
      size: fs.statSync(filePath).size,
    });
  }
}

console.log('=== UpAgora Migration Status ===\n');
console.log(`Applied migrations: ${applied.length}`);
for (const m of applied) {
  console.log(`  ✓ ${m.name} (${(m.size / 1024).toFixed(1)}KB)`);
}

console.log(`\nPending migrations: ${pending.length}`);
for (const m of pending) {
  console.log(`  ⏳ ${m.name} (${(m.size / 1024).toFixed(1)}KB)`);
}

// Calculate total sizes
const appliedTotal = applied.reduce((sum, m) => sum + m.size, 0);
const pendingTotal = pending.reduce((sum, m) => sum + m.size, 0);

console.log(`\nTotal applied: ${(appliedTotal / 1024).toFixed(1)}KB`);
console.log(`Total pending: ${(pendingTotal / 1024).toFixed(1)}KB`);

// Generate a unified migration script (pending only)
if (pending.length > 0) {
  console.log('\n=== Generating unified migration script ===');
  
  const outputPath = path.join(migrationsDir, 'UNIFIED_PENDING.sql');
  let content = `-- ============================================\n`;
  content += `-- UpAgora Unified Migration Script\n`;
  content += `-- Generated: ${new Date().toISOString()}\n`;
  content += `-- Contains ${pending.length} pending migrations\n`;
  content += `-- Run this in Supabase SQL Editor\n`;
  content += `-- https://dfqeafreiwpyrzcdvegm.supabase.co/project/default/sql\n`;
  content += `-- ============================================\n\n`;
  
  for (const m of pending) {
    const filePath = path.join(migrationsDir, m.name);
    const migrationContent = fs.readFileSync(filePath, 'utf-8');
    
    content += `-- ============================================\n`;
    content += `-- Migration: ${m.name}\n`;
    content += `-- Size: ${(m.size / 1024).toFixed(1)}KB\n`;
    content += `-- ============================================\n\n`;
    content += migrationContent;
    content += `\n\n`;
  }
  
  fs.writeFileSync(outputPath, content);
  console.log(`Written to: ${outputPath}`);
  console.log(`Total size: ${(fs.statSync(outputPath).size / 1024).toFixed(1)}KB`);
  
} else {
  console.log('\nNo pending migrations to consolidate.');
}
