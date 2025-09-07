import { MongoClient, Db, MongoClientOptions } from 'mongodb';

let client: MongoClient;
let db: Db;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'attendance_app';

// Ensure MongoDB URI has proper SSL parameters for production
const getMongoURI = () => {
  if (MONGODB_URI.includes('mongodb+srv://')) {
    // For Atlas, ensure SSL parameters are included
    const uri = new URL(MONGODB_URI);
    uri.searchParams.set('retryWrites', 'true');
    uri.searchParams.set('w', 'majority');
    uri.searchParams.set('ssl', 'true');
    uri.searchParams.set('tls', 'true');
    uri.searchParams.set('tlsAllowInvalidCertificates', 'false');
    uri.searchParams.set('tlsAllowInvalidHostnames', 'false');
    return uri.toString();
  }
  return MONGODB_URI;
};

export async function connectToDatabase(): Promise<{ db: Db; client: MongoClient }> {
  if (db && client) {
    return { db, client };
  }

  // Configure MongoDB client options for Vercel serverless environment
  const clientOptions = {
    serverSelectionTimeoutMS: 10000, // Keep trying to send operations for 10 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    maxPoolSize: 1, // Use single connection for serverless
    minPoolSize: 0, // No minimum connections for serverless
    maxIdleTimeMS: 10000, // Close connections after 10 seconds of inactivity
    connectTimeoutMS: 15000, // Give up initial connection after 15 seconds
    heartbeatFrequencyMS: 10000, // Send a ping every 10 seconds
    // SSL/TLS configuration
    tls: true,
    tlsAllowInvalidCertificates: false,
    tlsAllowInvalidHostnames: false,
    // Additional options for Vercel compatibility
    directConnection: false,
    retryWrites: true,
    retryReads: true,
    // Compression
    compressors: ['zlib'],
    zlibCompressionLevel: 6,
  };

  // Try different connection configurations for Vercel compatibility
  const connectionConfigs: Array<{ name: string; options: MongoClientOptions; uri: string }> = [
    // Configuration 1: Vercel-optimized connection
    {
      name: 'Vercel Optimized',
      options: {
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 30000,
        connectTimeoutMS: 20000,
        maxPoolSize: 1,
        minPoolSize: 0,
        maxIdleTimeMS: 10000,
        heartbeatFrequencyMS: 10000,
        tls: true,
        tlsAllowInvalidCertificates: false,
        tlsAllowInvalidHostnames: false,
        retryWrites: true,
        retryReads: true,
        directConnection: false,
      },
      uri: getMongoURI()
    },
    // Configuration 2: Minimal TLS connection
    {
      name: 'Minimal TLS',
      options: {
        serverSelectionTimeoutMS: 20000,
        connectTimeoutMS: 25000,
        maxPoolSize: 1,
        minPoolSize: 0,
        tls: true,
        retryWrites: true,
        retryReads: true,
      },
      uri: getMongoURI()
    },
    // Configuration 3: No compression (sometimes helps with SSL issues)
    {
      name: 'No Compression',
      options: {
        serverSelectionTimeoutMS: 20000,
        connectTimeoutMS: 25000,
        maxPoolSize: 1,
        minPoolSize: 0,
        tls: true,
        retryWrites: true,
        retryReads: true,
        compressors: [],
      },
      uri: getMongoURI()
    },
    // Configuration 4: Direct connection (fallback)
    {
      name: 'Direct Connection',
      options: {
        serverSelectionTimeoutMS: 25000,
        connectTimeoutMS: 30000,
        maxPoolSize: 1,
        minPoolSize: 0,
        tls: true,
        retryWrites: true,
        retryReads: true,
        directConnection: true,
      },
      uri: getMongoURI()
    }
  ];

  let lastError;

  for (const config of connectionConfigs) {
    try {
      console.log(`Trying MongoDB connection with ${config.name} configuration...`);
      client = new MongoClient(config.uri, config.options);
      await client.connect();
      db = client.db(MONGODB_DB);
      console.log(`Connected to MongoDB successfully using ${config.name} configuration`);
      return { db, client };
    } catch (error) {
      lastError = error;
      console.error(`${config.name} configuration failed:`, error);
      
      if (client) {
        try {
          await client.close();
        } catch (closeError) {
          console.error('Error closing client:', closeError);
        }
        client = null as unknown as MongoClient;
      }
      
      // Wait before trying next configuration
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.error('All MongoDB connection configurations failed');
  throw lastError;
}

export async function getDatabase(): Promise<Db> {
  if (!db) {
    const { db: database } = await connectToDatabase();
    return database;
  }
  return db;
}

export async function getClient(): Promise<MongoClient> {
  if (!client) {
    const { client: mongoClient } = await connectToDatabase();
    return mongoClient;
  }
  return client;
}

// Default export for backward compatibility
export default {
  getDatabase,
  getClient,
  connectToDatabase
};

// Database initialization function
export async function initializeDatabase() {
  try {
    const { db: database } = await connectToDatabase();
    
    // Create collections with validation (optional)
    const collections = ['users', 'projects', 'contractors', 'attendance'];
    
    for (const collectionName of collections) {
      try {
        await database.createCollection(collectionName);
        console.log(`Collection ${collectionName} created or already exists`);
      } catch {
        // Collection might already exist, which is fine
        console.log(`Collection ${collectionName} already exists`);
      }
    }

    // Create indexes for better performance
    await database.collection('users').createIndex({ email: 1 }, { unique: true });
    await database.collection('attendance').createIndex({ contractor_id: 1, date: 1 }, { unique: true });
    await database.collection('contractors').createIndex({ project_id: 1 });
    await database.collection('attendance').createIndex({ project_id: 1 });

    // Insert default admin user if not exists
    const existingAdmin = await database.collection('users').findOne({ email: 'admin@gmail.com' });
    
    if (!existingAdmin) {
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await database.collection('users').insertOne({
        email: 'admin@gmail.com',
        password: hashedPassword,
        role: 'admin',
        created_at: new Date()
      });
      console.log('Default admin user created: admin@gmail.com / admin123');
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// Close connection (useful for cleanup)
export async function closeConnection() {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
}