import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { promisify } from 'util';
import * as dns from 'dns';

export async function GET() {
  const baseHost = 'db5018571845.hosting-data.io';
  const variants = [
    baseHost,
    `mysql.${baseHost}`,
    `db.${baseHost}`,
    `mysql123456.hosting-data.io`, // Different number format
    `db123456.hosting-data.io`,    // Different number format
    `5018571845.hosting-data.io`,  // Without 'db' prefix
    `mysql5018571845.hosting-data.io`, // With 'mysql' prefix
  ];

  const results = [];

  for (const host of variants) {
    try {
      console.log(`Testing: ${host}`);
      
      // Test DNS resolution first
      const lookup = promisify(dns.lookup);
      
      const dnsResult = await lookup(host);
      console.log(`✅ DNS resolved: ${host} → ${dnsResult.address}`);
      
      // Test MySQL connection
      const connection = await mysql.createConnection({
        host: host,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        port: 3306,
        connectTimeout: 5000,
      });

      await connection.end();
      
      results.push({
        host,
        status: 'SUCCESS',
        dns: dnsResult.address,
        message: 'Connection successful!'
      });
      
      // If we find a working host, return it immediately
      return NextResponse.json({
        success: true,
        workingHost: host,
        message: `Found working hostname: ${host}`,
        results: results
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`❌ Failed: ${host} - ${errorMessage}`);
      
      results.push({
        host,
        status: 'FAILED',
        error: errorMessage
      });
    }
  }

  return NextResponse.json({
    success: false,
    message: 'No working hostname found',
    results: results,
    recommendations: [
      'Check IONOS control panel for correct hostname',
      'Verify database is active and accessible',
      'Look for external access settings',
      'Contact IONOS support for connection details'
    ]
  });
}
