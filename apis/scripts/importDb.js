const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { BSON } = require('bson');

const dumpDir = path.join(__dirname, '..', 'dump');
const LOCAL_MONGO_URI = process.env.LOCAL_MONGO_URI || 'mongodb://127.0.0.1:27017/bluePay';

async function importLocalDb() {
    console.log(`Connecting to Local MongoDB: ${LOCAL_MONGO_URI}...`);
    const conn = await mongoose.connect(LOCAL_MONGO_URI);
    console.log('Connected to Local MongoDB.');

    if (!fs.existsSync(dumpDir)) {
        throw new Error(`Dump directory not found: ${dumpDir}`);
    }

    const files = fs.readdirSync(dumpDir).filter(f => f.endsWith('.json'));
    console.log(`Found ${files.length} collections to import.`);

    for (const file of files) {
        const colName = path.basename(file, '.json');
        const filePath = path.join(dumpDir, file);
        const raw = fs.readFileSync(filePath, 'utf-8');
        const docs = JSON.parse(raw);

        const col = conn.connection.db.collection(colName);
        await col.deleteMany({}); // clean before importing

        if (docs.length > 0) {
            // Restore Mongo ObjectIds and Dates if serialized
            const restoredDocs = docs.map(doc => {
                if (doc._id && typeof doc._id === 'string' && doc._id.length === 24) {
                    try { doc._id = new mongoose.Types.ObjectId(doc._id); } catch (e) {}
                }
                return doc;
            });
            await col.insertMany(restoredDocs);
            console.log(`Imported ${docs.length} documents into '${colName}'`);
        } else {
            console.log(`Skipped '${colName}' (0 documents)`);
        }
    }

    console.log('\n--- Import Complete! Local database is ready. ---');
    await mongoose.disconnect();
    process.exit(0);
}

importLocalDb().catch(err => {
    console.error('Import failed:', err.message);
    process.exit(1);
});
