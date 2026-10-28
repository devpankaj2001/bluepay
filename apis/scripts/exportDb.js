const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dumpDir = path.join(__dirname, '..', 'dump');

async function exportLiveDb() {
    console.log('Connecting to Live MongoDB Atlas...');
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    if (!fs.existsSync(dumpDir)) {
        fs.mkdirSync(dumpDir, { recursive: true });
    }

    const collections = await conn.connection.db.listCollections().toArray();
    console.log(`Found ${collections.length} collections to export.`);

    for (const col of collections) {
        const name = col.name;
        if (name.startsWith('system.')) continue;
        console.log(`Exporting collection: ${name}...`);
        const docs = await conn.connection.db.collection(name).find({}).toArray();
        const filePath = path.join(dumpDir, `${name}.json`);
        fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf-8');
        console.log(`Saved ${docs.length} documents to ${name}.json`);
    }

    console.log('\n--- Export Complete! All data saved in: ' + dumpDir + ' ---');
    await mongoose.disconnect();
    process.exit(0);
}

exportLiveDb().catch(err => {
    console.error('Export failed:', err);
    process.exit(1);
});
