import { PrismaClient } from '@prisma/client'
import fs from 'node:fs'

const prisma = new PrismaClient()

async function auditDatabase() {
  const [dbInfo] = await prisma.$queryRawUnsafe(`
    SELECT current_database(), current_user, inet_server_addr(), inet_server_port(), version()
  `)

  const tables = await prisma.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `)

  const tableCounts = {}
  for (const t of tables) {
    const tableName = t.table_name
    const countRes = await prisma.$queryRawUnsafe(`SELECT count(*) as count FROM "${tableName}"`)
    tableCounts[tableName] = Number(countRes[0].count)
  }

  const foreignKeys = await prisma.$queryRawUnsafe(`
    SELECT
      tc.table_name, 
      kcu.column_name, 
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.delete_rule,
      rc.update_rule
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name, kcu.column_name;
  `)

  const checkConstraints = await prisma.$queryRawUnsafe(`
    SELECT
      tc.table_name,
      tc.constraint_name,
      cc.check_clause
    FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc
      ON tc.constraint_name = cc.constraint_name
    WHERE tc.table_schema = 'public' AND tc.constraint_type = 'CHECK'
    ORDER BY tc.table_name, tc.constraint_name;
  `)

  const uniqueConstraints = await prisma.$queryRawUnsafe(`
    SELECT
      tc.table_name,
      kcu.column_name,
      tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public' AND tc.constraint_type = 'UNIQUE'
    ORDER BY tc.table_name, kcu.column_name;
  `)

  const indexes = await prisma.$queryRawUnsafe(`
    SELECT
      tablename,
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname;
  `)

  const columns = await prisma.$queryRawUnsafe(`
    SELECT
      table_name,
      column_name,
      data_type,
      udt_name,
      numeric_precision,
      numeric_scale,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `)

  const enums = await prisma.$queryRawUnsafe(`
    SELECT t.typname as enum_name, e.enumlabel as enum_value
    FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid  
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    ORDER BY enum_name, e.enumsortorder;
  `)

  const auditData = {
    dbInfo,
    tables: tables.map(t => t.table_name),
    tableCounts,
    foreignKeys,
    checkConstraints,
    uniqueConstraints,
    indexesCount: indexes.length,
    indexes,
    columns,
    enums
  }

  fs.writeFileSync('test/audit_output.json', JSON.stringify(auditData, null, 2))
  console.log('✅ Audit saved to test/audit_output.json')
  console.log(`Database: ${dbInfo.current_database} on PostgreSQL ${dbInfo.version.split(' ')[1]}`)
  console.log(`Tables audited: ${tables.length}, Foreign Keys: ${foreignKeys.length}, CHECK constraints: ${checkConstraints.length}, Indexes: ${indexes.length}`)
}

auditDatabase()
  .catch(err => {
    console.error('Audit failed:', err)
  })
  .finally(() => prisma.$disconnect())
