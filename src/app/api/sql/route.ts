import { NextResponse } from 'next/server';
import db from '@/server/db/sqlite';
import { validateSql } from '@/server/utils/sqlValidator';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query } = body;

    const validationError = validateSql(query);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    try {
      const stmt = db.prepare(query);
      if (!stmt.reader) {
        return NextResponse.json({ error: 'Only SELECT queries are allowed (detected write operation)' }, { status: 400 });
      }

      const rows = stmt.all();
      const columns = stmt.columns().map((c) => c.name);

      return NextResponse.json({ rows, columns });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
