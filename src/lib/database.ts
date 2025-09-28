import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

export const sql = neon(process.env.DATABASE_URL)

// Database schema setup function
export async function setupDatabase() {
  try {
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        firebase_id TEXT UNIQUE,
        name TEXT,
        image TEXT,
        role TEXT DEFAULT 'user',
        wallet_address TEXT,
        private_key TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create campaigns table
    await sql`
      CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        title TEXT NOT NULL,
        description TEXT,
        target TEXT NOT NULL,
        deadline TIMESTAMP NOT NULL,
        contract_address TEXT UNIQUE NOT NULL,
        creator_id TEXT NOT NULL REFERENCES users(id),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create contributions table
    await sql`
      CREATE TABLE IF NOT EXISTS contributions (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        amount TEXT NOT NULL,
        campaign_id TEXT NOT NULL REFERENCES campaigns(id),
        user_id TEXT NOT NULL REFERENCES users(id),
        tx_hash TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create indexes for better performance
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`
    await sql`CREATE INDEX IF NOT EXISTS idx_users_firebase_id ON users(firebase_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_campaigns_creator ON campaigns(creator_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_campaigns_contract ON campaigns(contract_address)`
    await sql`CREATE INDEX IF NOT EXISTS idx_contributions_campaign ON contributions(campaign_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_contributions_user ON contributions(user_id)`

    // Create campaign_stats view for easy querying of campaign data with statistics
    await sql`
      CREATE OR REPLACE VIEW campaign_stats AS
      SELECT 
        c.id,
        c.title,
        c.target,
        c.deadline,
        c.contract_address,
        c.creator_id,
        u.name as creator_name,
        u.email as creator_email,
        COALESCE(contrib_stats.contribution_count, 0) as contribution_count,
        COALESCE(contrib_stats.total_contributed, '0') as total_contributed,
        c.is_active,
        c.created_at
      FROM campaigns c
      LEFT JOIN users u ON c.creator_id = u.id
      LEFT JOIN (
        SELECT 
          campaign_id,
          COUNT(*) as contribution_count,
          SUM(CAST(amount AS DECIMAL)) as total_contributed
        FROM contributions
        GROUP BY campaign_id
      ) contrib_stats ON c.id = contrib_stats.campaign_id
      ORDER BY c.created_at DESC
    `

    // Create user_stats view for easy querying of user data with statistics
    await sql`
      CREATE OR REPLACE VIEW user_stats AS
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.wallet_address,
        COALESCE(campaign_stats.campaigns_created, 0) as campaigns_created,
        COALESCE(contrib_stats.contributions_made, 0) as contributions_made,
        COALESCE(contrib_stats.total_contributed, '0') as total_contributed,
        u.created_at
      FROM users u
      LEFT JOIN (
        SELECT 
          creator_id,
          COUNT(*) as campaigns_created
        FROM campaigns
        WHERE is_active = true
        GROUP BY creator_id
      ) campaign_stats ON u.id = campaign_stats.creator_id
      LEFT JOIN (
        SELECT 
          user_id,
          COUNT(*) as contributions_made,
          SUM(CAST(amount AS DECIMAL)) as total_contributed
        FROM contributions
        GROUP BY user_id
      ) contrib_stats ON u.id = contrib_stats.user_id
      ORDER BY u.created_at DESC
    `

    console.log('✅ Database setup completed')
  } catch (error) {
    console.error('❌ Database setup failed:', error)
    throw error
  }
}

// User database functions
export const userDb = {
  async findByEmail(email: string) {
    const result = await sql`
      SELECT id, email, name, image, role, wallet_address, created_at
      FROM users 
      WHERE email = ${email}
    `
    return result[0] || null
  },

  async findByFirebaseId(firebaseId: string) {
    const result = await sql`
      SELECT id, firebase_id, email, name, image, role, wallet_address, private_key, created_at
      FROM users 
      WHERE firebase_id = ${firebaseId} 
      LIMIT 1
    `
    return result[0] || null
  },

  async create(userData: {
    id: string
    email: string
    name?: string
    image?: string
    role: string
    walletAddress: string
    privateKey: string
  }) {
    const result = await sql`
      INSERT INTO users (id, email, name, image, role, wallet_address, private_key)
      VALUES (${userData.id}, ${userData.email}, ${userData.name || ''}, ${userData.image || ''}, ${userData.role}, ${userData.walletAddress}, ${userData.privateKey})
      RETURNING id, email, name, image, role, wallet_address, created_at
    `
    return result[0]
  },

  async update(email: string, userData: {
    name?: string
    image?: string
    role?: string
    walletAddress?: string
    privateKey?: string
  }) {
    // Build dynamic update query using template literals
    const setParts = []
    if (userData.name !== undefined) setParts.push(sql`name = ${userData.name}`)
    if (userData.image !== undefined) setParts.push(sql`image = ${userData.image}`)
    if (userData.role !== undefined) setParts.push(sql`role = ${userData.role}`)
    if (userData.walletAddress !== undefined) setParts.push(sql`wallet_address = ${userData.walletAddress}`)
    if (userData.privateKey !== undefined) setParts.push(sql`private_key = ${userData.privateKey}`)
    
    if (setParts.length === 0) {
      return await this.findByEmail(email)
    }

    // For simplicity, let's use individual fields
    const result = await sql`
      UPDATE users 
      SET 
        name = COALESCE(${userData.name || null}, name),
        image = COALESCE(${userData.image || null}, image),
        role = COALESCE(${userData.role || null}, role),
        wallet_address = COALESCE(${userData.walletAddress || null}, wallet_address),
        private_key = COALESCE(${userData.privateKey || null}, private_key),
        updated_at = CURRENT_TIMESTAMP
      WHERE email = ${email}
      RETURNING id, email, name, image, role, wallet_address, created_at
    `
    return result[0]
  },

  async upsert(userData: {
    id: string
    email: string
    name?: string
    image?: string
    role: string
    walletAddress: string
    privateKey: string
  }) {
    const result = await sql`
      INSERT INTO users (id, firebase_id, email, name, image, role, wallet_address, private_key)
      VALUES (${userData.id}, ${userData.id}, ${userData.email}, ${userData.name || ''}, ${userData.image || ''}, ${userData.role}, ${userData.walletAddress}, ${userData.privateKey})
      ON CONFLICT (email) DO UPDATE SET
        firebase_id = EXCLUDED.firebase_id,
        name = EXCLUDED.name,
        image = EXCLUDED.image,
        role = EXCLUDED.role,
        wallet_address = EXCLUDED.wallet_address,
        private_key = EXCLUDED.private_key,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, firebase_id, email, name, image, role, wallet_address, created_at
    `
    return result[0]
  }
}

// Campaign database functions
export const campaignDb = {
  async findAll() {
    const result = await sql`
      SELECT id, title, description, target, deadline, contract_address, creator_id, is_active, created_at,
             withdrawal_processed, withdrawal_tx_hash, withdrawal_processed_at
      FROM campaigns 
      WHERE is_active = true
      ORDER BY created_at DESC
    `
    return result
  },

  async findAllWithStats() {
    const result = await sql`
      SELECT * FROM campaign_stats
      WHERE is_active = true
    `
    return result
  },

  async findByCreator(creatorId: string) {
    const result = await sql`
      SELECT id, title, description, target, deadline, contract_address, creator_id, is_active, created_at,
             withdrawal_processed, withdrawal_tx_hash, withdrawal_processed_at
      FROM campaigns 
      WHERE creator_id = ${creatorId}
      ORDER BY created_at DESC
    `
    return result
  },

  async create(campaignData: {
    title: string
    description: string
    target: string
    deadline: Date
    contractAddress: string
    creatorId: string
  }) {
    const result = await sql`
      INSERT INTO campaigns (title, description, target, deadline, contract_address, creator_id)
      VALUES (${campaignData.title}, ${campaignData.description}, ${campaignData.target}, ${campaignData.deadline}, ${campaignData.contractAddress}, ${campaignData.creatorId})
      RETURNING id, title, description, target, deadline, contract_address, creator_id, is_active, created_at
    `
    return result[0]
  }
}

// Contribution database functions
export const contributionDb = {
  async findByUser(userId: string) {
    const result = await sql`
      SELECT c.*, camp.title as campaign_title
      FROM contributions c
      JOIN campaigns camp ON c.campaign_id = camp.id
      WHERE c.user_id = ${userId}
      ORDER BY c.created_at DESC
    `
    return result
  },

  async findByCampaign(campaignId: string) {
    const result = await sql`
      SELECT c.*, u.name as user_name
      FROM contributions c
      JOIN users u ON c.user_id = u.id
      WHERE c.campaign_id = ${campaignId}
      ORDER BY c.created_at DESC
    `
    return result
  },

  async create(contributionData: {
    amount: string
    campaignId: string
    userId: string
    txHash?: string
  }) {
    const result = await sql`
      INSERT INTO contributions (amount, campaign_id, user_id, tx_hash)
      VALUES (${contributionData.amount}, ${contributionData.campaignId}, ${contributionData.userId}, ${contributionData.txHash || null})
      RETURNING id, amount, campaign_id, user_id, tx_hash, created_at
    `
    return result[0]
  }
}